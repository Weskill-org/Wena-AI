-- Update handle_new_user function to use case-insensitive referral code matching
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
  INSERT INTO public.referral_codes (user_id, referral_code)
  VALUES (new.id, ref_code);
  
  -- Check if user was referred and reward both users (case-insensitive match)
  IF new.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    -- Find the referrer using case-insensitive comparison
    SELECT user_id INTO referrer_id
    FROM public.referral_codes
    WHERE UPPER(referral_code) = UPPER(new.raw_user_meta_data->>'referral_code');
    
    IF referrer_id IS NOT NULL THEN
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
      WHERE user_id = new.id;
      
      -- Create transaction record for new user
      INSERT INTO public.transactions (user_id, amount, type, label)
      VALUES (new.id, 100, 'earned', 'Referral signup bonus');
    END IF;
  END IF;
  
  RETURN new;
END;
$function$;