create table private.household_mcp_tokens (
  household_id uuid primary key references public.households (id) on delete cascade,
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  issued_at timestamptz not null default now(),
  issued_by_person_id uuid references public.people (id) on delete set null
);

alter table private.household_mcp_tokens enable row level security;
alter table private.household_mcp_tokens force row level security;

revoke all on table private.household_mcp_tokens from public, anon, authenticated;
grant all on table private.household_mcp_tokens to postgres, service_role;

create or replace function private.mcp_token_hash(p_token_hash_hex text)
returns bytea
language plpgsql
immutable
security definer
set search_path = ''
as $$
begin
  if p_token_hash_hex is null
    or length(p_token_hash_hex) <> 64
    or p_token_hash_hex !~ '^[0-9a-f]+$'
  then
    return null;
  end if;
  return decode(p_token_hash_hex, 'hex');
end;
$$;

create or replace function private.rotate_household_mcp_token(p_token_hash_hex text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household_id uuid := (select private.current_household_id());
  v_person_id uuid := (select private.current_person_id());
  v_token_hash bytea := private.mcp_token_hash(p_token_hash_hex);
  v_issued_at timestamptz;
begin
  if v_household_id is null then
    raise exception 'not a household member';
  end if;

  if v_token_hash is null then
    raise exception 'token hash must be 32 bytes';
  end if;

  insert into private.household_mcp_tokens (household_id, token_hash, issued_by_person_id)
  values (v_household_id, v_token_hash, v_person_id)
  on conflict (household_id) do update
    set token_hash = excluded.token_hash,
        issued_at = now(),
        issued_by_person_id = excluded.issued_by_person_id
  returning issued_at into v_issued_at;

  return v_issued_at;
end;
$$;

create or replace function public.rotate_household_mcp_token(p_token_hash_hex text)
returns timestamptz
language sql
security invoker
set search_path = ''
as $$
  select private.rotate_household_mcp_token(p_token_hash_hex);
$$;

create or replace function private.household_mcp_token_status()
returns table (issued_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household_id uuid := (select private.current_household_id());
begin
  if v_household_id is null then
    return;
  end if;

  return query
  select t.issued_at
  from private.household_mcp_tokens t
  where t.household_id = v_household_id;
end;
$$;

create or replace function public.household_mcp_token_status()
returns table (issued_at timestamptz)
language sql
security invoker
set search_path = ''
as $$
  select s.issued_at
  from private.household_mcp_token_status() as s;
$$;

create or replace function private.resolve_household_mcp_token(p_token_hash_hex text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token_hash bytea := private.mcp_token_hash(p_token_hash_hex);
begin
  if v_token_hash is null then
    return null;
  end if;

  return (
    select t.household_id
    from private.household_mcp_tokens t
    where t.token_hash = v_token_hash
  );
end;
$$;

create or replace function public.resolve_household_mcp_token(p_token_hash_hex text)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.resolve_household_mcp_token(p_token_hash_hex);
$$;

revoke all on function private.mcp_token_hash(text) from public, anon, authenticated, service_role;
revoke all on function private.rotate_household_mcp_token(text) from public;
revoke all on function public.rotate_household_mcp_token(text) from public;
revoke all on function private.household_mcp_token_status() from public;
revoke all on function public.household_mcp_token_status() from public;
revoke all on function private.resolve_household_mcp_token(text) from public;
revoke all on function public.resolve_household_mcp_token(text) from public;

grant execute on function private.rotate_household_mcp_token(text) to authenticated;
grant execute on function public.rotate_household_mcp_token(text) to authenticated;
grant execute on function private.household_mcp_token_status() to authenticated;
grant execute on function public.household_mcp_token_status() to authenticated;
grant execute on function private.resolve_household_mcp_token(text) to service_role;
grant execute on function public.resolve_household_mcp_token(text) to service_role;
