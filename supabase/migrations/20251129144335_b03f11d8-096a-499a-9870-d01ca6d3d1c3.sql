-- Fix RLS policies for profiles table
-- Allow users to insert their own profile (needed for registration flow)
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Add RLS policies for certificates table
-- Allow users to insert their own certificates
CREATE POLICY "Users can insert their own certificates"
ON public.certificates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own certificates
CREATE POLICY "Users can update their own certificates"
ON public.certificates
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own certificates
CREATE POLICY "Users can delete their own certificates"
ON public.certificates
FOR DELETE
USING (auth.uid() = user_id);

-- Add RLS policy for wallets table (read-only for users, managed by system)
-- Wallet INSERT is handled by the trigger with SECURITY DEFINER, so no INSERT policy needed for users

-- Add RLS policy for transactions table
-- Allow users to insert their own transactions
CREATE POLICY "Users can insert their own transactions"
ON public.transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);