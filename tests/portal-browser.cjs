const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/azizullahessapour/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.PORTAL_TEST_URL||'http://127.0.0.1:8765';
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const p=await b.newPage({viewport:{width:1440,height:1000}});
 let email='',owner=false,patch=null,created=null,notifications=0,conflict=false;
 const sample={id:'10000000-0000-0000-0000-000000000001',customer_id:'20000000-0000-0000-0000-000000000002',created_at:'2026-11-22T10:00:00Z',updated_at:'2026-11-22T10:00:00Z',customer_details:{name:'Sample Customer',email:'customer@example.com',phone:'5715550100',service_date:'2026-12-01',moving_from:'Woodbridge',moving_to:'Fairfax',service_type:'Local Moving',notes:'Fragile items'},inventory:[{room:'Living room',items:[{item:'Sofa',quantity:1,cubic_feet_each:65}]}],planning_estimate:{item_count:1,approximate_cubic_feet:65,suggested_movers:2,estimated_hours:[2,3],planning_cost:[395,554],custom_quote_required:false},move_status:'Review pending',confirmed_price_cents:100000,deposit_due_cents:10000,deposit_paid_cents:10000,deposit_instructions:'Use the agreed deposit method.',moving_instructions:'Reserve the loading dock.',customer_notes:''};
 await p.route('**/assets/customer-portal-config.js',route=>route.fulfill({contentType:'application/javascript',body:'window.HaulBrosPortalConfig={enabled:true,url:"https://test-project.supabase.co",publishableKey:"public-test-key"};'}));
 await p.route('https://test-project.supabase.co/**',async route=>{
  const request=route.request(),url=new URL(request.url()),data=request.postDataJSON();let body={};
  if(url.pathname.endsWith('/otp'))email=data.email;
  else if(url.pathname.endsWith('/verify'))body={access_token:'test-session',refresh_token:'test-refresh',expires_in:3600,user:{email}};
  else if(url.pathname.endsWith('/portal_is_owner')){owner=email==='owner@example.com';body=owner;}
  else if(url.pathname.endsWith('/create_customer_move')){created=data;body=sample.id;assert.equal(request.headers().authorization,'Bearer test-session');}
  else if(url.pathname==='/rest/v1/customer_moves'&&request.method()==='PATCH'){
   assert.equal(owner,true);assert.equal(url.searchParams.get('updated_at'),'eq.'+sample.updated_at);patch=data;Object.assign(sample,data);body=conflict?[]:[sample];
  }else if(url.pathname==='/rest/v1/customer_moves')body=[sample];
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await p.route('https://formspree.io/**',route=>{notifications++;return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
 async function login(value){await p.locator('#portalEmail').fill(value);await p.locator('#emailForm button').click();await p.locator('#portalCode').fill('123456');await p.locator('#codeForm button[type=submit]').click();await p.locator('#workspace').waitFor({state:'visible'});await p.getByText('Reserve the loading dock.',{exact:true}).waitFor();}
 await p.goto(base+'/customer-portal/',{waitUntil:'networkidle'});await login('customer@example.com');
 assert.equal(await p.getByRole('button',{name:'Edit Customer Record',exact:true}).count(),0);assert.equal(await p.locator('#ownerEdit').count(),0);assert.ok((await p.locator('#moveDetail').innerText()).includes('$1,000.00'));
 await p.locator('#signOut').click();await p.locator('#signIn').waitFor({state:'visible'});await login('owner@example.com');
 await p.getByRole('button',{name:'Edit Customer Record',exact:true}).click();await p.locator('[name=confirmed_price_cents]').fill('1200');await p.locator('[name=deposit_paid_cents]').fill('150');await p.locator('[name=moving_instructions]').fill('Owner updated instructions');await p.getByRole('button',{name:'Save Changes',exact:true}).click();await p.getByText('Changes saved.',{exact:false}).waitFor();assert.equal(patch.confirmed_price_cents,120000);assert.equal(patch.deposit_paid_cents,15000);assert.equal(patch.moving_instructions,'Owner updated instructions');
 for(const width of [1440,390,320]){await p.setViewportSize({width,height:1000});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'portal overflow '+width);}
 await p.setViewportSize({width:1440,height:1000});assert.equal(await p.locator('header').count(),1);await p.getByText('Pricing & deposit',{exact:true}).scrollIntoViewIfNeeded();await p.waitForTimeout(100);await p.screenshot({path:'/tmp/portal-owner-pricing.png',fullPage:false});
 // A stale save returns no updated record: keep unsaved changes and report failure.
 await p.getByRole('button',{name:'Edit Customer Record',exact:true}).click();conflict=true;await p.getByRole('button',{name:'Save Changes',exact:true}).click();await p.getByText('This record changed or could not be saved.',{exact:false}).waitFor();assert.equal(await p.locator('#ownerEdit').count(),1);await p.getByRole('button',{name:'Cancel',exact:true}).click();conflict=false;
 await p.goto(base+'/moving-inventory/',{waitUntil:'networkidle'});
 for(const [id,value] of Object.entries({name:'Sample Customer',email:'customer@example.com',phone:'5715550100',date:'2026-12-01',pickup:'Woodbridge'}))await p.locator('#'+id).fill(value);
 await p.locator('#rooms summary').first().click();await p.getByLabel('Living room: Sofa quantity',{exact:true}).fill('1');
 await p.locator('#sendPlan').click();await p.locator('.portal-verification').waitFor({state:'visible'});assert.equal(created,null);assert.equal(notifications,0);
 await p.locator('#moveEmailCode').fill('123456');await p.locator('#verifyMoveEmail').click();await p.getByText('Email verified.',{exact:false}).waitFor();await p.locator('#sendPlan').click();await p.getByText('Your private move profile is ready.',{exact:false}).waitFor();assert.ok(created.p_request_id);assert.equal(created.p_submission.inventory[0].items[0].item,'Sofa');assert.equal(notifications,1);
 await p.locator('#sendPlan').click();assert.equal(notifications,1);
 await p.setViewportSize({width:390,height:1000});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('PASS: customer read-only view, owner pricing/deposit/instruction edits, stale-save handling, responsive layout, OTP-gated profile creation and notification idempotency. All services mocked; no real emails sent.');
 await b.close();
})().catch(error=>{console.error(error);process.exit(1)});
