-- Run in the Supabase SQL editor only after this exact email has signed in and
-- verified its email. This is an administrative bootstrap, never a browser RPC.
do $$
declare owner_id uuid;
begin
  select id into owner_id from auth.users
    where lower(email)='relocating@haulbrosmoving.com' and email_confirmed_at is not null;
  if owner_id is null then
    raise exception 'relocating@haulbrosmoving.com must sign in and verify its email first';
  end if;
  insert into private.portal_owner(singleton,user_id) values(true,owner_id);
end;
$$;
