-- 1. DROP the debug_logs table entirely (contains exposed PII data)
DROP TABLE IF EXISTS public.debug_logs CASCADE;

-- 2. REMOVE the UPDATE policy from wallets table to prevent client-side manipulation
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;

-- 3. Create secure RPC function for deducting credits (for module/lesson unlock)
CREATE OR REPLACE FUNCTION public.deduct_credits(amount integer, transaction_label text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_credits integer;
  item_user_id uuid;
BEGIN
  -- Get current user id
  item_user_id := auth.uid();
  
  IF item_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  -- Check current balance
  SELECT credits INTO current_credits
  FROM public.wallets
  WHERE user_id = item_user_id;

  IF current_credits IS NULL OR current_credits < amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Deduct credits
  UPDATE public.wallets
  SET credits = credits - amount,
      updated_at = now()
  WHERE user_id = item_user_id;

  -- Log transaction
  INSERT INTO public.transactions (user_id, amount, type, label)
  VALUES (item_user_id, amount, 'spent', transaction_label);

  RETURN true;
END;
$$;

-- 4. Create secure RPC function for adding credits (for challenge rewards)
CREATE OR REPLACE FUNCTION public.add_credits(amount integer, transaction_label text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_user_id uuid;
BEGIN
  -- Get current user id
  item_user_id := auth.uid();
  
  IF item_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  -- Add credits
  UPDATE public.wallets
  SET credits = credits + amount,
      updated_at = now()
  WHERE user_id = item_user_id;

  -- Log transaction
  INSERT INTO public.transactions (user_id, amount, type, label)
  VALUES (item_user_id, amount, 'earned', transaction_label);

  RETURN true;
END;
$$;