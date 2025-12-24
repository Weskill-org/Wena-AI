-- Create country_prefixes table
CREATE TABLE public.country_prefixes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL UNIQUE,
  country_name text NOT NULL,
  dial_code text NOT NULL,
  flag_emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.country_prefixes ENABLE ROW LEVEL SECURITY;

-- Allow public read access (no auth required)
CREATE POLICY "Anyone can view country prefixes"
ON public.country_prefixes
FOR SELECT
USING (true);

-- Insert country prefixes for India, USA, Australia, France, UK
INSERT INTO public.country_prefixes (country_code, country_name, dial_code, flag_emoji) VALUES
  ('IN', 'India', '+91', '🇮🇳'),
  ('US', 'United States', '+1', '🇺🇸'),
  ('AU', 'Australia', '+61', '🇦🇺'),
  ('FR', 'France', '+33', '🇫🇷'),
  ('GB', 'United Kingdom', '+44', '🇬🇧');