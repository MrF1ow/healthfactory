create or replace function private.add_household_member(
  p_auth_user_id uuid,
  p_name text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household_id uuid := (select private.current_household_id());
  v_person_id uuid;
  v_email text;
begin
  if v_household_id is null then
    raise exception 'not a household member';
  end if;

  if p_auth_user_id is null then
    raise exception 'auth user required';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'person name required';
  end if;

  select p.id into v_person_id
  from public.people p
  where p.auth_user_id = p_auth_user_id;

  if found then
    return v_person_id;
  end if;

  v_email := nullif(trim(p_email), '');

  insert into public.people (household_id, auth_user_id, name, email, role)
  values (v_household_id, p_auth_user_id, trim(p_name), v_email, 'member')
  returning id into v_person_id;

  insert into public.person_profiles (person_id)
  values (v_person_id);

  return v_person_id;
exception
  when unique_violation then
    raise exception 'that login is already in use';
end;
$$;

create or replace function public.add_household_member(
  p_auth_user_id uuid,
  p_name text,
  p_email text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.add_household_member(p_auth_user_id, p_name, p_email);
$$;

revoke all on function private.add_household_member(uuid, text, text) from public;
revoke all on function public.add_household_member(uuid, text, text) from public;

grant execute on function private.add_household_member(uuid, text, text) to authenticated;
grant execute on function public.add_household_member(uuid, text, text) to authenticated;
