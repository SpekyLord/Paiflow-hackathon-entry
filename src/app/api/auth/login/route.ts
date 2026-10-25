// Auth Login API
// POST /api/auth/login — Admin login via Supabase Auth

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase';
import type { ApiResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' } as ApiResponse,
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' } as ApiResponse,
        { status: 500 }
      );
    }

    // Create a Supabase client for auth
    const authClient = createClient(supabaseUrl, supabaseAnonKey);

    // Attempt sign in
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' } as ApiResponse,
        { status: 401 }
      );
    }

    // Verify the user exists in our users table and has admin role
    const serverClient = createServerClient();
    const { data: user, error: userError } = await serverClient
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found in system. Contact administrator.' } as ApiResponse,
        { status: 403 }
      );
    }

    if (user.role !== 'super_admin' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Admin access required.' } as ApiResponse,
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
        },
        session: {
          access_token: authData.session?.access_token,
          refresh_token: authData.session?.refresh_token,
          expires_at: authData.session?.expires_at,
        },
      },
    } as ApiResponse);
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
}
