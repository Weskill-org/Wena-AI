-- Create app_role enum for user roles
do $$ begin
    if not exists (select 1 from pg_type where typname = 'app_role') then
        create type public.app_role as enum ('admin', 'moderator', 'user');
    end if;
end $$;

-- Create profiles table to store user information
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone_number text,
  date_of_birth date,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles policies
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Create user_roles table for role management
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null default 'user',
  created_at timestamptz default now() not null,
  unique (user_id, role)
);

-- Enable RLS on user_roles
alter table public.user_roles enable row level security;

-- User roles policies
drop policy if exists "Users can view their own roles" on public.user_roles;
create policy "Users can view their own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

-- Security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Create wallet table for credits
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  credits integer default 250 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS on wallets
alter table public.wallets enable row level security;

-- Wallet policies
drop policy if exists "Users can view their own wallet" on public.wallets;
create policy "Users can view their own wallet"
  on public.wallets for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own wallet" on public.wallets;
create policy "Users can update their own wallet"
  on public.wallets for update
  using (auth.uid() = user_id);

-- Create certificates table
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  issued_date date default current_date not null,
  certificate_url text,
  created_at timestamptz default now() not null
);

-- Enable RLS on certificates
alter table public.certificates enable row level security;

-- Certificates policies
drop policy if exists "Users can view their own certificates" on public.certificates;
create policy "Users can view their own certificates"
  on public.certificates for select
  using (auth.uid() = user_id);

-- Create transaction history table
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount integer not null,
  type text not null check (type in ('earned', 'spent')),
  label text not null,
  created_at timestamptz default now() not null
);

-- Enable RLS on transactions
alter table public.transactions enable row level security;

-- Transactions policies
drop policy if exists "Users can view their own transactions" on public.transactions;
create policy "Users can view their own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert profile
  insert into public.profiles (id, full_name, phone_number, date_of_birth)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone_number',
    (new.raw_user_meta_data->>'date_of_birth')::date
  );
  
  -- Insert wallet with default credits
  insert into public.wallets (user_id, credits)
  values (new.id, 250);
  
  -- Assign default user role
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  return new;
end;
$$;

-- Trigger to create profile, wallet, and role on user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers for updated_at
drop trigger if exists handle_profiles_updated_at on public.profiles;
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_wallets_updated_at on public.wallets;
create trigger handle_wallets_updated_at
  before update on public.wallets
  for each row execute procedure public.handle_updated_at();