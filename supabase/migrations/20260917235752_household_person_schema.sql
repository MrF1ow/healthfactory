create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to postgres, anon, authenticated, service_role;

create type public.person_role as enum ('owner', 'member');

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'UTC',
  fridge_locations text[] not null default '{}',
  recipe_search_places jsonb not null default '[]'::jsonb,
  household_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index households_singleton on public.households ((true));

create table public.people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  email text,
  role public.person_role not null,
  created_at timestamptz not null default now()
);

create index people_household_id_idx on public.people (household_id);
create unique index people_email_key on public.people (email) where email is not null;

create table public.person_profiles (
  person_id uuid primary key references public.people (id) on delete cascade,
  age integer,
  sex text,
  height_cm numeric,
  weight_kg numeric,
  activity_level text,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  macro_method text,
  preferences jsonb not null default '{}'::jsonb,
  bot_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint person_profiles_macro_method_check
    check (macro_method is null or macro_method in ('manual', 'calculated'))
);

alter table public.households enable row level security;
alter table public.households force row level security;
alter table public.people enable row level security;
alter table public.people force row level security;
alter table public.person_profiles enable row level security;
alter table public.person_profiles force row level security;

create or replace function private.household_exists()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.households);
$$;

create or replace function private.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.household_id
  from public.people p
  where p.auth_user_id = (select auth.uid())
$$;

create or replace function private.current_person_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.people p
  where p.auth_user_id = (select auth.uid())
$$;

create or replace function public.household_exists()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.household_exists();
$$;

create or replace function private.bootstrap_household(
  p_household_name text,
  p_person_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_household_id uuid;
  v_person_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select p.household_id into v_household_id
  from public.people p
  where p.auth_user_id = v_uid;

  if found then
    return v_household_id;
  end if;

  if exists (select 1 from public.households) then
    raise exception 'household already exists';
  end if;

  if p_household_name is null or length(trim(p_household_name)) = 0 then
    raise exception 'household name required';
  end if;

  if p_person_name is null or length(trim(p_person_name)) = 0 then
    raise exception 'person name required';
  end if;

  select u.email into v_email
  from auth.users u
  where u.id = v_uid;

  insert into public.households (name)
  values (trim(p_household_name))
  returning id into v_household_id;

  insert into public.people (household_id, auth_user_id, name, email, role)
  values (v_household_id, v_uid, trim(p_person_name), v_email, 'owner')
  returning id into v_person_id;

  insert into public.person_profiles (person_id)
  values (v_person_id);

  return v_household_id;
exception
  when unique_violation then
    raise exception 'household already exists';
end;
$$;

create or replace function public.bootstrap_household(
  p_household_name text,
  p_person_name text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.bootstrap_household(p_household_name, p_person_name);
$$;

create or replace function private.people_keep_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.household_id is distinct from old.household_id
    or new.auth_user_id is distinct from old.auth_user_id
    or new.role is distinct from old.role
  then
    raise exception 'people identity columns cannot change';
  end if;
  return new;
end;
$$;

create trigger people_keep_identity
  before update on public.people
  for each row
  execute function private.people_keep_identity();

create or replace function private.person_profiles_keep_person()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.person_id is distinct from old.person_id then
    raise exception 'person_profiles.person_id cannot change';
  end if;
  return new;
end;
$$;

create trigger person_profiles_keep_person
  before update on public.person_profiles
  for each row
  execute function private.person_profiles_keep_person();

revoke all on function private.household_exists() from public;
revoke all on function public.household_exists() from public;
revoke all on function private.current_household_id() from public;
revoke all on function private.current_person_id() from public;
revoke all on function private.bootstrap_household(text, text) from public;
revoke all on function public.bootstrap_household(text, text) from public;

grant execute on function private.household_exists() to anon, authenticated;
grant execute on function public.household_exists() to anon, authenticated;
grant execute on function private.current_household_id() to authenticated;
grant execute on function private.current_person_id() to authenticated;
grant execute on function private.bootstrap_household(text, text) to authenticated;
grant execute on function public.bootstrap_household(text, text) to authenticated;

create policy households_select_member
  on public.households
  for select
  to authenticated
  using (id = (select private.current_household_id()));

create policy households_update_member
  on public.households
  for update
  to authenticated
  using (id = (select private.current_household_id()))
  with check (id = (select private.current_household_id()));

create policy people_select_household
  on public.people
  for select
  to authenticated
  using (household_id = (select private.current_household_id()));

create policy people_update_self
  on public.people
  for update
  to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

create policy person_profiles_select_household
  on public.person_profiles
  for select
  to authenticated
  using (
    person_id in (
      select p.id
      from public.people p
      where p.household_id = (select private.current_household_id())
    )
  );

create policy person_profiles_update_self
  on public.person_profiles
  for update
  to authenticated
  using (person_id = (select private.current_person_id()))
  with check (person_id = (select private.current_person_id()));
