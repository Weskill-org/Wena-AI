-- Add user_id to modules table
alter table public.modules 
add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Create index for performance
create index if not exists modules_user_id_idx on public.modules (user_id);

-- Update RLS policies for modules

-- Drop existing policy "Anyone can view modules"
drop policy if exists "Anyone can view modules" on public.modules;

-- Create new policies
drop policy if exists "Users can view their own modules" on public.modules;
create policy "Users can view their own modules"
  on public.modules for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own modules" on public.modules;
create policy "Users can insert their own modules"
  on public.modules for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own modules" on public.modules;
create policy "Users can update their own modules"
  on public.modules for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own modules" on public.modules;
create policy "Users can delete their own modules"
  on public.modules for delete
  using (auth.uid() = user_id);

-- Update RLS policies for chapters
drop policy if exists "Anyone can view chapters" on public.chapters;

drop policy if exists "Users can view chapters of their modules" on public.chapters;
create policy "Users can view chapters of their modules"
  on public.chapters for select
  using (
    exists (
      select 1 from public.modules
      where modules.id = chapters.module_id
      and modules.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert chapters to their modules" on public.chapters;
create policy "Users can insert chapters to their modules"
  on public.chapters for insert
  with check (
    exists (
      select 1 from public.modules
      where modules.id = module_id
      and modules.user_id = auth.uid()
    )
  );

-- Update RLS policies for lessons
drop policy if exists "Anyone can view lessons" on public.lessons;

drop policy if exists "Users can view lessons of their modules" on public.lessons;
create policy "Users can view lessons of their modules"
  on public.lessons for select
  using (
    exists (
      select 1 from public.chapters
      join public.modules on modules.id = chapters.module_id
      where chapters.id = lessons.chapter_id
      and modules.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert lessons to their modules" on public.lessons;
create policy "Users can insert lessons to their modules"
  on public.lessons for insert
  with check (
    exists (
      select 1 from public.chapters
      join public.modules on modules.id = chapters.module_id
      where chapters.id = chapter_id
      and modules.user_id = auth.uid()
    )
  );
