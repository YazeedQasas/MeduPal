-- Migration: Drop students and instructors tables, point sessions.student_id to profiles
-- Run this in the Supabase SQL Editor on an existing project that still has students/instructors.
-- WARNING: Existing session rows will have their student_id set to NULL (old student links are lost).

-- 1. Clear existing session->student links (old IDs point to students table, not profiles)
UPDATE sessions SET student_id = NULL WHERE student_id IS NOT NULL;

-- 2. Drop the foreign key from sessions.student_id to students(id)
ALTER TABLE sessions
  DROP CONSTRAINT IF EXISTS sessions_student_id_fkey;

-- 3. Add new foreign key: sessions.student_id -> profiles(id)
ALTER TABLE sessions
  ADD CONSTRAINT sessions_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES profiles(id);

-- 4. Drop students table (CASCADE removes dependent objects e.g. RLS policies)
DROP TABLE IF EXISTS students CASCADE;

-- 5. Drop instructors table if it exists
DROP TABLE IF EXISTS instructors CASCADE;
