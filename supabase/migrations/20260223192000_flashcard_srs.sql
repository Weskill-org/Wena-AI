-- Create user_flashcard_stats table for SRS metadata
create table if not exists public.user_flashcard_stats (
    user_id uuid not null references auth.users(id) on delete cascade,
    question_id uuid not null references public.flashcard_questions(id) on delete cascade,
    easiness_factor double precision not null default 2.5,
    interval integer not null default 0,
    repetitions integer not null default 0,
    next_review_at timestamp with time zone not null default now(),
    last_reviewed_at timestamp with time zone,
    created_at timestamp with time zone not null default now(),
    constraint user_flashcard_stats_pkey primary key (user_id, question_id)
) tablespace pg_default;

-- Add indexes
create index if not exists user_flashcard_stats_user_id_idx on public.user_flashcard_stats (user_id);
create index if not exists user_flashcard_stats_next_review_at_idx on public.user_flashcard_stats (next_review_at);

-- Enable RLS
alter table public.user_flashcard_stats enable row level security;

-- RLS Policies
drop policy if exists "Users can view their own stats" on public.user_flashcard_stats;
create policy "Users can view their own stats" on public.user_flashcard_stats
    for select using (auth.uid() = user_id);

drop policy if exists "Users can update their own stats" on public.user_flashcard_stats;
create policy "Users can update their own stats" on public.user_flashcard_stats
    for update using (auth.uid() = user_id);

drop policy if exists "Users can insert their own stats" on public.user_flashcard_stats;
create policy "Users can insert their own stats" on public.user_flashcard_stats
    for insert with check (auth.uid() = user_id);

-- Also allow deletion for cleanups
drop policy if exists "Users can delete their own stats" on public.user_flashcard_stats;
create policy "Users can delete their own stats" on public.user_flashcard_stats
    for delete using (auth.uid() = user_id);
