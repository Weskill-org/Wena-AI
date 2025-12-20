-- Add individual_gemini_key column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN individual_gemini_key TEXT DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.profiles.individual_gemini_key IS 'Optional user-provided Gemini API key for personalized AI usage';