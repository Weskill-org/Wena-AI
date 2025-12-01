-- Add details column to ai_personas if it doesn't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'ai_personas' and column_name = 'details') then
        alter table public.ai_personas add column details jsonb default '{}'::jsonb;
    end if;
end $$;

-- Create flashcard_questions table
create table if not exists public.flashcard_questions (
    id uuid not null default gen_random_uuid(),
    question_text text not null,
    field_key text not null,
    category text not null,
    order_index int not null default 0,
    input_type text not null default 'text', -- 'text', 'date', 'select', 'number'
    options jsonb null, -- for select inputs, e.g. ["Male", "Female", "Other"]
    created_at timestamp with time zone not null default now(),
    constraint flashcard_questions_pkey primary key (id)
) tablespace pg_default;

-- Create flashcard_responses table
create table if not exists public.flashcard_responses (
    id uuid not null default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    question_id uuid not null references public.flashcard_questions(id) on delete cascade,
    response text not null,
    answered_at timestamp with time zone not null default now(),
    constraint flashcard_responses_pkey primary key (id)
) tablespace pg_default;

-- Add indexes
create index if not exists flashcard_responses_user_id_idx on public.flashcard_responses (user_id);
create index if not exists flashcard_responses_answered_at_idx on public.flashcard_responses (answered_at);

-- Enable RLS
alter table public.flashcard_questions enable row level security;
alter table public.flashcard_responses enable row level security;

-- RLS Policies for flashcard_questions (Public read, Admin write - assuming no admin role for now, so public read only)
create policy "Enable read access for all users" on public.flashcard_questions for select using (true);

-- RLS Policies for flashcard_responses
create policy "Users can view their own responses" on public.flashcard_responses for select using (auth.uid() = user_id);
create policy "Users can insert their own responses" on public.flashcard_responses for insert with check (auth.uid() = user_id);
create policy "Users can update their own responses" on public.flashcard_responses for update using (auth.uid() = user_id);

-- Seed Data for Questions
insert into public.flashcard_questions (question_text, field_key, category, order_index, input_type, options)
values
    ('What is your Gender?', 'gender', 'Personal', 1, 'select', '["Male", "Female", "Non-binary", "Prefer not to say"]'),
    ('What is your Date of Birth?', 'date_of_birth', 'Personal', 2, 'date', null),
    ('What is the name of your School?', 'school_name', 'Education', 3, 'text', null),
    ('Which stream did you choose in 12th grade?', 'stream_12th', 'Education', 4, 'select', '["Science (PCM)", "Science (PCB)", "Commerce", "Arts/Humanities", "Vocational"]'),
    ('Are you currently pursuing graduation?', 'is_graduating', 'Education', 5, 'select', '["Yes", "No", "Completed"]'),
    ('What is your current graduation degree?', 'graduation_degree', 'Education', 6, 'text', null),
    ('What is your primary language?', 'current_language', 'Language', 7, 'text', null),
    ('Which language do you want to learn?', 'target_language', 'Language', 8, 'text', null)
on conflict do nothing;
