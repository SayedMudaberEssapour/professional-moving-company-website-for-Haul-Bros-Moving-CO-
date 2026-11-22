const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/azizullahessapour/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.PORTAL_TEST_URL||'http://127.0.0.1:8765';
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const context=await b.newContext({viewport:{width:1440,height:1000}});
 const p=await context.newPage();
 let email='',nextIdentity='customer@example.com',owner=false,patch=null,created=null,notifications=0,conflict=false,exchanges=0;
 const sample={id:'10000000-0000-0000-0000-000000000001',customer_id:'20000000-0000-0000-0000-000000000002',created_at:'2026-11-22T10:00:00Z',updated_at:'2026-11-22T10:00:00Z',customer_details:{name:'Sample Customer',email:'customer@example.com',phone:'5715550100',service_date:'2026-12-01',moving_from:'Woodbridge',moving_to:'Fairfax',service_type:'Local Moving',notes:'Fragile items'},inventory:[{room:'Living room',items:[{item:'Sofa',quantity:1,cubic_feet_each:65}]}],planning_estimate:{item_count:1,approximate_cubic_feet:65,suggested_movers:2,trucks:1,estimated_hours:[2,3],planning_cost:[395,554],custom_quote_required:false},move_status:'Review pending',confirmed_price_cents:100000,deposit_due_cents:10000,deposit_paid_cents:10000,deposit_instructions:'Use the agreed deposit method.',moving_instructions:'Reserve the loading dock.',customer_notes:''};
 await p.context().route('**/assets/customer-portal-config.js',route=>route.fulfill({contentType:'application/javascript',body:'window.HaulBrosPortalConfig={enabled:true,url:"https://test-project.supabase.co",publishableKey:"public-test-key"};'}));
 await p.context().route('https://test-project.supabase.co/**',async route=>{
  const request=route.request(),url=new URL(request.url()),data=request.postDataJSON();let body={};
  if(url.pathname.endsWith('/authorize')){
   assert.equal(url.searchParams.get('provider'),'google');assert.equal(url.searchParams.get('code_challenge_method'),'s256');assert.ok(url.searchParams.get('code_challenge').length>=43);
   await p.evaluate(()=>window.postMessage({type:'haulbros-google-auth',code:'forged'},location.origin));
   const callback=new URL(url.searchParams.get('redirect_to'));callback.searchParams.set('code','test-code');
   await route.fulfill({status:302,headers:{location:callback.href},body:''});return;
  }else if(url.pathname.endsWith('/token')){
   assert.equal(url.searchParams.get('grant_type'),'pkce');assert.equal(data.auth_code,'test-code');assert.ok(data.code_verifier.length>=43);exchanges++;email=nextIdentity;body={access_token:'test-session',refresh_token:'test-refresh',expires_in:3600,user:{email}};
  }
  else if(url.pathname.endsWith('/portal_is_owner')){owner=email==='relocating@haulbrosmoving.com';body=owner;}
  else if(url.pathname.endsWith('/read_guest_move')){body=data.p_code===created?.p_code&&data.p_phone.replace(/\D/g,'').endsWith('5715550100')?[sample]:[];}
  else if(url.pathname.endsWith('/create_guest_move')){created=data;body=sample.id;assert.match(data.p_code,/^[a-f0-9]{32}$/);assert.ok(!request.headers().authorization);}
  else if(url.pathname==='/rest/v1/customer_moves'&&request.method()==='PATCH'){
   assert.equal(owner,true);assert.equal(url.searchParams.get('updated_at'),'eq.'+sample.updated_at);patch=data;Object.assign(sample,data);body=conflict?[]:[sample];
  }else if(url.pathname==='/rest/v1/customer_moves')body=[sample];
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await p.route('https://formspree.io/**',route=>{notifications++;return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
 async function login(value){nextIdentity=value;await p.locator('#googleSignIn').click();await p.locator('#workspace').waitFor({state:'visible'});await p.getByText('Reserve the loading dock.',{exact:true}).waitFor();}
 await p.goto(base+'/customer-portal/',{waitUntil:'networkidle'});await login('customer@example.com');
 assert.equal(await p.getByRole('button',{name:'Edit Customer Record',exact:true}).count(),0);assert.equal(await p.locator('#ownerEdit').count(),0);assert.ok((await p.locator('#moveDetail').innerText()).includes('$1,000.00'));
 await p.locator('#signOut').click();await p.locator('#signIn').waitFor({state:'visible'});await login('relocating@haulbrosmoving.com');
 await p.getByRole('button',{name:'Edit Customer Record',exact:true}).click();await p.locator('[name=confirmed_price_cents]').fill('1200');await p.locator('[name=deposit_paid_cents]').fill('150');await p.locator('[name=moving_instructions]').fill('Owner updated instructions');await p.getByRole('button',{name:'Save Changes',exact:true}).click();await p.getByText('Changes saved.',{exact:false}).waitFor();assert.equal(patch.confirmed_price_cents,120000);assert.equal(patch.deposit_paid_cents,15000);assert.equal(patch.moving_instructions,'Owner updated instructions');
 for(const width of [1440,390,320]){await p.setViewportSize({width,height:1000});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'portal overflow '+width);}
 await p.setViewportSize({width:1440,height:1000});assert.equal(await p.locator('header').count(),1);await p.getByText('Pricing & deposit',{exact:true}).scrollIntoViewIfNeeded();await p.waitForTimeout(100);await p.screenshot({path:'/tmp/portal-owner-pricing.png',fullPage:false});
 // A stale save returns no updated record: keep unsaved changes and report failure.
 await p.getByRole('button',{name:'Edit Customer Record',exact:true}).click();conflict=true;await p.getByRole('button',{name:'Save Changes',exact:true}).click();await p.getByText('This record changed or could not be saved.',{exact:false}).waitFor();assert.equal(await p.locator('#ownerEdit').count(),1);await p.getByRole('button',{name:'Cancel',exact:true}).click();conflict=false;
 await p.goto(base+'/moving-inventory/',{waitUntil:'networkidle'});
 for(const [id,value] of Object.entries({name:'Sample Customer',email:'customer@example.com',phone:'5715550100',date:'2026-12-01',pickup:'Woodbridge'}))await p.locator('#'+id).fill(value);
 await p.locator('#rooms summary').first().click();await p.getByLabel('Living room: Sofa quantity',{exact:true}).fill('1');
 nextIdentity='customer@example.com';const profilePopup=p.waitForEvent('popup');await p.locator('#sendPlan').click();const profilePage=await profilePopup;await p.getByText('Your private move profile is ready.',{exact:false}).waitFor();assert.ok(created.p_request_id);assert.equal(created.p_submission.inventory[0].items[0].item,'Sofa');assert.equal(notifications,1);assert.equal(exchanges,2);
 await profilePage.waitForURL('**/customer-portal/?move=*');await profilePage.locator('#workspace').waitFor({state:'visible'});
 assert.equal(await profilePage.locator('#googleSignIn').isVisible(),false);
 assert.equal(await profilePage.getByRole('button',{name:'Edit Customer Record',exact:true}).count(),0);
 assert.ok((await profilePage.locator('#moveDetail').innerText()).includes('26-foot trucks'));
 assert.ok((await profilePage.locator('#moveDetail').innerText()).includes(created.p_code.match(/.{1,4}/g).join('-')));
 const headings=await profilePage.locator('#moveDetail h3').allTextContents();assert.ok(headings.indexOf('Your inventory')<headings.indexOf('Estimated crew, truck & moving time'));assert.ok(headings.indexOf('Estimated crew, truck & moving time')<headings.indexOf('Pricing & deposit'));
 assert.equal(new URL(profilePage.url()).searchParams.get('move'),sample.id);
 await profilePage.setViewportSize({width:390,height:1000});assert.ok(await profilePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await profilePage.screenshot({path:'/tmp/customer-profile-mobile.png',fullPage:true});

 await p.locator('#sendPlan').click();assert.equal(notifications,1);
 await p.setViewportSize({width:390,height:1000});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await profilePage.evaluate(()=>{if(window.opener.HaulBrosPortal.claimProfileSession(window,new URLSearchParams(location.search).get('move'))!==null)throw new Error('Session transfer was reusable');});
 await p.close();assert.ok(await profilePage.evaluate(async()=>!!await window.HaulBrosPortal.getMove(new URLSearchParams(location.search).get('move'))));
 const returning=await context.newPage();await returning.goto(base+'/customer-portal/');
 await returning.locator('#customerCodeLogin [name="phone"]').fill('5715550100');await returning.locator('#customerCodeLogin [name="code"]').fill('wrong-code');await returning.locator('#customerCodeLogin button').click();await returning.getByText('Phone number or access code was not recognized.',{exact:false}).waitFor();
 await returning.locator('#customerCodeLogin [name="code"]').fill(created.p_code.match(/.{1,4}/g).join('-'));await returning.locator('#customerCodeLogin button').click();await returning.locator('#workspace').waitFor({state:'visible'});assert.equal(await returning.locator('#ownerEdit').count(),0);
 const quote=await context.newPage();await quote.route('https://formspree.io/**',route=>{notifications++;return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});await quote.goto(base+'/');
 await quote.locator('#blog-name').fill('Sample Customer');await quote.locator('#blog-phone').fill('5715550100');await quote.locator('#blog-email').fill('customer@example.com');await quote.locator('#blog-service_date').fill('2026-12-01');await quote.locator('#blog-moving_from').fill('Woodbridge');await quote.locator('#blog-moving_to').fill('Fairfax');await quote.locator('#hero-service_type').selectOption({label:'Local Moving'});await quote.locator('#hero-home_size').selectOption({label:'2 bedrooms'});
 const quotePopup=quote.waitForEvent('popup');await quote.locator('.blog-estimate-form button[type="submit"]').click();const quoteProfile=await quotePopup;await quoteProfile.waitForURL('**/customer-portal/?move=*');await quoteProfile.locator('#workspace').waitFor({state:'visible'});await quote.locator('.blog-form-status').filter({hasText:'Your profile is saved.'}).waitFor();assert.equal(created.p_submission.inventory.length,0);assert.equal(await quoteProfile.getByRole('button',{name:'Edit Customer Record',exact:true}).count(),0);
 console.log('PASS: customer read-only view, owner pricing/deposit/instruction edits, stale-save handling, responsive layout, Google PKCE sign-in, forged callback rejection, phone/code login, invalid-code rejection, quote-form and calculator profile creation and notification idempotency, automatic new-tab profile, one-use session handoff and requested section order. All services mocked; no real emails sent.');
 await b.close();
})().catch(error=>{console.error(error);process.exit(1)});
