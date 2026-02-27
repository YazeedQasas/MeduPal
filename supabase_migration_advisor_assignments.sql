-- Advisor assignments: one instructor (advisor) per student.
-- Run this in Supabase SQL Editor after your main schema.

-- Table: instructor_id advises student_id. One student can have at most one advisor.
create table if not exists advisor_assignments (
  id uuid default uuid_generate_v4() primary key,
  instructor_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(student_id)
);

-- Index for "my advisees" and "who advises this student" lookups
create index if not exists idx_advisor_assignments_instructor on advisor_assignments(instructor_id);
create index if not exists idx_advisor_assignments_student on advisor_assignments(student_id);

-- RLS
alter table advisor_assignments enable row level security;

-- Anyone authenticated can read (so instructors see who is advised by whom)
create policy "Authenticated can read advisor_assignments"
  on advisor_assignments for select using (auth.role() = 'authenticated');

-- Only the instructor who owns the row can delete (unadvise)
create policy "Instructor can delete own assignment"
  on advisor_assignments for delete using (auth.uid() = instructor_id);

-- Only faculty/instructor can insert; student must not already have an advisor (enforced by unique)
create policy "Faculty can insert advisor_assignments"
  on advisor_assignments for insert
  with check (
    auth.uid() = instructor_id
    and exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'faculty'))
  );
