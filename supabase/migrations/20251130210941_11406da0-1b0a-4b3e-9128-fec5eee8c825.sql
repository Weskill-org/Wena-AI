-- Create coupon_codes table
CREATE TABLE IF NOT EXISTS public.coupon_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  credits integer NOT NULL,
  is_redeemed boolean NOT NULL DEFAULT false,
  redeemed_by uuid REFERENCES auth.users(id),
  redeemed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create referral_codes table
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  referral_code text NOT NULL UNIQUE,
  total_referrals integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create discount_codes table
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value integer NOT NULL,
  max_discount integer,
  min_cart_value integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create payment_orders table
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  credits integer NOT NULL,
  discount_applied integer DEFAULT 0,
  discount_code text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_id text,
  razorpay_order_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coupon_codes
drop policy if exists "Users can view available coupon codes" on public.coupon_codes;
CREATE POLICY "Users can view available coupon codes"
  ON public.coupon_codes FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policies for referral_codes
drop policy if exists "Users can view their own referral code" on public.referral_codes;
CREATE POLICY "Users can view their own referral code"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

drop policy if exists "Users can view all referral codes for validation" on public.referral_codes;
CREATE POLICY "Users can view all referral codes for validation"
  ON public.referral_codes FOR SELECT
  USING (auth.role() = 'authenticated');

drop policy if exists "Users can insert their own referral code" on public.referral_codes;
CREATE POLICY "Users can insert their own referral code"
  ON public.referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

drop policy if exists "Users can update their own referral code" on public.referral_codes;
CREATE POLICY "Users can update their own referral code"
  ON public.referral_codes FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for discount_codes
drop policy if exists "Users can view active discount codes" on public.discount_codes;
CREATE POLICY "Users can view active discount codes"
  ON public.discount_codes FOR SELECT
  USING (is_active = true);

-- RLS Policies for payment_orders
drop policy if exists "Users can view their own payment orders" on public.payment_orders;
CREATE POLICY "Users can view their own payment orders"
  ON public.payment_orders FOR SELECT
  USING (auth.uid() = user_id);

drop policy if exists "Users can insert their own payment orders" on public.payment_orders;
CREATE POLICY "Users can insert their own payment orders"
  ON public.payment_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

drop policy if exists "Users can update their own payment orders" on public.payment_orders;
CREATE POLICY "Users can update their own payment orders"
  ON public.payment_orders FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(user_id_param uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate a random 8-character code
    new_code := upper(substring(md5(random()::text || user_id_param::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE referral_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Update handle_new_user function to include referral code generation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  
  -- Insert wallet with default credits
  INSERT INTO public.wallets (user_id, credits)
  VALUES (new.id, 250);
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  -- Generate and insert referral code
  ref_code := generate_referral_code(new.id);
  INSERT INTO public.referral_codes (user_id, referral_code)
  VALUES (new.id, ref_code);
  
  -- Check if user was referred and reward referrer
  IF new.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    -- Find the referrer
    SELECT user_id INTO referrer_id
    FROM public.referral_codes
    WHERE referral_code = new.raw_user_meta_data->>'referral_code';
    
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
    END IF;
  END IF;
  
  RETURN new;
END;
$$;