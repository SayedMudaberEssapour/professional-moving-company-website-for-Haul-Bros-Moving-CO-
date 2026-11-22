-- Run in the Supabase SQL editor only after this exact email has signed in and
-- verified its email. This is an administrative bootstrap, never a browser RPC.
do $$
declare owner_id uuid;
begin
  select id into owner_id from auth.users
    where lower(email)='sayedmusawer0797@gmail.com' and email_confirmed_at is not null;
  if owner_id is null then
    raise exception 'sayedmusawer0797@gmail.com must sign in and verify its email first';
  end if;
  if exists(select 1 from private.portal_owner where user_id<>owner_id) then
    raise exception 'A different owner is already registered';
  end if;
  insert into private.portal_owner(singleton,user_id) values(true,owner_id)
    on conflict(singleton) do nothing;
end;
$$;
