// Anthropic Claude API client for document summarization

import Anthropic from '@anthropic-ai/sdk';
import type { DocumentSummary } from './types';

/**
 * Initialize Anthropic client (server-side only)
 */
function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  return new Anthropic({
    apiKey,
  });
}

/**
 * Summarize a government document using Claude AI
 * @param documentText - Full text content of the document
 * @returns Structured summary with key points, affected parties, budget implications, and TLDR
 */
export async function summarizeDocument(documentText: string): Promise<DocumentSummary> {
  const client = getAnthropicClient();

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: 'You are a government document analyst. Your job is to summarize complex government documents (ordinances, budgets, resolutions, contracts, permits) in plain language that non-technical citizens can easily understand. Be concise, accurate, and focus on what matters to the public.',
      messages: [
        {
          role: 'user',
          content: `Please summarize the following government document. Provide your response in this exact JSON format:

{
  "summary": "2-3 sentence plain-language summary of the document",
  "keyPoints": ["bullet point 1", "bullet point 2", "bullet point 3"],
  "affectedParties": "Who this affects (citizens, businesses, specific groups, etc.)",
  "budgetImplications": "Financial impact or budget allocations (if any), otherwise 'None'",
  "tldr": "One sentence TLDR"
}

Document to summarize:

${documentText}`,
        },
      ],
    });

    // Extract the text from Claude's response
    const contentBlock = response.content[0];
    if (contentBlock.type !== 'text') {
      throw new Error('Unexpected response format from Claude API');
    }

    // Parse the JSON response
    const summaryText = contentBlock.text.trim();

    // Remove markdown code blocks if present
    const cleanedText = summaryText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

    const summary: DocumentSummary = JSON.parse(cleanedText);

    // Validate the response structure
    if (!summary.summary || !summary.keyPoints || !summary.tldr) {
      throw new Error('Invalid summary format from Claude API');
    }

    return summary;
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      // Handle API-specific errors
      if (error.status === 429) {
        throw new Error('AI service rate limit exceeded. Please try again later.');
      } else if (error.status === 401) {
        throw new Error('AI service authentication failed. Check API key configuration.');
      } else {
        throw new Error(`AI service error: ${error.message}`);
      }
    } else if (error instanceof SyntaxError) {
      throw new Error('Failed to parse AI response. The document may be too complex to summarize.');
    } else if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Unknown error occurred during document summarization');
    }
  }
}

/**
 * Check if the AI service is available and configured
 * @returns true if ANTHROPIC_API_KEY is set, false otherwise
 */
export function isAIServiceAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
