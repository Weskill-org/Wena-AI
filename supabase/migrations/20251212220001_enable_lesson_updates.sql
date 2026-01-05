-- Enable RLS on lessons (if not already enabled)
alter table "public"."lessons" enable row level security;

-- Policy to allow users to update lessons if they own the module
drop policy if exists "Users can update lessons of their own modules" on "public"."lessons";
create policy "Users can update lessons of their own modules"
on "public"."lessons"
for update
using (
  exists (
    select 1
    from "public"."chapters"
    join "public"."modules" on "chapters"."module_id" = "modules"."id"
    where "chapters"."id" = "lessons"."chapter_id"
    and "modules"."user_id" = auth.uid()
  )
)
with check (
  exists (
    select 1
    from "public"."chapters"
    join "public"."modules" on "chapters"."module_id" = "modules"."id"
    where "chapters"."id" = "lessons"."chapter_id"
    and "modules"."user_id" = auth.uid()
  )
);
