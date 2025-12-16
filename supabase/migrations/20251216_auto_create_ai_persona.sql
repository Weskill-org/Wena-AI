-- Function to automatically create an AI Persona when a new profile is created
create or replace function public.create_initial_ai_persona()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  persona_content text;
begin
  -- Construct the initial persona text
  persona_content := 'Name: ' || NEW.full_name;
  
  if NEW.date_of_birth is not null then
    persona_content := persona_content || E'\nDate of Birth: ' || NEW.date_of_birth;
  end if;

  -- Insert into ai_personas
  insert into public.ai_personas (user_id, persona_text)
  values (NEW.id, persona_content)
  on conflict (user_id) do nothing;

  return NEW;
end;
$$;

-- Trigger to call the function after a profile is inserted
drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.create_initial_ai_persona();
