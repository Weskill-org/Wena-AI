-- Fix RLS Policies to allow client-side generation and stats creation

-- 1. Allow any authenticated user to generate (insert) a daily challenge
-- This is required because we are using "Lazy Generation" triggered from the client side
drop policy if exists "Enable insert for service role" on public.daily_challenges;
create policy "Enable insert for authenticated users" on public.daily_challenges for insert with check (auth.role() = 'authenticated');

-- 2. Allow users to insert their own stats row
-- This is required for the 'upsert' operation if the user_stats row doesn't exist yet
drop policy if exists "Users can insert their own stats" on public.user_stats;
create policy "Users can insert their own stats" on public.user_stats for insert with check (auth.uid() = user_id);

-- 3. Ensure users can update their own stats (already exists, but good to double check safety)
-- create policy "Users can update their own stats" on public.user_stats for update using (auth.uid() = user_id);
-- (The above was already in the previous migration, so no need to duplicate)
