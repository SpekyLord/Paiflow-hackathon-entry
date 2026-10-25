// Budget Data API
// GET /api/budget — Get budget data for dashboard (public)
// POST /api/budget — Add/update budget entries (admin only)

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { authenticateAdmin } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { Blockchain } from '@/lib/blockchain';
import { ActionType } from '@/lib/types';
import type { ApiResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const fiscalYear = searchParams.get('fiscal_year');
    const summary = searchParams.get('summary') === 'true';

    // Check if requester is admin (optional — public sees only published)
    const authHeader = request.headers.get('authorization');
    const isAdmin = !!authHeader;

    let query = supabase
      .from('budget_data')
      .select('*')
      .order('category', { ascending: true });

    // Public users only see published budget entries
    if (!isAdmin) {
      query = query.eq('status', 'published');
    }

    if (fiscalYear) {
      query = query.eq('fiscal_year', parseInt(fiscalYear, 10));
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch budget data: ${error.message}` } as ApiResponse,
        { status: 500 }
      );
    }

    // If summary requested, compute aggregates
    if (summary && data) {
      const totalBudget = data.reduce((sum, item) => sum + Number(item.allocated_amount), 0);
      const byCategory: Record<string, { category: string; amount: number; percentage: number }> = {};

      for (const item of data) {
        const key = item.category as string;
        if (!byCategory[key]) {
          byCategory[key] = { category: key, amount: 0, percentage: 0 };
        }
        byCategory[key].amount += Number(item.allocated_amount);
      }

      // Calculate percentages
      for (const cat of Object.values(byCategory)) {
        cat.percentage = totalBudget > 0 ? Math.round((cat.amount / totalBudget) * 10000) / 100 : 0;
      }

      return NextResponse.json({
        success: true,
        data: {
          totalBudget,
          categories: Object.values(byCategory),
          fiscalYear: fiscalYear ?? new Date().getFullYear(),
          entries: data,
        },
      } as ApiResponse);
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
    } as ApiResponse);
  } catch (error) {
    console.error('GET /api/budget error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Only admins can manage budget data.' } as ApiResponse,
        { status: 401 }
      );
    }

    const supabase = createServerClient();
    const body = await request.json();

    const { fiscal_year, category, allocated_amount, description } = body;

    // Validate required fields
    if (!fiscal_year || !category || allocated_amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: fiscal_year, category, allocated_amount' } as ApiResponse,
        { status: 400 }
      );
    }

    // Create new budget entry with pending_approval status (UCP)
    const { data: result, error: insertError } = await supabase
      .from('budget_data')
      .insert({
        fiscal_year,
        category,
        allocated_amount,
        description: description ?? '',
        uploaded_by: admin.id,
        status: 'pending_approval',
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: `Failed to create budget entry: ${insertError.message}` } as ApiResponse,
        { status: 500 }
      );
    }

    // Add block to blockchain recording the budget upload
    await Blockchain.addBlock({
      action: 'budget_upload',
      budget_id: result.id,
      category,
      fiscal_year,
      allocated_amount,
      uploaded_by: admin.id,
      uploaded_by_name: admin.name,
    });

    // Create approval requests for ALL other admins (UCP)
    const { data: otherAdmins, error: adminsError } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'super_admin'])
      .neq('id', admin.id);

    if (!adminsError && otherAdmins && otherAdmins.length > 0) {
      const approvalRecords = otherAdmins.map((a) => ({
        budget_id: result.id,
        admin_id: a.id,
        status: 'pending',
      }));

      await supabase.from('approvals').insert(approvalRecords);
    }

    // Log to audit trail
    await logAuditAction({
      actionType: ActionType.UPLOAD,
      description: `Budget entry for ${category} (FY ${fiscal_year}) submitted for approval by ${admin.name}`,
      performedBy: admin.id,
      metadata: { budget_id: result.id, fiscal_year, category, allocated_amount },
    });

    return NextResponse.json({
      success: true,
      data: result,
    } as ApiResponse, { status: 201 });
  } catch (error) {
    console.error('POST /api/budget error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
}
