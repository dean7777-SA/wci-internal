-- Fix: infinite recursion in profiles RLS policy
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- The problem: the projects INSERT policy checks profiles for role,
-- and the profiles SELECT policy also checks profiles for role → infinite loop.
--
-- The fix: a SECURITY DEFINER function bypasses RLS when reading profiles,
-- breaking the cycle.

-- 1. Create a helper that reads the current user's role WITHOUT triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- 2. Drop and recreate the profiles policies using the safe function
--    (policy names below match the most common pattern — check yours in
--     Dashboard → Authentication → Policies → profiles)

-- Show existing profiles policies so you can match names:
-- SELECT policyname FROM pg_policies WHERE tablename = 'profiles';

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

-- Simple safe policy: any authenticated user can read any profile row
-- (no sub-select on profiles, so no recursion)
CREATE POLICY "profiles_read_authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Ensure projects policies also use get_my_role() if they exist
--    Drop known recursive variants first
DROP POLICY IF EXISTS "projects_insert_sales_admin" ON public.projects;
DROP POLICY IF EXISTS "Enable insert for sales and admin" ON public.projects;

CREATE POLICY "projects_insert_authenticated"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'sales'));

-- If you want ALL operations allowed for admin/sales (adjust as needed):
DROP POLICY IF EXISTS "projects_all_authenticated" ON public.projects;
-- CREATE POLICY "projects_all_authenticated"
--   ON public.projects
--   FOR ALL
--   TO authenticated
--   USING (get_my_role() IN ('admin', 'sales'))
--   WITH CHECK (get_my_role() IN ('admin', 'sales'));
