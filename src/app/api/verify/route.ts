// Document Verification API
// POST /api/verify — Verify a file's integrity against the blockchain

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { hashBuffer } from '@/lib/hash';
import { logAuditAction } from '@/lib/audit';
import { ActionType } from '@/lib/types';
import type { ApiResponse, VerificationResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided for verification' } as ApiResponse,
        { status: 400 }
      );
    }

    // Compute SHA-256 hash of the uploaded file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileHash = await hashBuffer(buffer);

    const supabase = createServerClient();

    // Search for a matching document by hash
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*, users!uploaded_by(name, department)')
      .eq('file_hash', fileHash)
      .single();

    if (docError && docError.code !== 'PGRST116') {
      return NextResponse.json(
        { success: false, error: `Verification failed: ${docError.message}` } as ApiResponse,
        { status: 500 }
      );
    }

    // Search blockchain for the matching hash
    const { data: blocks } = await supabase
      .from('blockchain')
      .select('*')
      .contains('data', { file_hash: fileHash })
      .limit(1);

    const block = blocks?.[0] ?? null;

    let result: VerificationResult;

    if (document) {
      result = {
        verified: true,
        fileHash,
        document,
        block,
        message: 'Document verified successfully. This file matches a record on the CYFER blockchain.',
      };
    } else {
      result = {
        verified: false,
        fileHash,
        message: 'Document NOT found on the blockchain. This file may have been tampered with or is not registered in the system.',
      };
    }

    // Log verification action in the audit trail
    await logAuditAction({
      actionType: ActionType.VERIFY,
      description: result.verified
        ? `File "${file.name}" verified successfully (hash: ${fileHash.slice(0, 16)}...)`
        : `File "${file.name}" verification failed — no matching hash found`,
      documentId: document?.id,
      performedBy: 'public',
      metadata: {
        file_name: file.name,
        file_hash: fileHash,
        verified: result.verified,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
    } as ApiResponse<VerificationResult>);
  } catch (error) {
    console.error('POST /api/verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
}
