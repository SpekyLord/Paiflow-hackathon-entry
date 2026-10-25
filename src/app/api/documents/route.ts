// Document CRUD API
// GET /api/documents — List published documents (public) or all documents (admin)
// POST /api/documents — Upload a new document (admin only)

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { hashBuffer } from '@/lib/hash';
import { Blockchain } from '@/lib/blockchain';
import { logAuditAction } from '@/lib/audit';
import { authenticateAdmin } from '@/lib/auth';
import { ActionType } from '@/lib/types';
import type { ApiResponse } from '@/lib/types';
import { MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from '@/utils/constants';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);
    const offset = (page - 1) * limit;

    // Check if the requester is an admin (optional — admins see all statuses)
    const admin = await authenticateAdmin(request);

    let query = supabase
      .from('documents')
      .select('*, users!uploaded_by(name, department)', { count: 'exact' });

    // Public users only see published documents
    if (!admin) {
      query = query.eq('status', 'published');
    } else if (status) {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch documents: ${error.message}` } as ApiResponse,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        documents: data,
        total: count ?? 0,
        page,
        limit,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('GET /api/documents error:', error);
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
        { success: false, error: 'Authentication required. Only admins can upload documents.' } as ApiResponse,
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const category = formData.get('category') as string | null;
    const description = formData.get('description') as string | null;

    // Validate required fields
    if (!file || !title || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: file, title, category' } as ApiResponse,
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)}MB` } as ApiResponse,
        { status: 400 }
      );
    }

    // Validate file type
    if (!(ACCEPTED_FILE_TYPES as readonly string[]).includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'File type not accepted' } as ApiResponse,
        { status: 400 }
      );
    }

    // Read file buffer and compute SHA-256 hash
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileHash = await hashBuffer(buffer);

    // Extract file extension
    const fileExt = file.name.split('.').pop() ?? '';

    // Upload file to Supabase Storage
    const storagePath = `documents/${Date.now()}_${file.name}`;
    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      return NextResponse.json(
        { success: false, error: `Failed to upload file: ${storageError.message}` } as ApiResponse,
        { status: 500 }
      );
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath);

    // Create document record with status pending_approval
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        title,
        category,
        description: description ?? '',
        file_name: file.name,
        file_ext: fileExt,
        file_size: file.size,
        file_url: urlData.publicUrl,
        file_hash: fileHash,
        uploaded_by: admin.id,
        status: 'pending_approval',
      })
      .select()
      .single();

    if (docError) {
      return NextResponse.json(
        { success: false, error: `Failed to create document record: ${docError.message}` } as ApiResponse,
        { status: 500 }
      );
    }

    // Add block to blockchain recording the document upload
    await Blockchain.addBlock({
      action: 'document_upload',
      document_id: document.id,
      file_hash: fileHash,
      title,
      uploaded_by: admin.id,
      uploaded_by_name: admin.name,
    });

    // Create approval requests for ALL other admins
    const { data: otherAdmins, error: adminsError } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'super_admin'])
      .neq('id', admin.id);

    if (!adminsError && otherAdmins && otherAdmins.length > 0) {
      const approvalRecords = otherAdmins.map((a) => ({
        document_id: document.id,
        admin_id: a.id,
        status: 'pending',
      }));

      await supabase.from('approvals').insert(approvalRecords);
    }

    // Log to audit trail
    await logAuditAction({
      actionType: ActionType.UPLOAD,
      description: `Document "${title}" uploaded by ${admin.name}`,
      documentId: document.id,
      performedBy: admin.id,
      metadata: { file_hash: fileHash, file_name: file.name, category },
    });

    return NextResponse.json({
      success: true,
      data: document,
    } as ApiResponse, { status: 201 });
  } catch (error) {
    console.error('POST /api/documents error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
}
