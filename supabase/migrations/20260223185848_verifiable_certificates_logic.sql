-- Add verification_code and module_id to certificates
ALTER TABLE public.certificates 
ADD COLUMN IF NOT EXISTS verification_code text UNIQUE,
ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL;

-- Function to generate a unique verification code
CREATE OR REPLACE FUNCTION public.generate_verification_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  LOOP
    -- Generate a random 8-character uppercase alphanumeric code
    v_code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if it already exists
    SELECT exists (SELECT 1 FROM public.certificates WHERE verification_code = v_code) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

-- Trigger function to auto-assign verification code on insert
CREATE OR REPLACE FUNCTION public.tr_assign_certificate_verification_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.verification_code IS NULL THEN
    NEW.verification_code := public.generate_verification_code();
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_certificate_created ON public.certificates;
CREATE TRIGGER on_certificate_created
  BEFORE INSERT ON public.certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_assign_certificate_verification_code();

-- Grant public access to certificates for verification (Read-only)
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to verify a certificate if they have the code
DROP POLICY IF EXISTS "Public can verify certificates via code" ON public.certificates;
CREATE POLICY "Public can verify certificates via code"
  ON public.certificates FOR SELECT
  USING (true); -- We allow select on all, but in the UI we will filter by verification_code
