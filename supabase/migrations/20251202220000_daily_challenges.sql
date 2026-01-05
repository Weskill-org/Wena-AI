-- Create daily_challenges table
create table if not exists public.daily_challenges (
    id uuid not null default gen_random_uuid(),
    question text not null,
    options jsonb null, -- null for text input, array for multiple choice
    correct_answer text not null,
    difficulty text not null default 'Easy',
    topic text not null default 'General',
    challenge_date date not null unique default current_date,
    created_at timestamp with time zone not null default now(),
    constraint daily_challenges_pkey primary key (id)
) tablespace pg_default;

-- Create user_stats table for Leaderboard and Streaks
create table if not exists public.user_stats (
    user_id uuid not null references public.profiles(id) on delete cascade,
    total_xp integer not null default 0,
    current_streak integer not null default 0,
    longest_streak integer not null default 0,
    last_challenge_date date,
    tier text not null default 'Bronze', -- Bronze, Silver, Gold, Platinum, Diamond
    updated_at timestamp with time zone not null default now(),
    constraint user_stats_pkey primary key (user_id)
) tablespace pg_default;

-- Create user_challenge_attempts table
create table if not exists public.user_challenge_attempts (
    id uuid not null default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    challenge_id uuid not null references public.daily_challenges(id) on delete cascade,
    response text not null,
    is_correct boolean not null,
    points_earned integer not null default 0,
    attempted_at timestamp with time zone not null default now(),
    constraint user_challenge_attempts_pkey primary key (id),
    constraint user_challenge_attempts_user_challenge_unique unique (user_id, challenge_id)
) tablespace pg_default;

-- Enable RLS
alter table public.daily_challenges enable row level security;
alter table public.user_stats enable row level security;
alter table public.user_challenge_attempts enable row level security;

-- Policies for daily_challenges (Read public, Write service role/admin)
drop policy if exists "Enable read access for all users" on public.daily_challenges;
create policy "Enable read access for all users" on public.daily_challenges for select using (true);

drop policy if exists "Enable insert for service role" on public.daily_challenges;
create policy "Enable insert for service role" on public.daily_challenges for insert with check (true); 

-- Policies for user_stats
drop policy if exists "Users can view all stats (for leaderboard)" on public.user_stats;
create policy "Users can view all stats (for leaderboard)" on public.user_stats for select using (true);

drop policy if exists "Users can update their own stats" on public.user_stats;
create policy "Users can update their own stats" on public.user_stats for update using (auth.uid() = user_id);

drop policy if exists "Service role can manage stats" on public.user_stats;
create policy "Service role can manage stats" on public.user_stats for all using (true);

-- Policies for user_challenge_attempts
drop policy if exists "Users can view their own attempts" on public.user_challenge_attempts;
create policy "Users can view their own attempts" on public.user_challenge_attempts for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own attempts" on public.user_challenge_attempts;
create policy "Users can insert their own attempts" on public.user_challenge_attempts for insert with check (auth.uid() = user_id);

-- Indexes
create index if not exists idx_daily_challenges_date on public.daily_challenges (challenge_date);
create index if not exists idx_user_stats_xp on public.user_stats (total_xp desc);
create index if not exists idx_user_challenge_attempts_user on public.user_challenge_attempts (user_id);

-- Trigger to create user_stats entry when a profile is created
create or replace function public.handle_new_user_stats()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_stats (user_id)
  values (new.id);
  return new;
end;
$$;

create trigger on_profile_created_create_stats
  after insert on public.profiles
  for each row execute procedure public.handle_new_user_stats();

-- Backfill user_stats for existing profiles (if any exist without stats)
insert into public.user_stats (user_id)
select id from public.profiles
where id not in (select user_id from public.user_stats)
on conflict do nothing;
