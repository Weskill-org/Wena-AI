-- Allow authenticated users to insert modules
create policy "Authenticated users can insert modules"
  on public.modules for insert
  with check (auth.role() = 'authenticated');

-- Allow authenticated users to insert chapters
create policy "Authenticated users can insert chapters"
  on public.chapters for insert
  with check (auth.role() = 'authenticated');

-- Allow authenticated users to insert lessons
create policy "Authenticated users can insert lessons"
  on public.lessons for insert
  with check (auth.role() = 'authenticated');
