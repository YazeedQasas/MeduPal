-- Migration: Use 'instructor' instead of 'faculty' for instructor role
-- Run this in the Supabase SQL Editor

-- 1. Update existing 'faculty' rows to 'instructor'
UPDATE profiles SET role = 'instructor' WHERE role = 'faculty';

-- 2. Drop the old check constraint (name may vary; try common names)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 3. Add new check constraint allowing: admin, instructor, student, technician
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'instructor', 'student', 'technician'));
