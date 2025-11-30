-- Add unlocked column to user_lesson_progress
alter table public.user_lesson_progress 
add column unlocked boolean default false not null;

-- Update existing records to have unlocked=true if completed=true (optional but good for consistency)
update public.user_lesson_progress 
set unlocked = true 
where completed = true;
