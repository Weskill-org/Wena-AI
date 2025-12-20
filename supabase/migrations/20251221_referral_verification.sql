-- Migration: 20251221_referral_verification
-- Description: Move referral reward logic from user creation to email verification

-- 1. Update handle_new_user to ONLY track referrals, not award them
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  ref_code text;
  referrer_id uuid;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, phone_number, date_of_birth)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone_number',
    (new.raw_user_meta_data->>'date_of_birth')::date
  );
  
  -- Insert wallet with 50 default credits
  INSERT INTO public.wallets (user_id, credits)
  VALUES (new.id, 50);
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  -- Generate and insert referral code
  ref_code := generate_referral_code(new.id);
  
  -- Check if user was referred (case-insensitive match)
  IF new.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    -- Find the referrer using case-insensitive comparison
    SELECT user_id INTO referrer_id
    FROM public.referral_codes
    WHERE UPPER(referral_code) = UPPER(new.raw_user_meta_data->>'referral_code');
  END IF;

  -- Insert into referral_codes with referred_by if applicable
  -- This tracks the relationship BUT DOES NOT AWARD CREDITS YET
  INSERT INTO public.referral_codes (user_id, referral_code, referred_by)
  VALUES (new.id, ref_code, referrer_id);
  
  RETURN new;
END;
$function$;

-- 2. Create function to handle email verification rewards
CREATE OR REPLACE FUNCTION public.handle_email_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  referrer_id uuid;
  already_rewarded boolean;
BEGIN
  -- Only proceed if email_confirmed_at was NULL and is now NOT NULL
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    
    -- Check if this user was referred by someone
    SELECT referred_by INTO referrer_id
    FROM public.referral_codes
    WHERE user_id = NEW.id;

    IF referrer_id IS NOT NULL THEN
        -- Check if rewards were already given (idempotency check)
        -- We check if the NEW user has a 'Referral signup bonus' transaction
        SELECT EXISTS (
            SELECT 1 FROM public.transactions 
            WHERE user_id = NEW.id AND label = 'Referral signup bonus'
        ) INTO already_rewarded;

        IF NOT already_rewarded THEN
            -- Update referrer's total referrals
            UPDATE public.referral_codes
            SET total_referrals = total_referrals + 1
            WHERE user_id = referrer_id;
            
            -- Add 50 credits to referrer's wallet
            UPDATE public.wallets
            SET credits = credits + 50
            WHERE user_id = referrer_id;
            
            -- Create transaction record for referrer
            INSERT INTO public.transactions (user_id, amount, type, label)
            VALUES (referrer_id, 50, 'earned', 'Referral bonus');
            
            -- Add 100 bonus credits to new user's wallet
            UPDATE public.wallets
            SET credits = credits + 100
            WHERE user_id = NEW.id;
            
            -- Create transaction record for new user
            INSERT INTO public.transactions (user_id, amount, type, label)
            VALUES (NEW.id, 100, 'earned', 'Referral signup bonus');
        END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Create Trigger on auth.users
-- Drop if exists to be safe
DROP TRIGGER IF EXISTS on_email_verified ON auth.users;

CREATE TRIGGER on_email_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_email_verification();
