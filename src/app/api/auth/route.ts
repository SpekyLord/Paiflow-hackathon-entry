// Auth API — main route for getting current user session
// GET /api/auth — Get current authenticated user info

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' } as ApiResponse,
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        department: admin.department,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('GET /api/auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
}
