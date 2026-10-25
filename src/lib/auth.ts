// Authentication helpers for admin route protection

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { User } from './types';

/**
 * Authenticate an admin user from the request.
 * Expects a Supabase access token in the Authorization header.
 * Returns the user record if authenticated and has admin/super_admin role.
 */
export async function authenticateAdmin(request: NextRequest): Promise<User | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  // Create a client authenticated with the user's token
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  // Verify the token and get the auth user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  // Fetch the user record from our users table using service role
  const serviceClient = createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: user, error: userError } = await serviceClient
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (userError || !user) {
    return null;
  }

  // Check admin role
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    return null;
  }

  return user as User;
}
