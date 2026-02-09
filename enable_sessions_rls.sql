-- Enable RLS for Sessions - allow authenticated users full CRUD
-- This is needed so you can create new sessions and delete existing ones.

-- 1. Drop old policies to be clean
drop policy if exists "Enable insert for authenticated users only" on sessions;
drop policy if exists "Enable delete for authenticated users only" on sessions;
drop policy if exists "Enable update for authenticated users only" on sessions;

-- 2. INSERT
create policy "Enable insert for authenticated users only" 
on sessions for insert 
to authenticated 
with check (true);

-- 3. DELETE
create policy "Enable delete for authenticated users only" 
on sessions for delete 
to authenticated 
using (true);

-- 4. UPDATE
create policy "Enable update for authenticated users only" 
on sessions for update 
to authenticated 
using (true)
with check (true);
