-- Add last_wrong_attempt_at column to user_stats for tracking cooldown after wrong answers
ALTER TABLE public.user_stats 
ADD COLUMN IF NOT EXISTS last_wrong_attempt_at timestamp with time zone DEFAULT NULL;