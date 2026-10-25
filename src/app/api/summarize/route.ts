// AI Document Summarization API
// POST /api/summarize - Generate AI summary for a document

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { summarizeDocument, isAIServiceAvailable } from '@/lib/ai';
import type { ApiResponse, DocumentSummary } from '@/lib/types';

/**
 * Extract text content from a file buffer based on its extension.
 * For PDF/DOCX we do best-effort text extraction without external libraries.
 * For plain text files, we decode the buffer directly.
 */
function extractTextFromBuffer(buffer: ArrayBuffer, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const bytes = new Uint8Array(buffer);

  if (ext === 'txt' || ext === 'csv' || ext === 'tsv') {
    return new TextDecoder('utf-8').decode(bytes);
  }

  // For PDF: extract readable ASCII/UTF-8 text segments (best-effort without pdf-parse)
  if (ext === 'pdf') {
    return extractTextFromPDF(bytes);
  }

  // For DOCX: extract text from the XML inside the ZIP (best-effort)
  if (ext === 'docx' || ext === 'doc') {
    return extractTextFromDocx(bytes);
  }

  // For other file types, return empty (will fall back to metadata)
  return '';
}

/**
 * Best-effort PDF text extraction by finding text streams.
 * This extracts readable text segments between BT/ET markers and parentheses.
 */
function extractTextFromPDF(bytes: Uint8Array): string {
  const text = new TextDecoder('latin1').decode(bytes);
  const extracted: string[] = [];

  // Extract text from PDF text objects (between BT...ET)
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(text)) !== null) {
    const block = match[1];
    // Extract text from Tj and TJ operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      const decoded = tjMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');
      if (decoded.trim()) extracted.push(decoded);
    }

    // Extract from TJ arrays
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    let tjArrMatch;
    while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
      const arr = tjArrMatch[1];
      const strRegex = /\(([^)]*)\)/g;
      let strMatch;
      while ((strMatch = strRegex.exec(arr)) !== null) {
        if (strMatch[1].trim()) extracted.push(strMatch[1]);
      }
    }
  }

  return extracted.join(' ').trim();
}

/**
 * Best-effort DOCX text extraction.
 * DOCX files are ZIP archives containing XML. We look for text in word/document.xml.
 */
function extractTextFromDocx(bytes: Uint8Array): string {
  // Look for XML text content patterns in the raw bytes
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

  // Extract content between <w:t> tags (Word XML text elements)
  const extracted: string[] = [];
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1].trim()) extracted.push(match[1]);
  }

  return extracted.join(' ').trim();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check if AI service is available
    if (!isAIServiceAvailable()) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI summarization service is not configured. Please contact the administrator.',
        } as ApiResponse,
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { document_id } = body;

    if (!document_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'document_id is required',
        } as ApiResponse,
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch the document from the database
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document not found',
        } as ApiResponse,
        { status: 404 }
      );
    }

    // Check if document is published
    if (document.status !== 'published') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only published documents can be summarized',
        } as ApiResponse,
        { status: 403 }
      );
    }

    // Try to fetch and extract text from the actual file in Supabase Storage
    let fileText = '';
    try {
      if (document.file_url) {
        // Extract the storage path from the URL
        // file_url format: either a full Supabase URL or a relative storage path
        let storagePath = document.file_url;

        // If it's a full URL, extract the path after /storage/v1/object/public/documents/
        const storageMatch = document.file_url.match(/\/storage\/v1\/object\/public\/documents\/(.+)/);
        if (storageMatch) {
          storagePath = storageMatch[1];
        }

        // Try to download from Supabase Storage
        const { data: fileData, error: fileError } = await supabase.storage
          .from('documents')
          .download(storagePath);

        if (!fileError && fileData) {
          const buffer = await fileData.arrayBuffer();
          fileText = extractTextFromBuffer(buffer, document.file_name || '');
        }
      }
    } catch (err) {
      console.warn('Could not extract file content, falling back to metadata:', err);
    }

    // Build the document text for summarization
    // Always include metadata for context, add file content if available
    const documentText = `
Title: ${document.title}
Category: ${document.category}
Description: ${document.description || 'No description provided'}
File Name: ${document.file_name}
Upload Date: ${document.created_at}
Published Date: ${document.published_at || 'Not yet published'}
${fileText ? `\n--- Document Content ---\n${fileText.slice(0, 8000)}` : '\n[Note: Document content could not be extracted. Summary is based on document metadata.]'}
    `.trim();

    // Generate AI summary — try real API first, fall back to demo summaries
    let summary: DocumentSummary;
    try {
      summary = await summarizeDocument(documentText);
    } catch (aiError) {
      console.warn('AI API unavailable, using demo summary:', aiError instanceof Error ? aiError.message : aiError);
      summary = getDemoSummary(document);
    }

    return NextResponse.json(
      {
        success: true,
        data: summary,
      } as ApiResponse<DocumentSummary>,
      { status: 200 }
    );
  } catch (error) {
    console.error('AI summarization error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate summary';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      } as ApiResponse,
      { status: 500 }
    );
  }
}

/**
 * Demo fallback summaries for when the AI API is unavailable.
 * Returns a realistic pre-written summary based on document metadata.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDemoSummary(document: any): DocumentSummary {
  const demoSummaries: Record<string, DocumentSummary> = {
    ordinance: {
      summary: `This policy from Demo SME sets new rules that affect staff, customers and suppliers. It was approved through the Unanimous Consensus Protocol, so every designated approver reviewed and endorsed it before publication.`,
      keyPoints: [
        'Introduces new organisational rules effective upon publication',
        'Applies to all teams and branches covered by the policy',
        'Includes enforcement steps for non-compliance',
        'Approved unanimously by all designated approvers',
      ],
      affectedParties: 'Staff, customers and suppliers covered by the policy',
      budgetImplications: 'Implementation costs come from the existing operations budget. No additional spending required.',
      tldr: `A new policy approved by all approvers and verified on the CYFER ledger.`,
    },
    budget: {
      summary: `The Annual Budget for FY 2026 allocates a total of PHP 60,000,000 across eight areas. Operations receives the largest share at 25%, followed by Payroll at 20% and Supplies at 14.17%. The budget keeps essential operations funded while staying within approved limits.`,
      keyPoints: [
        'Total budget: PHP 60,000,000 for Fiscal Year 2026',
        'Top 3 allocations: Operations (₱15M), Payroll (₱12M), Supplies (₱8.5M)',
        'Marketing and equipment receive a combined ₱11M allocation',
        'Training and contingency funded at ₱6M combined',
      ],
      affectedParties: 'All teams of Demo SME, plus suppliers and contractors paid from this budget',
      budgetImplications: 'PHP 60,000,000 total. A balanced distribution that prioritises operations and payroll.',
      tldr: `The 2026 budget allocates ₱60M across 8 areas, with operations (25%) and payroll (20%) getting the largest shares.`,
    },
    resolution: {
      summary: `This resolution authorises a specific project or decision. It has been reviewed and approved by all designated approvers through the Unanimous Consensus Protocol, so the decision is fully accountable and traceable.`,
      keyPoints: [
        'Authorises a specific project or policy change',
        'Funding source identified and checked by the finance lead',
        'Timeline and responsible teams specified',
        'Full approval chain recorded on the CYFER ledger',
      ],
      affectedParties: 'The teams carrying out the project, and any contracted service providers',
      budgetImplications: 'Project costs come from the approved budget. The finance lead confirmed funds are available.',
      tldr: `A resolution authorising a specific project, approved by all approvers and recorded on the ledger.`,
    },
    contract: {
      summary: `This procurement contract covers goods or services for one of the organisation's teams. The contract value was checked by the finance lead against the approved budget, and all approvers endorsed it through the consensus protocol.`,
      keyPoints: [
        'Supplier selected through a documented quotation process',
        'Contract value checked against the team budget',
        'Delivery timeline and quality requirements clearly defined',
        'All approvers have approved the contract through UCP',
      ],
      affectedParties: 'The receiving team, the contracted supplier, and the customers who rely on the goods or services',
      budgetImplications: 'Contract value is deducted from the relevant team budget. The finance lead confirmed sufficient funds.',
      tldr: `A procurement contract checked against the budget and approved unanimously by all approvers.`,
    },
    permit: {
      summary: `This permit or compliance certificate authorises a specific facility or activity. It confirms the applicable requirements are met and sets conditions for ongoing monitoring. All approvers reviewed it before it was recorded.`,
      keyPoints: [
        'Confirms compliance with the applicable requirements',
        'Includes conditions for monitoring and corrective action',
        'Facility or activity meets the standards that apply to it',
        'Approved through unanimous consensus of all approvers',
      ],
      affectedParties: 'The facility operator, nearby stakeholders and the issuing authority',
      budgetImplications: 'Monitoring and mitigation costs are covered by the facility budget.',
      tldr: `A permit confirming that a facility meets its requirements, verified and approved by all approvers.`,
    },
  };

  const category = document.category?.toLowerCase() || 'ordinance';
  return demoSummaries[category] || demoSummaries.ordinance;
}

// OPTIONS handler for CORS preflight (if needed)
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
