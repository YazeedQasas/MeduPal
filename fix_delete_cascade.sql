-- Allow deleting Cases even if they have related Sessions
-- This script changes the Foreign Key on the `sessions` table to "CASCADE" delete.

BEGIN;

-- 1. Drop the existing constraint (Postgres usually names it sessions_case_id_fkey)
ALTER TABLE sessions
DROP CONSTRAINT IF EXISTS sessions_case_id_fkey;

-- 2. Re-add the constraint with ON DELETE CASCADE
ALTER TABLE sessions
ADD CONSTRAINT sessions_case_id_fkey
FOREIGN KEY (case_id)
REFERENCES cases(id)
ON DELETE CASCADE;

COMMIT;
