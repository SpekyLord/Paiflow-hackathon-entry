// UCP Rejection API
// POST /api/consensus/[documentId]/reject — Reject a document or budget entry

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { Blockchain } from '@/lib/blockchain';
import { logAuditAction } from '@/lib/audit';
import { authenticateAdmin } from '@/lib/auth';
import { ActionType } from '@/lib/types';
import type { ApiResponse } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' } as ApiResponse,
        { status: 401 }
      );
    }

    const { documentId: entityId } = await params;
    const supabase = createServerClient();

    // Parse rejection reason
    let message = '';
    try {
      const body = await request.json();
      message = body.message ?? '';
    } catch {
      // No body is fine
    }

    // Find the approval record — try document_id first, then budget_id
    let approval = null;
    let entityType: 'document' | 'budget' = 'document';

    const { data: docApproval } = await supabase
      .from('approvals')
      .select('*')
      .eq('document_id', entityId)
      .eq('admin_id', admin.id)
      .maybeSingle();

    if (docApproval) {
      approval = docApproval;
      entityType = 'document';
    } else {
      const { data: budgetApproval } = await supabase
        .from('approvals')
        .select('*')
        .eq('budget_id', entityId)
        .eq('admin_id', admin.id)
        .maybeSingle();

      if (budgetApproval) {
        approval = budgetApproval;
        entityType = 'budget';
      }
    }

    if (!approval) {
      return NextResponse.json(
        { success: false, error: 'No approval request found for this admin' } as ApiResponse,
        { status: 404 }
      );
    }

    if (approval.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `You have already ${approval.status} this item` } as ApiResponse,
        { status: 400 }
      );
    }

    // Update the approval record
    const { error: updateError } = await supabase
      .from('approvals')
      .update({ status: 'rejected', message, responded_at: new Date().toISOString() })
      .eq('id', approval.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `Failed to update approval: ${updateError.message}` } as ApiResponse,
        { status: 500 }
      );
    }

    // === DOCUMENT REJECTION ===
    if (entityType === 'document') {
      const { data: document } = await supabase
        .from('documents')
        .select('*')
        .eq('id', entityId)
        .single();

      if (!document) {
        return NextResponse.json(
          { success: false, error: 'Document not found' } as ApiResponse,
          { status: 404 }
        );
      }

      await supabase
        .from('documents')
        .update({ status: 'rejected' })
        .eq('id', entityId);

      await logAuditAction({
        actionType: ActionType.REJECT,
        description: `${admin.name} rejected document "${document.title}"${message ? `: ${message}` : ''}`,
        documentId: entityId,
        performedBy: admin.id,
        metadata: { message },
      });

      await Blockchain.addBlock({
        action: 'document_rejected',
        document_id: entityId,
        rejected_by: admin.id,
        rejected_by_name: admin.name,
        reason: message,
      });

      return NextResponse.json({
        success: true,
        data: { rejected: true, message: 'Document has been rejected.' },
      } as ApiResponse);
    }

    // === BUDGET REJECTION ===
    const { data: budget } = await supabase
      .from('budget_data')
      .select('*')
      .eq('id', entityId)
      .single();

    if (!budget) {
      return NextResponse.json(
        { success: false, error: 'Budget entry not found' } as ApiResponse,
        { status: 404 }
      );
    }

    await supabase
      .from('budget_data')
      .update({ status: 'rejected' })
      .eq('id', entityId);

    await logAuditAction({
      actionType: ActionType.REJECT,
      description: `${admin.name} rejected budget entry "${budget.category}" (FY ${budget.fiscal_year})${message ? `: ${message}` : ''}`,
      performedBy: admin.id,
      metadata: { budget_id: entityId, message },
    });

    await Blockchain.addBlock({
      action: 'budget_rejected',
      budget_id: entityId,
      category: budget.category,
      fiscal_year: budget.fiscal_year,
      rejected_by: admin.id,
      rejected_by_name: admin.name,
      reason: message,
    });

    return NextResponse.json({
      success: true,
      data: { rejected: true, message: 'Budget entry has been rejected.' },
    } as ApiResponse);
  } catch (error) {
    console.error('POST /api/consensus/[documentId]/reject error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
}
