-- Allow authenticated users to create alerts rows (used for exam assignment notifications)
-- Run this in Supabase SQL editor.

alter table if exists alerts enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'alerts'
      and policyname = 'Enable insert for authenticated users on alerts'
  ) then
    create policy "Enable insert for authenticated users on alerts"
      on alerts
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

