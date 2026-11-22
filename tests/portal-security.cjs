/* Run with NODE_PATH pointing at a temporary @electric-sql/pglite installation. */
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
 await db.exec(readFileSync(path.join(__dirname,'../supabase/migrations/202611220001_private_move_portal.sql'),'utf8'));
 await db.exec(readFileSync(path.join(__dirname,'../supabase/migrations/202611220002_verified_owner_registration.sql'),'utf8'));
 const owner='00000000-0000-0000-0000-000000000001',alice='00000000-0000-0000-0000-000000000002',bob='00000000-0000-0000-0000-000000000003',unverified='00000000-0000-0000-0000-000000000004';
 for(const [id,email,confirmed] of [[owner,'relocating@haulbrosmoving.com',true],[alice,'alice@example.com',true],[bob,'bob@example.com',true],[unverified,'unverified@example.com',false]])await db.query('insert into auth.users values($1,$2,$3)',[id,email,confirmed?'2026-11-22':null]);
 await db.exec(readFileSync(path.join(__dirname,'../supabase/bootstrap-owner.sql'),'utf8'));
 async function as(id,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+role);}
 const submission={name:'Alice',email:'someone-else@example.com',phone:'5715550100',moving_from:'Woodbridge',inventory:[{room:'Living room',items:[{item:'Sofa',quantity:1}]}],planning_estimate:{item_count:1},confirmed_price_cents:1,deposit_paid_cents:100000,customer_id:owner,move_status:'Completed'};
 async function create(requestId='10000000-0000-0000-0000-000000000001'){return (await db.query('select public.create_customer_move($1,$2) as id',[requestId,submission])).rows[0].id;}
 await as(null,'anon');await assert.rejects(()=>db.query('select * from public.customer_moves'));await assert.rejects(()=>create());
 await as(unverified);await assert.rejects(()=>create());
 await as(alice);const id=await create();assert.equal(await create(),id);let row=(await db.query('select * from public.customer_moves')).rows[0];assert.equal(row.customer_id,alice);assert.equal(row.customer_details.email,'alice@example.com');assert.equal(row.confirmed_price_cents,null);assert.equal(row.deposit_paid_cents,0);assert.equal(row.move_status,'Review pending');
 assert.equal((await db.query("update public.customer_moves set confirmed_price_cents=1 where id=$1 returning id",[id])).rows.length,0);
 await assert.rejects(()=>db.query('delete from public.customer_moves where id=$1',[id]));
 await assert.rejects(()=>db.query("insert into public.customer_moves(customer_id,request_id,customer_details,inventory,planning_estimate) values($1,gen_random_uuid(),'{}','[]','{}')",[alice]));
 await assert.rejects(()=>db.query('update private.portal_owner set user_id=$1',[alice]));
 await as(bob);assert.equal((await db.query('select * from public.customer_moves where id=$1',[id])).rows.length,0);assert.equal((await db.query('update public.customer_moves set deposit_paid_cents=100 where id=$1 returning id',[id])).rows.length,0);await create('10000000-0000-0000-0000-000000000002');assert.equal((await db.query('select * from public.customer_moves')).rows.length,1);
 await as(owner);assert.equal((await db.query('select public.portal_is_owner() as owner')).rows[0].owner,true);assert.equal((await db.query('select * from public.customer_moves')).rows.length,2);
 await db.query("update public.customer_moves set confirmed_price_cents=100000,deposit_due_cents=10000,deposit_paid_cents=10000,moving_instructions='Use loading dock' where id=$1",[id]);
 await assert.rejects(()=>db.query('update public.customer_moves set customer_id=$1 where id=$2',[owner,id]));
 await as(alice);row=(await db.query('select * from public.customer_moves where id=$1',[id])).rows[0];assert.equal(row.confirmed_price_cents,100000);assert.equal(row.deposit_paid_cents,10000);assert.equal(row.moving_instructions,'Use loading dock');
 await assert.rejects(()=>db.query('select * from private.move_audit'));
 for(let n=2;n<=5;n++)await create('20000000-0000-0000-0000-'+String(n).padStart(12,'0'));
 await assert.rejects(()=>create('20000000-0000-0000-0000-000000000006'));
 await db.exec('reset role');assert.equal((await db.query('select count(*)::integer as count from private.move_audit')).rows[0].count,1);
 console.log('PASS: anonymous denial, verified identity, customer A/B isolation, owner-only edits, immutable ownership, forged-price protection, audit privacy, idempotency and daily limit.');
 await db.close();
})().catch(e=>{console.error(e);process.exit(1)});
