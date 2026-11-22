begin;
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
commit;
