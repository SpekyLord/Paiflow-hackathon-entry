// Document Detail API
// GET /api/documents/[id] — Get single document with approval chain details

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { ApiResponse } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Fetch the document with uploader info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*, users!uploaded_by(name, department)')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' } as ApiResponse,
        { status: 404 }
      );
    }

    // Fetch approval chain for this document
    const { data: approvals } = await supabase
      .from('approvals')
      .select('*, users!admin_id(name, department, role)')
      .eq('document_id', id)
      .order('created_at', { ascending: true });

    // Fetch related audit trail entries
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('document_id', id)
      .order('created_at', { ascending: false });

    // Fetch the blockchain block for this document
    const { data: blocks } = await supabase
      .from('blockchain')
      .select('*')
      .contains('data', { document_id: id })
      .order('id', { ascending: false })
      .limit(1);

    return NextResponse.json({
      success: true,
      data: {
        document,
        approvals: approvals ?? [],
        transactions: transactions ?? [],
        block: blocks?.[0] ?? null,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('GET /api/documents/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
}
