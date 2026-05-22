-- Let instructors read all sessions for students they advise (student profile scores).
-- Run in Supabase SQL editor after advisor_assignments exists.

drop policy if exists "Instructors read advisee sessions" on sessions;

create policy "Instructors read advisee sessions"
  on sessions for select
  to authenticated
  using (
    exists (
      select 1
      from advisor_assignments aa
      where aa.student_id = sessions.student_id
        and aa.instructor_id = auth.uid()
    )
  );
