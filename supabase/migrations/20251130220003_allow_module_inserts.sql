-- Allow authenticated users to insert modules
drop policy if exists "Authenticated users can insert modules" on public.modules;
create policy "Authenticated users can insert modules"
  on public.modules for insert
  with check (auth.role() = 'authenticated');

-- Allow authenticated users to insert chapters
drop policy if exists "Authenticated users can insert chapters" on public.chapters;
create policy "Authenticated users can insert chapters"
  on public.chapters for insert
  with check (auth.role() = 'authenticated');

-- Allow authenticated users to insert lessons
drop policy if exists "Authenticated users can insert lessons" on public.lessons;
create policy "Authenticated users can insert lessons"
  on public.lessons for insert
  with check (auth.role() = 'authenticated');
