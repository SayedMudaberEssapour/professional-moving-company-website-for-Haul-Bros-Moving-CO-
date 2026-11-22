-- User-approved change of the sole owner/editor to the verified Gmail account.
begin;
create or replace function private.register_verified_portal_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if lower(new.email)='sayedmusawer0797@gmail.com' and new.email_confirmed_at is not null then
    insert into private.portal_owner(singleton,user_id) values(true,new.id)
      on conflict(singleton) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.register_verified_portal_owner() from public, anon, authenticated;
-- Remove the former owner grant without changing customer move records.
delete from private.portal_owner where user_id not in (
  select id from auth.users where lower(email)='sayedmusawer0797@gmail.com' and email_confirmed_at is not null
);
insert into private.portal_owner(singleton,user_id)
  select true,id from auth.users where lower(email)='sayedmusawer0797@gmail.com' and email_confirmed_at is not null
  on conflict(singleton) do nothing;
commit;
