begin;
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
