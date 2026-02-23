-- Add scheduling columns to public.profiles table
alter table public.profiles
add column if not exists learning_goal_minutes integer default 30 not null,
add column if not exists preferred_study_time time without time zone default '18:00:00' not null,
add column if not exists push_notifications_enabled boolean default false not null,
add column if not exists in_app_reminders_enabled boolean default true not null,
add column if not exists last_reminded_date date;

-- Ensure RLS allows users to update these fields (covered by existing policy, but good to note)
-- "Users can update own profile." on public.profiles for update using (auth.uid() = id);
