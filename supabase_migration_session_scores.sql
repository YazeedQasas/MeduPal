-- Migration: add per-skill session scoring
-- Creates `session_scores` to store detailed rubric scores per session.

-- 1) Table
create table if not exists session_scores (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references sessions(id) on delete cascade,
  skill_type text not null,
  score integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2) RLS
alter table session_scores enable row level security;

-- Allow public/anonymous reads are handled elsewhere in the app.
-- For now: enable read access for everyone (matches existing repo pattern).
create policy "Enable read access for all tables"
  on session_scores
  for select
  using (true);

-- Allow authenticated users to insert scores only for sessions they own
-- (as either the student or the examiner).
create policy "Enable insert for own sessions"
  on session_scores
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from sessions s
      where s.id = session_scores.session_id
        and (s.student_id = auth.uid() or s.examiner_id = auth.uid())
    )
  );

-- Optional: allow users to update/delete their own inserted rows.
create policy "Enable update for own sessions"
  on session_scores
  for update
  to authenticated
  using (
    exists (
      select 1
      from sessions s
      where s.id = session_scores.session_id
        and (s.student_id = auth.uid() or s.examiner_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from sessions s
      where s.id = session_scores.session_id
        and (s.student_id = auth.uid() or s.examiner_id = auth.uid())
    )
  );

create policy "Enable delete for own sessions"
  on session_scores
  for delete
  to authenticated
  using (
    exists (
      select 1
      from sessions s
      where s.id = session_scores.session_id
        and (s.student_id = auth.uid() or s.examiner_id = auth.uid())
    )
  );

