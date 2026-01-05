-- Update transactions type check to include 'ai_usage'
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check check (type in ('earned', 'spent', 'ai_usage'));

-- Create a secure function to handle credit deduction
create or replace function public.deduct_ai_credits(amount integer default 1)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_credits integer;
  item_user_id uuid;
begin
  -- Get current user id
  item_user_id := auth.uid();
  
  if item_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Check current balance
  select credits into current_credits
  from public.wallets
  where user_id = item_user_id;

  if current_credits < amount then
    raise exception 'Insufficient credits';
  end if;

  -- Deduct credits
  update public.wallets
  set credits = credits - amount,
      updated_at = now()
  where user_id = item_user_id;

  -- Log transaction
  insert into public.transactions (user_id, amount, type, label)
  values (item_user_id, -amount, 'ai_usage', 'AI Session Response');

end;
$$;
