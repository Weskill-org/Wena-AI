create table if not exists public.daily_flashcard_limits (
    user_id uuid references auth.users(id) on delete cascade not null primary key,
    remaining_questions integer not null default 10,
    last_reset_date date not null default current_date
);

-- RLS
alter table public.daily_flashcard_limits enable row level security;

create policy "Users can view their own limits"
    on public.daily_flashcard_limits for select
    using (auth.uid() = user_id);

drop policy if exists "Users can update their own limits" on public.daily_flashcard_limits;
create policy "Users can update their own limits"
    on public.daily_flashcard_limits for update
    using (auth.uid() = user_id);

drop policy if exists "Users can insert their own limits" on public.daily_flashcard_limits;
create policy "Users can insert their own limits"
    on public.daily_flashcard_limits for insert
    with check (auth.uid() = user_id);
