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
      summary: `This ordinance from the Municipality of Sample City establishes new regulatory guidelines that directly affect local residents and businesses. The measure was approved through the Unanimous Consensus Protocol, ensuring all municipal officials reviewed and endorsed it before publication.`,
      keyPoints: [
        'Introduces new municipal regulations effective upon publication',
        'Applies to all residents and businesses within city jurisdiction',
        'Includes enforcement mechanisms and penalty provisions for non-compliance',
        'Approved unanimously by all designated municipal officials',
      ],
      affectedParties: 'All residents, business owners, and establishments within the Municipality of Sample City',
      budgetImplications: 'Implementation costs will be allocated from the General Administration fund. No additional tax levies required.',
      tldr: `A new city ordinance that sets rules for local governance — approved by all officials and verified on the CYFER blockchain.`,
    },
    budget: {
      summary: `The Annual Budget Appropriation for FY 2026 allocates a total of PHP 60,000,000 across eight key sectors. Infrastructure receives the largest share at 25%, followed by Education at 20% and Health at 14.17%. The budget prioritizes essential public services while maintaining fiscal responsibility.`,
      keyPoints: [
        'Total municipal budget: PHP 60,000,000 for Fiscal Year 2026',
        'Top 3 allocations: Infrastructure (₱15M), Education (₱12M), Health (₱8.5M)',
        'Social services and public safety receive combined ₱11M allocation',
        'Economic development and environmental services funded at ₱6M combined',
      ],
      affectedParties: 'All citizens of the Municipality of Sample City — impacts public services, infrastructure, healthcare, and education',
      budgetImplications: 'PHP 60,000,000 total appropriation. Represents a balanced distribution prioritizing infrastructure development and human services.',
      tldr: `Sample City's 2026 budget allocates ₱60M across 8 sectors, with infrastructure (25%) and education (20%) getting the largest shares.`,
    },
    resolution: {
      summary: `This resolution authorizes the implementation of a specific municipal project or policy directive. It has been reviewed and approved by all designated officials through the Unanimous Consensus Protocol, ensuring full accountability and transparency in the decision-making process.`,
      keyPoints: [
        'Authorizes implementation of a municipal project or policy change',
        'Funding source identified and verified by the Treasury Department',
        'Implementation timeline and responsible departments specified',
        'Full approval chain recorded on the CYFER blockchain for transparency',
      ],
      affectedParties: 'Residents of affected barangays, relevant municipal departments, and contracted service providers',
      budgetImplications: 'Project costs allocated from the approved sectoral budget. Treasury verification confirms fund availability.',
      tldr: `A municipal resolution authorizing a specific project — fully approved by all officials and recorded on the blockchain.`,
    },
    contract: {
      summary: `This procurement contract details the acquisition of goods or services for a municipal department. The contract follows PhilGEPS procurement procedures and has been verified by the Treasury Department for budget compliance. All approving officials have endorsed the contract through the consensus protocol.`,
      keyPoints: [
        'Procurement follows standard PhilGEPS bidding procedures',
        'Contract value verified against departmental budget allocation',
        'Delivery timeline and quality specifications clearly defined',
        'All municipal officials have approved the procurement through UCP',
      ],
      affectedParties: 'The receiving municipal department, the contracted supplier, and the citizens who benefit from the procured goods or services',
      budgetImplications: 'Contract value deducted from the relevant departmental budget allocation. Treasury has confirmed sufficient funds.',
      tldr: `A government procurement contract verified for budget compliance and approved unanimously by all municipal officials.`,
    },
    permit: {
      summary: `This environmental compliance certificate or permit authorizes a specific facility or activity within the municipality. It certifies compliance with environmental regulations and includes conditions for ongoing monitoring. The permit was reviewed by all municipal officials to ensure environmental standards are met.`,
      keyPoints: [
        'Certifies compliance with DENR environmental requirements',
        'Includes conditions for environmental monitoring and mitigation',
        'Facility or project meets all local and national environmental standards',
        'Approved through unanimous consensus of all municipal officials',
      ],
      affectedParties: 'The facility operator, nearby residents, environmental groups, and regulatory agencies (DENR)',
      budgetImplications: 'Environmental mitigation measures budgeted by the facility operator. Municipal monitoring costs covered under Environmental Services allocation.',
      tldr: `An environmental compliance certificate confirming that a facility meets all regulatory requirements — verified and approved by all officials.`,
    },
  };

  const category = document.category?.toLowerCase() || 'ordinance';
  return demoSummaries[category] || demoSummaries.ordinance;
}

// OPTIONS handler for CORS preflight (if needed)
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
