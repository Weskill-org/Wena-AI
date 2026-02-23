-- Create tournaments table
create table if not exists public.tournaments (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    theme text not null,
    start_date timestamp with time zone not null,
    end_date timestamp with time zone not null,
    is_active boolean default true,
    created_at timestamp with time zone default now() not null,
    constraint tournaments_dates_check check (end_date > start_date)
);

-- Create tournamentparticipants table
create table if not exists public.tournament_participants (
    id uuid primary key default gen_random_uuid(),
    tournament_id uuid references public.tournaments(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    score integer default 0 not null,
    attempts_count integer default 0 not null,
    last_attempt_at timestamp with time zone default now(),
    created_at timestamp with time zone default now() not null,
    unique(tournament_id, user_id)
);

-- Add "tournament" criteria type to badges if it doesn't already exist in the logic
-- (The check_and_award_badges function uses criteria_type)
insert into public.badges (name, description, emoji, criteria_type, criteria_value)
values 
    ('Tournament Champion', 'Win a weekly themed tournament', '🏆', 'tournament', 1),
    ('Tournament Veteran', 'Participate in 5 tournaments', '🎖️', 'tournament_participation', 5)
on conflict (name) do nothing;

-- Enable RLS
alter table public.tournaments enable row level security;
alter table public.tournament_participants enable row level security;

-- Policies for tournaments
create policy "Anyone can view active tournaments"
    on public.tournaments for select
    using (true);

-- Policies for tournament_participants
create policy "Users can view all participants (for leaderboard)"
    on public.tournament_participants for select
    using (true);

create policy "Users can update their own tournament progress"
    on public.tournament_participants for update
    using (auth.uid() = user_id);

create policy "Users can insert their own tournament participation"
    on public.tournament_participants for insert
    with check (auth.uid() = user_id);

-- Function to get the active tournament
create or replace function public.get_active_tournament()
returns setof public.tournaments
language sql
security definer
as $$
    select *
    from public.tournaments
    where is_active = true
      and now() between start_date and end_date
    order by created_at desc
    limit 1;
$$;

-- Function to submit tournament score
create or replace function public.submit_tournament_score(
    p_tournament_id uuid,
    p_points integer
)
returns void
language plpgsql
security definer
as $$
declare
    v_user_id uuid := auth.uid();
begin
    insert into public.tournament_participants (tournament_id, user_id, score, attempts_count, last_attempt_at)
    values (p_tournament_id, v_user_id, p_points, 1, now())
    on conflict (tournament_id, user_id) 
    do update set 
        score = tournament_participants.score + p_points,
        attempts_count = tournament_participants.attempts_count + 1,
        last_attempt_at = now();
end;
$$;

-- Function to close a tournament and award winners
create or replace function public.close_tournament_and_award_winners(p_tournament_id uuid)
returns void
language plpgsql
security definer
as $$
declare
    v_winner_record record;
    v_rank integer := 1;
begin
    -- Mark tournament as inactive
    update public.tournaments set is_active = false where id = p_tournament_id;

    -- Award Top 3
    for v_winner_record in (
        select * from public.tournament_participants 
        where tournament_id = p_tournament_id 
        order by score desc 
        limit 3
    ) loop
        -- 1. Give Credits
        perform public.add_credits(
            case 
                when v_rank = 1 then 100 
                when v_rank = 2 then 50 
                when v_rank = 3 then 25 
            end,
            'Tournament Reward - Rank #' || v_rank
        );

        -- 2. Award Badge for Winner (Rank 1)
        if v_rank = 1 then
            insert into public.user_badges (user_id, badge_id)
            select v_winner_record.user_id, id from public.badges where name = 'Tournament Champion'
            on conflict do nothing;
            
            -- 3. Generate Certificate for Winner
            insert into public.certificates (user_id, title, description)
            select v_winner_record.user_id, 'Tournament Champion', 'Awarded for achieving Rank #1 in the ' || t.title || ' (' || t.theme || ')'
            from public.tournaments t where t.id = p_tournament_id;
        end if;

        v_rank := v_rank + 1;
    end loop;
end;
$$;

-- Seed an initial tournament for testing
insert into public.tournaments (title, description, theme, start_date, end_date)
values (
    'Grand AI Innovation Challenge', 
    'Test your knowledge on the history and future of Artificial Intelligence.', 
    'Artificial Intelligence', 
    now(), 
    now() + interval '7 days'
);
