/* Capture quote submissions once, before legacy email-only handlers. */
(() => {
 const api=window.HaulBrosPortal;
 if(!api?.enabled)return;
 let sending=false;
 const attempts=new WeakMap();
 for(const form of document.querySelectorAll('form[action*="formspree.io"]')){
  if(form.id==='inventory')continue;
  const note=document.createElement('p');note.textContent='Submitting creates your private move profile. Save the unique code shown afterward to return using your phone number.';
  form.querySelector('[type="submit"]')?.before(note);
 }
 document.addEventListener('submit',async event=>{
  const form=event.target;
  if(!(form instanceof HTMLFormElement)||!form.action.includes('formspree.io')||form.id==='inventory')return;
  event.preventDefault();event.stopImmediatePropagation();
  if(!form.reportValidity()||sending)return;
  if(new FormData(form).get('_gotcha'))return;
  sending=true;
  const button=form.querySelector('[type="submit"]'),label=button?.textContent;
  if(button){button.disabled=true;button.textContent='Creating your profile…';}
  let feedback=form.querySelector('[role="status"]');
  if(!feedback){feedback=document.createElement('p');feedback.setAttribute('role','status');form.append(feedback);}
  const tab=window.open('about:blank','_blank');
  if(tab)tab.document.body.textContent='Preparing your private move profile…';
  const payload=new FormData(form);payload.set('inventory','[]');payload.set('planning_estimate','{}');
  payload.set('notes',payload.get('message')||payload.get('details')||payload.get('notes')||'');
  const snapshot=JSON.stringify([...payload]);let attempt=attempts.get(form);
  if(!attempt||attempt.snapshot!==snapshot){attempt={snapshot,id:crypto.randomUUID()};attempts.set(form,attempt);}
  let id;
  try{
   id=await api.createGuest(attempt.id,payload);
   const url='/customer-portal/?move='+encodeURIComponent(id);
   if(tab&&api.prepareProfileSession(tab,id)){tab.location.href=url;tab.focus();}
   feedback.textContent='Your profile is saved. Save this private access code: '+api.guestCode().match(/.{1,4}/g).join('-')+'. Use it with your phone number to return. ';
   const link=document.createElement('a');link.href=url;link.textContent='Open My Profile';link.onclick=e=>{const target=window.open('about:blank','_blank');if(target&&api.prepareProfileSession(target,id)){e.preventDefault();target.location.href=url;}};feedback.append(link);
   payload.set('profile_reference',id);payload.set('owner_portal','https://www.haulbrosmoving.com/customer-portal/');
   const response=await fetch(form.action,{method:'POST',body:payload,headers:{Accept:'application/json'}});
   if(!response.ok)throw new Error('notification');
  }catch(error){
   if(id){feedback.append(document.createTextNode(' The email notification failed, but Haul Bros can see your saved profile.'));}
   else{tab?.close();feedback.textContent='Your profile could not be saved. Please try again or call 571-899-1919.';}
  }finally{sending=false;if(button){button.disabled=false;button.textContent=label;}}
 },true);
})();
