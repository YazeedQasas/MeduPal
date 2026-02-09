-- Enable RLS for Stations - allow authenticated users full CRUD

-- 1. Drop old policies
drop policy if exists "Enable insert for authenticated users only" on stations;
drop policy if exists "Enable delete for authenticated users only" on stations;
drop policy if exists "Enable update for authenticated users only" on stations;

-- 2. INSERT
create policy "Enable insert for authenticated users only" 
on stations for insert 
to authenticated 
with check (true);

-- 3. DELETE
create policy "Enable delete for authenticated users only" 
on stations for delete 
to authenticated 
using (true);

-- 4. UPDATE
create policy "Enable update for authenticated users only" 
on stations for update 
to authenticated 
using (true)
with check (true);
