-- History-taking OSCE evaluations (practice + exam with instructor review)
-- Run in Supabase SQL editor if the table is not created yet.

create table if not exists history_evaluations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  evaluation_type text not null default 'history_taking'
    check (evaluation_type in ('history_taking', 'physical_examination')),
  case_id uuid references cases(id),
  checklist_key text,
  items_covered int not null default 0,
  total_items int not null default 0,
  ai_percent int not null default 0,
  sections jsonb not null default '[]',
  structure_followed boolean,
  structure_notes text,
  feedback text,
  strengths jsonb default '[]',
  areas_for_improvement jsonb default '[]',
  instructor_percent int,
  instructor_sections jsonb,
  instructor_notes text,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  final_percent int not null default 0,
  review_status text not null default 'pending_instructor'
    check (review_status in ('auto', 'pending_instructor', 'saved', 'released')),
  released_to_student boolean not null default false,
  released_at timestamptz,
  scored_at timestamptz not null default now(),
  unique (session_id, evaluation_type)
);

create index if not exists history_evaluations_session_id_idx
  on history_evaluations (session_id);

alter table history_evaluations enable row level security;

-- Students: read own when practice OR exam released; insert/update own sessions
create policy if not exists "history_eval_student_select"
  on history_evaluations for select to authenticated
  using (
    exists (
      select 1 from sessions s
      where s.id = history_evaluations.session_id
        and s.student_id = auth.uid()
        and (
          coalesce(s.session_type, 'practice') <> 'exam'
          or history_evaluations.released_to_student = true
        )
    )
  );

create policy if not exists "history_eval_student_write"
  on history_evaluations for insert to authenticated
  with check (
    exists (
      select 1 from sessions s
      where s.id = history_evaluations.session_id and s.student_id = auth.uid()
    )
  );

create policy if not exists "history_eval_student_update"
  on history_evaluations for update to authenticated
  using (
    exists (
      select 1 from sessions s
      where s.id = history_evaluations.session_id and s.student_id = auth.uid()
    )
  );

-- Instructors: read/update exam sessions they examine
create policy if not exists "history_eval_instructor_select"
  on history_evaluations for select to authenticated
  using (
    exists (
      select 1 from sessions s
      join profiles p on p.id = auth.uid()
      where s.id = history_evaluations.session_id
        and (
          s.examiner_id = auth.uid()
          or p.role = 'admin'
        )
    )
  );

create policy if not exists "history_eval_instructor_update"
  on history_evaluations for update to authenticated
  using (
    exists (
      select 1 from sessions s
      join profiles p on p.id = auth.uid()
      where s.id = history_evaluations.session_id
        and (
          s.examiner_id = auth.uid()
          or p.role = 'admin'
        )
    )
  );
