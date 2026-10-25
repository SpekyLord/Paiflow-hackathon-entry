-- CYFER: Security Fixes
-- Version: 002
-- Description: Fixes security warnings from Supabase Advisor
-- Run this in Supabase SQL Editor AFTER 001_rls_policies.sql

-- =====================================================
-- Fix 1: Super admins policy uses user_metadata (insecure)
-- user_metadata is editable by users — never use in security contexts
-- Replace with a check against public.users table instead
-- =====================================================

DROP POLICY IF EXISTS "Super admins can manage users" ON users;

CREATE POLICY "Super admins can manage users"
ON users FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);

-- =====================================================
-- Fix 2: is_admin() function has mutable search_path
-- Add SET search_path = public to lock it down
-- =====================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- Fix 3: Leaked Password Protection
-- This cannot be fixed via SQL — enable it manually:
-- Authentication → Sign In / Providers → scroll down →
-- enable "Leaked Password Protection (HaveIBeenPwned)"
-- =====================================================
