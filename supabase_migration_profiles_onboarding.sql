-- Migration: Add has_hardware, can_exam, onboarding_done to profiles
-- Run this in Supabase SQL editor if columns do not exist.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_hardware boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_exam boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_done boolean DEFAULT false;

-- Allow users to update their own profile (required for onboarding setup)
DROP POLICY IF EXISTS "Users can update their own profile." ON profiles;
CREATE POLICY "Users can update their own profile." ON profiles
  FOR UPDATE USING (auth.uid() = id);
