-- Migration: Add type column to sessions table for distinguishing practice vs exam
-- Run this in the Supabase SQL Editor before using Assign Exam feature

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS type text DEFAULT 'practice';
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_type_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_type_check CHECK (type IN ('practice', 'exam'));
