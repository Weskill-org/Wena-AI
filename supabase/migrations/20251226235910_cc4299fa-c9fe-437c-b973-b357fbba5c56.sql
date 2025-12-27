-- Add monthly_xp column to user_stats for leaderboard ranking
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS monthly_xp integer NOT NULL DEFAULT 0;

-- Create leagues table with league definitions
CREATE TABLE IF NOT EXISTS public.leagues (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    min_xp integer NOT NULL,
    max_xp integer,
    rank_order integer NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on leagues table
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read leagues (public configuration)
CREATE POLICY "Anyone can view leagues" ON public.leagues FOR SELECT USING (true);

-- Insert league definitions
INSERT INTO public.leagues (name, min_xp, max_xp, rank_order) VALUES
    ('Bronze', 0, 499, 1),
    ('Silver', 500, 1999, 2),
    ('Gold', 2000, 2499, 3),
    ('Platinum', 2500, 2999, 4),
    ('Diamond', 3000, 3499, 5),
    ('Master', 3500, NULL, 6)
ON CONFLICT (name) DO UPDATE SET min_xp = EXCLUDED.min_xp, max_xp = EXCLUDED.max_xp, rank_order = EXCLUDED.rank_order;

-- Create a function to get league based on XP
CREATE OR REPLACE FUNCTION public.get_league_for_xp(xp_amount integer)
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT name FROM public.leagues
    WHERE xp_amount >= min_xp AND (max_xp IS NULL OR xp_amount <= max_xp)
    ORDER BY rank_order DESC
    LIMIT 1;
$$;

-- Create a function to reset monthly XP (to be called on 1st of each month by admin or cron)
CREATE OR REPLACE FUNCTION public.reset_monthly_xp()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    UPDATE public.user_stats SET monthly_xp = 0, updated_at = now();
END;
$$;