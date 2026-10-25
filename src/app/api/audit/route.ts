// Audit Trail API
// GET /api/audit — Get all transactions with pagination and filters

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { ApiResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const actionType = searchParams.get('action_type');
    const documentId = searchParams.get('document_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' });

    if (actionType) {
      query = query.eq('action_type', actionType);
    }

    if (documentId) {
      query = query.eq('document_id', documentId);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch audit trail: ${error.message}` } as ApiResponse,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        transactions: data ?? [],
        total: count ?? 0,
        page,
        limit,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('GET /api/audit error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
}
