-- Function to check and award badges
create or replace function public.check_and_award_badges()
returns trigger
language plpgsql
security definer
as $$
declare
    v_user_id uuid;
    v_badge_record record;
    v_eligible boolean;
begin
    -- Determine user_id based on the table that triggered it
    if TG_TABLE_NAME = 'user_module_progress' then
        v_user_id := new.user_id;
    elsif TG_TABLE_NAME = 'user_stats' then
        v_user_id := new.user_id;
    elsif TG_TABLE_NAME = 'flashcard_responses' then
        v_user_id := new.user_id;
    end if;

    if v_user_id is null then
        return new;
    end if;

    -- Loop through potential badges and check eligibility
    for v_badge_record in (select * from public.badges) loop
        -- Skip if user already has this badge
        if exists (select 1 from public.user_badges where user_id = v_user_id and badge_id = v_badge_record.id) then
            continue;
        end if;

        v_eligible := false;

        case v_badge_record.criteria_type
            when 'module' then
                -- Check if user has completed at least criteria_value modules
                v_eligible := (select count(*) >= v_badge_record.criteria_value 
                              from public.user_module_progress 
                              where user_id = v_user_id and completion_percentage >= 100);
            
            when 'streak' then
                -- Check if current or longest streak matches criteria_value
                v_eligible := exists (select 1 from public.user_stats 
                                     where user_id = v_user_id 
                                     and (current_streak >= v_badge_record.criteria_value or longest_streak >= v_badge_record.criteria_value));
            
            when 'flashcards' then
                -- Check if user has answered at least criteria_value flashcards
                v_eligible := (select count(*) >= v_badge_record.criteria_value 
                              from public.flashcard_responses 
                              where user_id = v_user_id);
            
            when 'leaderboard' then
                -- Check if user is in top X (criteria_value)
                -- We count how many users have more XP than this user
                v_eligible := (
                    with user_xp as (
                        select total_xp from public.user_stats where user_id = v_user_id
                    ),
                    rank_count as (
                        select count(*) + 1 as rank 
                        from public.user_stats 
                        where total_xp > (select total_xp from user_xp)
                    )
                    select rank <= v_badge_record.criteria_value from rank_count
                );
            else
                v_eligible := false;
        end case;

        if v_eligible then
            insert into public.user_badges (user_id, badge_id)
            values (v_user_id, v_badge_record.id)
            on conflict do nothing;
        end if;
    end loop;

    return new;
end;
$$;

-- Triggers for badge awarding

-- 1. Module completion
drop trigger if exists on_module_progress_badge on public.user_module_progress;
create trigger on_module_progress_badge
  after insert or update on public.user_module_progress
  for each row execute procedure public.check_and_award_badges();

-- 2. Streak / XP changes
drop trigger if exists on_user_stats_badge on public.user_stats;
create trigger on_user_stats_badge
  after insert or update on public.user_stats
  for each row execute procedure public.check_and_award_badges();

-- 3. Flashcard responses
drop trigger if exists on_flashcard_response_badge on public.flashcard_responses;
create trigger on_flashcard_response_badge
  after insert on public.flashcard_responses
  for each row execute procedure public.check_and_award_badges();
