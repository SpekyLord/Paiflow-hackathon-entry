// UCP Consensus API
// GET /api/consensus — Get pending approvals for the current admin

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { authenticateAdmin } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' } as ApiResponse,
        { status: 401 }
      );
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? 'pending';

    // Fetch approvals for the current admin with document details
    let query = supabase
      .from('approvals')
      .select('*, documents(*), budget_data(*), users!admin_id(name, department)')
      .eq('admin_id', admin.id);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch approvals: ${error.message}` } as ApiResponse,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
    } as ApiResponse);
  } catch (error) {
    console.error('GET /api/consensus error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
}
