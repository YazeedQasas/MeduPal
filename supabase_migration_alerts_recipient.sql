-- Optional: targeted student notifications (exam assignment)
-- Run in Supabase SQL editor. Alerts still work via source_id = 'student:<uuid>' without this.

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS alerts_recipient_id_idx ON alerts (recipient_id);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'alerts'
      and policyname = 'Enable insert for authenticated users on alerts'
  ) then
    create policy "Enable insert for authenticated users on alerts"
      on alerts for insert to authenticated with check (true);
  end if;
end $$;
