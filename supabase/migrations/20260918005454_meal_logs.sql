create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  logged_at timestamptz not null default now(),
  payload jsonb not null,
  source text not null,
  constraint meal_logs_source_check check (source in ('human', 'bot')),
  constraint meal_logs_payload_object_check check (jsonb_typeof(payload) = 'object')
);

create index meal_logs_person_logged_at_idx
  on public.meal_logs (person_id, logged_at desc);

alter table public.meal_logs enable row level security;
alter table public.meal_logs force row level security;

create policy meal_logs_select_household
  on public.meal_logs
  for select
  to authenticated
  using (
    person_id in (
      select p.id
      from public.people p
      where p.household_id = (select private.current_household_id())
    )
  );

create policy meal_logs_insert_human_self
  on public.meal_logs
  for insert
  to authenticated
  with check (
    person_id = (select private.current_person_id())
    and source = 'human'
  );

revoke update, delete on table public.meal_logs from anon, authenticated;

alter table public.person_profiles
  drop constraint if exists person_profiles_macro_method_check;

alter table public.person_profiles
  add constraint person_profiles_age_check
    check (age is null or age > 0);

alter table public.person_profiles
  add constraint person_profiles_height_check
    check (height_cm is null or height_cm > 0);

alter table public.person_profiles
  add constraint person_profiles_weight_check
    check (weight_kg is null or weight_kg > 0);

alter table public.person_profiles
  add constraint person_profiles_macros_nonnegative_check
    check (
      (calories is null or calories >= 0)
      and (protein_g is null or protein_g >= 0)
      and (carbs_g is null or carbs_g >= 0)
      and (fat_g is null or fat_g >= 0)
    );

alter table public.person_profiles
  add constraint person_profiles_macros_complete_check
    check (
      (
        calories is null
        and protein_g is null
        and carbs_g is null
        and fat_g is null
        and macro_method is null
      )
      or (
        calories is not null
        and protein_g is not null
        and carbs_g is not null
        and fat_g is not null
        and macro_method in ('manual', 'calculated')
      )
    );

create or replace function private.person_profiles_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger person_profiles_touch_updated_at
  before update on public.person_profiles
  for each row
  execute function private.person_profiles_touch_updated_at();
