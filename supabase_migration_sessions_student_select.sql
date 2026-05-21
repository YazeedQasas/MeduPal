-- Students must be able to SELECT their own exam sessions (My Exam page).

-- Run in Supabase SQL editor if students see notifications but My Exam is empty.

-- This project uses sessions.session_type (not sessions.type).



alter table if exists sessions enable row level security;



drop policy if exists "Students read own sessions" on sessions;

create policy "Students read own sessions"

  on sessions for select

  to authenticated

  using (student_id = auth.uid());



drop policy if exists "Examiners read their sessions" on sessions;

create policy "Examiners read their sessions"

  on sessions for select

  to authenticated

  using (examiner_id = auth.uid());



-- Dev / small deployments: keep open read if you rely on it (safe to re-add)

drop policy if exists "Enable read access for all tables" on sessions;

create policy "Enable read access for all tables"

  on sessions for select

  using (true);



-- Tag instructor-assigned OSCE rows as exams (session_type column only)

update sessions

set session_type = 'exam'

where status = 'Scheduled'

  and examiner_id is not null

  and student_id is not null

  and (session_type is null or session_type <> 'exam')

  and start_time > now() - interval '60 days';


