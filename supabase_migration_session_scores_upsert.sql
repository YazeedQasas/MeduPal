-- Migration: add unique constraint on session_scores for upsert support
-- Enables ON CONFLICT (session_id, skill_type) for avoiding duplicate skill scores per session.

-- Add unique constraint (only if not exists)
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
