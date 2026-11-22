begin;
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
commit;
