-- Enable RLS policies for Authenticated Users to manage Cases

-- 1. Check if policies exist and drop them to avoid conflicts
drop policy if exists "Enable insert for authenticated users only" on cases;
drop policy if exists "Enable delete for authenticated users only" on cases;
drop policy if exists "Enable update for authenticated users only" on cases;

-- 2. Create INSERT policy
-- Allows any authenticated user (faculty/admin) to create a case
create policy "Enable insert for authenticated users only" 
on cases for insert 
to authenticated 
with check (true);

-- 3. Create DELETE policy
-- Allows any authenticated user to delete a case
create policy "Enable delete for authenticated users only" 
on cases for delete 
to authenticated 
using (true);

-- 4. Create UPDATE policy
-- Allows any authenticated user to check/update a case
create policy "Enable update for authenticated users only" 
on cases for update 
to authenticated 
using (true)
with check (true);
