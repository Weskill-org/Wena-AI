-- Create modules table
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  credit_cost integer default 0 not null,
  order_index integer default 0 not null,
  created_at timestamptz default now() not null
);

-- Enable RLS on modules
alter table public.modules enable row level security;

-- Modules policies
create policy "Anyone can view modules"
  on public.modules for select
  using (true);

-- Create chapters table
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules(id) on delete cascade not null,
  title text not null,
  description text,
  order_index integer default 0 not null,
  estimated_duration integer default 0 not null, -- in minutes
  created_at timestamptz default now() not null
);

-- Enable RLS on chapters
alter table public.chapters enable row level security;

-- Chapters policies
create policy "Anyone can view chapters"
  on public.chapters for select
  using (true);

-- Create lessons table
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references public.chapters(id) on delete cascade not null,
  title text not null,
  content text, -- AI generated content or initial prompt
  order_index integer default 0 not null,
  created_at timestamptz default now() not null
);

-- Enable RLS on lessons
alter table public.lessons enable row level security;

-- Lessons policies
create policy "Anyone can view lessons"
  on public.lessons for select
  using (true);

-- Create user_module_progress table
create table public.user_module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  module_id uuid references public.modules(id) on delete cascade not null,
  unlocked boolean default false not null,
  completion_percentage integer default 0 not null,
  last_accessed_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  unique (user_id, module_id)
);

-- Enable RLS on user_module_progress
alter table public.user_module_progress enable row level security;

-- User module progress policies
create policy "Users can view their own module progress"
  on public.user_module_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own module progress"
  on public.user_module_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own module progress"
  on public.user_module_progress for update
  using (auth.uid() = user_id);

-- Create user_lesson_progress table
create table public.user_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  completed boolean default false not null,
  completed_at timestamptz,
  created_at timestamptz default now() not null,
  unique (user_id, lesson_id)
);

-- Enable RLS on user_lesson_progress
alter table public.user_lesson_progress enable row level security;

-- User lesson progress policies
create policy "Users can view their own lesson progress"
  on public.user_lesson_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own lesson progress"
  on public.user_lesson_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own lesson progress"
  on public.user_lesson_progress for update
  using (auth.uid() = user_id);
