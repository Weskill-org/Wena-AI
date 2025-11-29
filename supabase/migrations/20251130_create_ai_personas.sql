create table if not exists public.ai_personas (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null default auth.uid (),
  persona_text text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint ai_personas_pkey primary key (id),
  constraint ai_personas_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
) tablespace pg_default;

create index if not exists ai_personas_user_id_idx on public.ai_personas (user_id);

alter table public.ai_personas enable row level security;

create policy "Users can view their own persona" on public.ai_personas for select using (auth.uid() = user_id);

create policy "Users can insert their own persona" on public.ai_personas for insert with check (auth.uid() = user_id);

create policy "Users can update their own persona" on public.ai_personas for update using (auth.uid() = user_id);
