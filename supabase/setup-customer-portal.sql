-- Fresh-project setup. Current sole owner: sayedmusawer0797@gmail.com
-- Project: pslyefpxaeqwggsxnbnl
-- Run ONCE; the whole setup is atomic. Do not run on the configured live database.
begin;
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
commit;
