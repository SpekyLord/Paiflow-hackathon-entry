// UCP Approval API
// POST /api/consensus/[documentId]/approve — Approve a document or budget entry

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

    // Parse optional message
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

    // === DOCUMENT APPROVAL ===
    if (entityType === 'document') {
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', entityId)
        .single();

      if (docError || !document) {
        return NextResponse.json(
          { success: false, error: 'Document not found' } as ApiResponse,
          { status: 404 }
        );
      }

      if (document.status !== 'pending_approval') {
        return NextResponse.json(
          { success: false, error: `Document is already ${document.status}` } as ApiResponse,
          { status: 400 }
        );
      }

      // Update the approval record
      const { error: updateError } = await supabase
        .from('approvals')
        .update({ status: 'approved', message, responded_at: new Date().toISOString() })
        .eq('id', approval.id);

      if (updateError) {
        return NextResponse.json(
          { success: false, error: `Failed to update approval: ${updateError.message}` } as ApiResponse,
          { status: 500 }
        );
      }

      await logAuditAction({
        actionType: ActionType.APPROVE,
        description: `${admin.name} approved document "${document.title}"`,
        documentId: entityId,
        performedBy: admin.id,
        metadata: { message },
      });

      await Blockchain.addBlock({
        action: 'document_approved',
        document_id: entityId,
        approved_by: admin.id,
        approved_by_name: admin.name,
        message,
      });

      // Check unanimous consensus
      const { data: allApprovals } = await supabase
        .from('approvals')
        .select('status')
        .eq('document_id', entityId);

      const allApproved = allApprovals?.every((a) => a.status === 'approved');

      if (allApproved && allApprovals && allApprovals.length > 0) {
        const { error: publishError } = await supabase
          .from('documents')
          .update({ status: 'published', published_at: new Date().toISOString() })
          .eq('id', entityId);

        if (!publishError) {
          await logAuditAction({
            actionType: ActionType.PUBLISH,
            description: `Document "${document.title}" published after unanimous approval`,
            documentId: entityId,
            performedBy: 'system',
            metadata: { total_approvals: allApprovals.length },
          });

          await Blockchain.addBlock({
            action: 'document_published',
            document_id: entityId,
            file_hash: document.file_hash,
            title: document.title,
            total_approvals: allApprovals.length,
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          approved: true,
          documentPublished: allApproved,
          message: allApproved
            ? 'Document approved and published (unanimous consensus reached)'
            : 'Document approved. Waiting for other officials.',
        },
      } as ApiResponse);
    }

    // === BUDGET APPROVAL ===
    const { data: budget, error: budgetError } = await supabase
      .from('budget_data')
      .select('*')
      .eq('id', entityId)
      .single();

    if (budgetError || !budget) {
      return NextResponse.json(
        { success: false, error: 'Budget entry not found' } as ApiResponse,
        { status: 404 }
      );
    }

    if (budget.status !== 'pending_approval') {
      return NextResponse.json(
        { success: false, error: `Budget entry is already ${budget.status}` } as ApiResponse,
        { status: 400 }
      );
    }

    // Update the approval record
    const { error: updateError } = await supabase
      .from('approvals')
      .update({ status: 'approved', message, responded_at: new Date().toISOString() })
      .eq('id', approval.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `Failed to update approval: ${updateError.message}` } as ApiResponse,
        { status: 500 }
      );
    }

    await logAuditAction({
      actionType: ActionType.APPROVE,
      description: `${admin.name} approved budget entry "${budget.category}" (FY ${budget.fiscal_year})`,
      performedBy: admin.id,
      metadata: { budget_id: entityId, message },
    });

    await Blockchain.addBlock({
      action: 'budget_approved',
      budget_id: entityId,
      category: budget.category,
      fiscal_year: budget.fiscal_year,
      approved_by: admin.id,
      approved_by_name: admin.name,
      message,
    });

    // Check unanimous consensus
    const { data: allApprovals } = await supabase
      .from('approvals')
      .select('status')
      .eq('budget_id', entityId);

    const allApproved = allApprovals?.every((a) => a.status === 'approved');

    if (allApproved && allApprovals && allApprovals.length > 0) {
      const { error: publishError } = await supabase
        .from('budget_data')
        .update({ status: 'published' })
        .eq('id', entityId);

      if (!publishError) {
        await logAuditAction({
          actionType: ActionType.PUBLISH,
          description: `Budget entry "${budget.category}" (FY ${budget.fiscal_year}) published after unanimous approval`,
          performedBy: 'system',
          metadata: { budget_id: entityId, total_approvals: allApprovals.length },
        });

        await Blockchain.addBlock({
          action: 'budget_published',
          budget_id: entityId,
          category: budget.category,
          fiscal_year: budget.fiscal_year,
          allocated_amount: budget.allocated_amount,
          total_approvals: allApprovals.length,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        approved: true,
        budgetPublished: allApproved,
        message: allApproved
          ? 'Budget entry approved and published (unanimous consensus reached)'
          : 'Budget entry approved. Waiting for other officials.',
      },
    } as ApiResponse);
  } catch (error) {
    console.error('POST /api/consensus/[documentId]/approve error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
}
