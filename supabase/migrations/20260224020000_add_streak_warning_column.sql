-- Add streak warning column to public.profiles table
alter table public.profiles
add column if not exists last_streak_warning_date date;

-- Add comment for clarity
comment on column public.profiles.last_streak_warning_date is 'The date the user was last warned about their streak being at risk.';
