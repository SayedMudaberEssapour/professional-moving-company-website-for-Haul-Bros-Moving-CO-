-- Fresh projects only. Never rerun on an existing database.
begin;
-- 202611220001_private_move_portal.sql
-- Apply to a fresh Supabase project. No customer data belongs in this repository.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.portal_owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id)
);
revoke all on private.portal_owner from public, anon, authenticated;

create function public.portal_is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from private.portal_owner where user_id = auth.uid());
$$;
revoke all on function public.portal_is_owner() from public, anon;
grant execute on function public.portal_is_owner() to authenticated;

create table public.customer_moves (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id),
  request_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  customer_details jsonb not null,
  inventory jsonb not null,
  planning_estimate jsonb not null,
  move_status text not null default 'Review pending' check (move_status in ('Review pending','Estimate sent','Scheduled','In progress','Completed','Cancelled')),
  confirmed_price_cents bigint check (confirmed_price_cents between 0 and 100000000),
  deposit_due_cents bigint check (deposit_due_cents between 0 and 100000000),
  deposit_paid_cents bigint not null default 0 check (deposit_paid_cents between 0 and 100000000),
  deposit_instructions text not null default '' check (length(deposit_instructions)<=10000),
  moving_instructions text not null default '' check (length(moving_instructions)<=20000),
  customer_notes text not null default '' check (length(customer_notes)<=20000),
  unique(customer_id,request_id)
);
create index customer_moves_customer_created on public.customer_moves(customer_id,created_at desc);
alter table public.customer_moves enable row level security;
revoke all on public.customer_moves from public, anon, authenticated;
grant select, update on public.customer_moves to authenticated;
create policy read_own_moves on public.customer_moves for select to authenticated
  using (customer_id=auth.uid() or public.portal_is_owner());
create policy owner_updates_only on public.customer_moves for update to authenticated
  using (public.portal_is_owner()) with check (public.portal_is_owner());
-- There is deliberately no direct INSERT or DELETE privilege or policy.

create table private.move_audit (
  id bigint generated always as identity primary key,
  move_id uuid not null,
  edited_by uuid not null,
  edited_at timestamptz not null default now(),
  previous_record jsonb not null,
  new_record jsonb not null
);
revoke all on private.move_audit from public, anon, authenticated;
create function private.audit_move_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.portal_is_owner() then raise exception 'Owner access required'; end if;
  if new.id<>old.id or new.customer_id<>old.customer_id or new.request_id<>old.request_id or new.created_at<>old.created_at then
    raise exception 'Move identity cannot be changed';
  end if;
  new.updated_at=now();
  insert into private.move_audit(move_id,edited_by,previous_record,new_record)
    values(old.id,auth.uid(),to_jsonb(old),to_jsonb(new));
  return new;
end;
$$;
revoke all on function private.audit_move_update() from public, anon, authenticated;
create trigger audit_owner_move_update before update on public.customer_moves
  for each row execute function private.audit_move_update();

-- Verified customers can submit a new snapshot through this one function only.
-- All commercial fields are database defaults; client-supplied prices are ignored.
create function public.create_customer_move(p_request_id uuid,p_submission jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); actor_email text; result uuid; details jsonb;
begin
  if actor is null then raise exception 'Sign in required'; end if;
  select email into actor_email from auth.users where id=actor and email_confirmed_at is not null;
  if actor_email is null then raise exception 'Verify your email first'; end if;
  if p_request_id is null or jsonb_typeof(p_submission)<>'object' or octet_length(p_submission::text)>200000 then
    raise exception 'Invalid submission';
  end if;
  -- Serialize requests from this customer so idempotency and daily limits are race safe.
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  select id into result from public.customer_moves where customer_id=actor and request_id=p_request_id;
  if result is not null then return result; end if;
  if (select count(*) from public.customer_moves where customer_id=actor and created_at>now()-interval '1 day')>=5 then
    raise exception 'Daily submission limit reached. Contact Haul Bros for help.';
  end if;
  details=jsonb_build_object(
    'name',left(coalesce(p_submission->>'name',''),200),
    'email',actor_email,
    'phone',left(coalesce(p_submission->>'phone',''),80),
    'service_date',left(coalesce(p_submission->>'service_date',''),30),
    'moving_from',left(coalesce(p_submission->>'moving_from',''),1000),
    'moving_to',left(coalesce(p_submission->>'moving_to',''),1000),
    'service_type',left(coalesce(p_submission->>'service_type',''),200),
    'pickup_access',left(coalesce(p_submission->>'pickup_access',''),200),
    'delivery_access',left(coalesce(p_submission->>'delivery_access',''),200),
    'walking_distance',left(coalesce(p_submission->>'walking_distance',''),200),
    'driving_minutes',left(coalesce(p_submission->>'driving_minutes',''),20),
    'packing_help',left(coalesce(p_submission->>'packing_help',''),200),
    'notes',left(coalesce(p_submission->>'notes',''),10000)
  );
  if length(trim(details->>'name'))=0 or length(trim(details->>'phone'))=0 or length(trim(details->>'moving_from'))=0
    or jsonb_typeof(p_submission->'inventory') is distinct from 'array'
    or jsonb_array_length(p_submission->'inventory')=0
    or jsonb_typeof(p_submission->'planning_estimate') is distinct from 'object' then
    raise exception 'Contact details and inventory are required';
  end if;
  insert into public.customer_moves(customer_id,request_id,customer_details,inventory,planning_estimate)
    values(actor,p_request_id,details,p_submission->'inventory',p_submission->'planning_estimate') returning id into result;
  return result;
end;
$$;
revoke all on function public.create_customer_move(uuid,jsonb) from public, anon;
grant execute on function public.create_customer_move(uuid,jsonb) to authenticated;

-- 202611220002_verified_owner_registration.sql
-- Register the approved owner only after Supabase Auth verifies their email.
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

-- 202611220003_change_portal_owner.sql
-- User-approved change of the sole owner/editor to the verified Gmail account.
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

-- 202611220004_customer_access_codes.sql
alter table public.customer_moves alter column customer_id drop not null;
create table private.move_access (
 move_id uuid primary key references public.customer_moves(id),
 request_id uuid not null unique,
 phone text not null,
 code_hash bytea not null unique
);
revoke all on private.move_access from public, anon, authenticated;
create function public.create_guest_move(p_request_id uuid,p_submission jsonb,p_code text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_phone text; result uuid; details jsonb;
begin
 v_phone=regexp_replace(coalesce(p_submission->>'phone',''),'[^0-9]','','g');
 if length(v_phone)=11 and left(v_phone,1)='1' then v_phone=substr(v_phone,2); end if;
 if v_phone !~ '^[0-9]{10}$' or p_code !~ '^[a-f0-9]{32}$' or p_request_id is null
 or jsonb_typeof(p_submission) is distinct from 'object' or octet_length(p_submission::text)>200000
 or length(trim(coalesce(p_submission->>'name','')))=0
 or length(trim(coalesce(p_submission->>'moving_from','')))=0
 or jsonb_typeof(p_submission->'inventory') is distinct from 'array'
 or jsonb_typeof(p_submission->'planning_estimate') is distinct from 'object' then raise exception 'Invalid moving request'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_phone,0));
 select a.move_id into result from private.move_access a where a.request_id=p_request_id and a.phone=v_phone and a.code_hash=sha256(convert_to(p_code,'UTF8'));
 if result is not null then return result; end if;
 if (select count(*) from private.move_access a join public.customer_moves m on m.id=a.move_id where a.phone=v_phone and m.created_at>now()-interval '1 day')>=5 then raise exception 'Please contact Haul Bros for more requests'; end if;
 select coalesce(jsonb_object_agg(key,left(value #>> '{}',10000)),'{}'::jsonb) into details from jsonb_each(p_submission) where key in ('name','email','phone','service_date','moving_from','moving_to','service_type','pickup_access','delivery_access','walking_distance','driving_minutes','packing_help','notes','home_size','commercial_square_feet','business_type','junk_amount','junk_items','storage_space','storage_duration','service_items');
 insert into public.customer_moves(customer_id,request_id,customer_details,inventory,planning_estimate) values(null,p_request_id,details,p_submission->'inventory',p_submission->'planning_estimate') returning id into result;
 insert into private.move_access values(result,p_request_id,v_phone,sha256(convert_to(p_code,'UTF8')));
 return result;
end;
$$;
revoke all on function public.create_guest_move(uuid,jsonb,text) from public;
grant execute on function public.create_guest_move(uuid,jsonb,text) to anon,authenticated;
create function public.read_guest_move(p_phone text,p_code text) returns setof public.customer_moves
language plpgsql stable security definer set search_path='' as $$
declare v_phone text;
begin
 v_phone=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
 if length(v_phone)=11 and left(v_phone,1)='1' then v_phone=substr(v_phone,2); end if;
 if v_phone !~ '^[0-9]{10}$' or p_code !~ '^[a-f0-9]{32}$' then return; end if;
 return query select m.* from public.customer_moves m join private.move_access a on a.move_id=m.id where a.phone=v_phone and a.code_hash=sha256(convert_to(p_code,'UTF8'));
end;
$$;
revoke all on function public.read_guest_move(text,text) from public;
grant execute on function public.read_guest_move(text,text) to anon,authenticated;

-- 202611220005_restore_business_owner.sql
-- User-approved sole owner/editor: verified business email.
create or replace function private.register_verified_portal_owner() returns trigger
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
-- Remove the former owner grant without changing customer move records.
delete from private.portal_owner where user_id not in (
  select id from auth.users where lower(email)='relocating@haulbrosmoving.com' and email_confirmed_at is not null
);
insert into private.portal_owner(singleton,user_id)
  select true,id from auth.users where lower(email)='relocating@haulbrosmoving.com' and email_confirmed_at is not null
  on conflict(singleton) do nothing;

-- 202611220006_itemized_estimates.sql
create function private.valid_move_estimate(q jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare k text; s jsonb;
begin
 if jsonb_typeof(q) is distinct from 'object' or octet_length(q::text)>50000 then return false;end if;
 if q='{}'::jsonb then return true;end if;
 for k in select unnest(array['movers','trucks','hours_low','hours_high','hourly_rate_cents','package_cents','package_hours']) loop
  if q->k is not null and q->k<>'null'::jsonb then
   if jsonb_typeof(q->k)<>'number' or (q->>k)::numeric<0 or (q->>k)::numeric>100000000 then return false;end if;
   if k in ('movers','trucks','hourly_rate_cents','package_cents') and trunc((q->>k)::numeric)<>(q->>k)::numeric then return false;end if;
  end if;
 end loop;
 if (q->>'hours_high')::numeric<(q->>'hours_low')::numeric then return false;end if;
 if coalesce((q->>'movers')::numeric,0)>100 or coalesce((q->>'trucks')::numeric,0)>100 or coalesce((q->>'hours_high')::numeric,0)>1000 then return false;end if;
 if jsonb_typeof(q->'services') is distinct from 'array' or jsonb_array_length(q->'services')>50 then return false;end if;
 for s in select value from jsonb_array_elements(q->'services') loop
  if jsonb_typeof(s) is distinct from 'object' or length(trim(coalesce(s->>'name','')))=0 or length(s->>'name')>200 or length(coalesce(s->>'unit',''))>100 then return false;end if;
  if jsonb_typeof(s->'quantity') is distinct from 'number' or (s->>'quantity')::numeric<=0 or (s->>'quantity')::numeric>100000 then return false;end if;
  if s->'unit_price_cents' is distinct from 'null'::jsonb then
   if jsonb_typeof(s->'unit_price_cents') is distinct from 'number' or (s->>'unit_price_cents')::numeric<0 or (s->>'unit_price_cents')::numeric>100000000 or trunc((s->>'unit_price_cents')::numeric)<>(s->>'unit_price_cents')::numeric then return false;end if;
  end if;
 end loop;
 return true;
exception when others then return false;
end;
$$;
revoke all on function private.valid_move_estimate(jsonb) from public,anon;
grant execute on function private.valid_move_estimate(jsonb) to authenticated;
alter table public.customer_moves add column estimate_details jsonb not null default '{}'::jsonb check(private.valid_move_estimate(estimate_details));
-- Make immutable ownership checks null-safe for profiles without a Google account.
create or replace function private.audit_move_update() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not public.portal_is_owner() then raise exception 'Owner access required';end if;
 if new.id is distinct from old.id or new.customer_id is distinct from old.customer_id or new.request_id is distinct from old.request_id or new.created_at is distinct from old.created_at then raise exception 'Move identity cannot be changed';end if;
 new.updated_at=now();
 insert into private.move_audit(move_id,edited_by,previous_record,new_record) values(old.id,auth.uid(),to_jsonb(old),to_jsonb(new));
 return new;
end;
$$;

-- 202611220007_owner_code_replacement.sql
create function public.replace_customer_access_code(p_move_id uuid,p_updated_at timestamptz,p_code text) returns setof public.customer_moves
language plpgsql security definer set search_path='' as $$
declare m public.customer_moves; v_phone text;
begin
 if not public.portal_is_owner() then raise exception 'Owner access required';end if;
 if p_code is null or p_code !~ '^[a-f0-9]{32}$' then raise exception 'Invalid code';end if;
 select * into m from public.customer_moves where id=p_move_id for update;
 if not found or m.updated_at is distinct from p_updated_at then return;end if;
 v_phone=regexp_replace(coalesce(m.customer_details->>'phone',''),'[^0-9]','','g');
 if length(v_phone)=11 and left(v_phone,1)='1' then v_phone=substr(v_phone,2);end if;
 if v_phone !~ '^[0-9]{10}$' then raise exception 'Save a valid customer phone number first';end if;
 insert into private.move_access(move_id,request_id,phone,code_hash) values(m.id,m.request_id,v_phone,sha256(convert_to(p_code,'UTF8')))
 on conflict(move_id) do update set phone=excluded.phone,code_hash=excluded.code_hash;
 return query update public.customer_moves set updated_at=now() where id=m.id returning *;
end;
$$;
revoke all on function public.replace_customer_access_code(uuid,timestamptz,text) from public,anon;
grant execute on function public.replace_customer_access_code(uuid,timestamptz,text) to authenticated;
commit;
