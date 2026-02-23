-- Create badges table
create table if not exists public.badges (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    description text not null,
    icon_url text, -- For custom images if needed
    emoji text, -- Fallback emoji
    criteria_type text not null, -- 'module', 'streak', 'flashcards', 'leaderboard'
    criteria_value integer not null,
    created_at timestamptz default now() not null
);

-- Enable RLS on badges
alter table public.badges enable row level security;

-- Badges policies
create policy "Anyone can view badges"
  on public.badges for select
  using (true);

-- Create user_badges table
create table if not exists public.user_badges (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete cascade not null,
    badge_id uuid references public.badges(id) on delete cascade not null,
    earned_at timestamptz default now() not null,
    unique (user_id, badge_id)
);

-- Enable RLS on user_badges
alter table public.user_badges enable row level security;

-- User badges policies
create policy "Users can view their own badges"
  on public.user_badges for select
  using (auth.uid() = user_id);

create policy "Users can view others' badges (for public profile)"
  on public.user_badges for select
  using (true);

-- Seed initial badges
insert into public.badges (name, description, emoji, criteria_type, criteria_value)
values
    ('Scholar Starter', 'Complete your first learning module', '🎓', 'module', 1),
    ('Consistent Learner', 'Maintain a 7-day learning streak', '🔥', 'streak', 7),
    ('Memory Master', 'Review 100 flashcards', '🧠', 'flashcards', 100),
    ('Top Contender', 'Reach the Top 3 on the global leaderboard', '🏆', 'leaderboard', 3)
on conflict (name) do nothing;
