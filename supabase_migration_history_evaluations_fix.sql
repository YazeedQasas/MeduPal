-- Fix history_evaluations RLS + grants (run in Supabase SQL editor)

grant usage on schema public to authenticated;
grant select, insert, update, delete on history_evaluations to authenticated;

alter table history_evaluations enable row level security;

drop policy if exists "history_eval_student_select" on history_evaluations;
drop policy if exists "history_eval_student_write" on history_evaluations;
drop policy if exists "history_eval_student_update" on history_evaluations;
drop policy if exists "history_eval_instructor_select" on history_evaluations;
drop policy if exists "history_eval_instructor_update" on history_evaluations;
drop policy if exists "history_eval_read" on history_evaluations;
drop policy if exists "history_eval_write" on history_evaluations;
drop policy if exists "history_eval_update" on history_evaluations;

create policy "history_eval_read"
  on history_evaluations for select to authenticated
  using (
    exists (
      select 1
      from sessions s
      inner join profiles p on p.id = auth.uid()
      where s.id = history_evaluations.session_id
        and (
          s.examiner_id = auth.uid()
          or p.role in ('admin', 'instructor')
          or (
            s.student_id = auth.uid()
            and (
              coalesce(s.session_type, 'practice') <> 'exam'
              or history_evaluations.released_to_student = true
            )
          )
        )
    )
  );

create policy "history_eval_write"
  on history_evaluations for insert to authenticated
  with check (
    exists (
      select 1 from sessions s
      where s.id = history_evaluations.session_id
        and (
          s.student_id = auth.uid()
          or s.examiner_id = auth.uid()
          or exists (
            select 1 from profiles p
            where p.id = auth.uid() and p.role in ('admin', 'instructor')
          )
        )
    )
  );

create policy "history_eval_update"
  on history_evaluations for update to authenticated
  using (
    exists (
      select 1 from sessions s
      where s.id = history_evaluations.session_id
        and (
          s.student_id = auth.uid()
          or s.examiner_id = auth.uid()
          or exists (
            select 1 from profiles p
            where p.id = auth.uid() and p.role in ('admin', 'instructor')
          )
        )
    )
  )
  with check (
    exists (
      select 1 from sessions s
      where s.id = history_evaluations.session_id
        and (
          s.student_id = auth.uid()
          or s.examiner_id = auth.uid()
          or exists (
            select 1 from profiles p
            where p.id = auth.uid() and p.role in ('admin', 'instructor')
          )
        )
    )
  );
