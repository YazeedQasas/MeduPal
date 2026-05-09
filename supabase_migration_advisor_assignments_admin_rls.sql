-- Allow admins to assign any student to any instructor (advisor_assignments).
-- Run in Supabase SQL Editor after supabase_migration_advisor_assignments.sql.
-- Existing policies remain: multiple policies for the same operation are combined with OR.

create policy "Admin can insert advisor_assignments for any instructor"
  on advisor_assignments for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admin can delete advisor_assignments"
  on advisor_assignments for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
