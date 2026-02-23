-- Add personalized learning path columns to ai_personas
alter table public.ai_personas
  add column if not exists learning_goals text null,
  add column if not exists skill_level text null,
  add column if not exists weekly_hours text null,
  add column if not exists interests text[] null,
  add column if not exists onboarding_completed boolean not null default false;

-- Create user_learning_paths table to cache AI-generated roadmaps
create table if not exists public.user_learning_paths (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generated_at timestamp with time zone not null default now(),
  roadmap jsonb not null default '[]'::jsonb,
  summary text null,
  constraint user_learning_paths_pkey primary key (id)
);

create index if not exists user_learning_paths_user_id_idx on public.user_learning_paths (user_id);
create index if not exists user_learning_paths_generated_at_idx on public.user_learning_paths (user_id, generated_at desc);

-- RLS
alter table public.user_learning_paths enable row level security;

drop policy if exists "Users can view their own learning paths" on public.user_learning_paths;
create policy "Users can view their own learning paths"
  on public.user_learning_paths for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own learning paths" on public.user_learning_paths;
create policy "Users can insert their own learning paths"
  on public.user_learning_paths for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own learning paths" on public.user_learning_paths;
create policy "Users can delete their own learning paths"
  on public.user_learning_paths for delete
  using (auth.uid() = user_id);
