-- Physical examination scores use the SAME table as history-taking: history_evaluations
-- One row per session per skill: evaluation_type = 'history_taking' | 'physical_examination'
-- Run this in Supabase SQL editor if physical saves fail or the table predates evaluation_type.

-- 1) Add evaluation_type if an older history_evaluations table exists without it
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'history_evaluations'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'history_evaluations'
      and column_name = 'evaluation_type'
  ) then
    alter table history_evaluations
      add column evaluation_type text not null default 'history_taking';
  end if;
end $$;

-- 2) Ensure check constraint allows physical_examination
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'history_evaluations_evaluation_type_check'
  ) then
    alter table history_evaluations
      add constraint history_evaluations_evaluation_type_check
      check (evaluation_type in ('history_taking', 'physical_examination'));
  end if;
exception
  when duplicate_object then null;
end $$;

-- 3) Replace single-session unique with (session_id, evaluation_type)
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'history_evaluations_session_id_key'
  ) then
    alter table history_evaluations drop constraint history_evaluations_session_id_key;
  end if;
exception
  when undefined_object then null;
end $$;

create unique index if not exists history_evaluations_session_eval_type_key
  on history_evaluations (session_id, evaluation_type);

-- 4) session_scores upsert support (history + physical skill rows)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'session_scores_session_id_skill_type_key'
  ) then
    alter table session_scores
      add constraint session_scores_session_id_skill_type_key
      unique (session_id, skill_type);
  end if;
end $$;

-- 5) RLS (safe to re-run)
grant select, insert, update, delete on history_evaluations to authenticated;
