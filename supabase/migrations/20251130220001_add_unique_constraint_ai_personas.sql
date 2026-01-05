alter table public.ai_personas
drop constraint if exists ai_personas_user_id_key;

alter table public.ai_personas
add constraint ai_personas_user_id_key unique (user_id);
