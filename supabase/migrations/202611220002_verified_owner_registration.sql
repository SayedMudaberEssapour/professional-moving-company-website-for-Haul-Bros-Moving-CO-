-- Register the approved owner only after Supabase Auth verifies their email.
begin;
create function private.register_verified_portal_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if lower(new.email)='relocating@haulbrosmoving.com' and new.email_confirmed_at is not null then
    insert into private.portal_owner(singleton,user_id) values(true,new.id)
      on conflict(singleton) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.register_verified_portal_owner() from public, anon, authenticated;
create trigger register_verified_portal_owner
  after insert or update of email,email_confirmed_at on auth.users
  for each row execute function private.register_verified_portal_owner();
-- Handle an owner who verified before this migration was applied.
insert into private.portal_owner(singleton,user_id)
  select true,id from auth.users
  where lower(email)='relocating@haulbrosmoving.com' and email_confirmed_at is not null
  on conflict(singleton) do nothing;
commit;
