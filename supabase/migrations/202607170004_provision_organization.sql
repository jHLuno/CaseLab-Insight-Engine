alter table public.organization_members
add constraint organization_members_user_id_key unique (user_id);

create function public.provision_personal_organization(
  owner_user_id uuid,
  owner_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_organization_id uuid;
  new_organization_id uuid;
begin
  if auth.uid() is distinct from owner_user_id then
    raise exception 'not_authorized';
  end if;

  select organization_id into existing_organization_id
  from public.organization_members
  where user_id = owner_user_id;

  if existing_organization_id is not null then
    return existing_organization_id;
  end if;

  begin
    insert into public.organizations (name)
    values ('My research workspace')
    returning id into new_organization_id;

    insert into public.organization_members (organization_id, user_id, role)
    values (new_organization_id, owner_user_id, 'owner');
  exception
    when unique_violation then
      select organization_id into existing_organization_id
      from public.organization_members
      where user_id = owner_user_id;

      if existing_organization_id is null then
        raise;
      end if;

      return existing_organization_id;
  end;

  return new_organization_id;
end;
$$;

revoke all on function public.provision_personal_organization(uuid, text) from public;
grant execute on function public.provision_personal_organization(uuid, text) to authenticated;
