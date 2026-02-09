-- Enable RLS for Students - allow authenticated users full CRUD

-- 1. Drop old policies
drop policy if exists "Enable insert for authenticated users only" on students;
drop policy if exists "Enable delete for authenticated users only" on students;
drop policy if exists "Enable update for authenticated users only" on students;

-- 2. INSERT
create policy "Enable insert for authenticated users only" 
on students for insert 
to authenticated 
with check (true);

-- 3. DELETE
create policy "Enable delete for authenticated users only" 
on students for delete 
to authenticated 
using (true);

-- 4. UPDATE
create policy "Enable update for authenticated users only" 
on students for update 
to authenticated 
using (true)
with check (true);
