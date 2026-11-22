/* Loaded locally while the private backend is awaiting connection. */
(() => {
  const api=window.HaulBrosPortal;
  if(!api?.enabled)return;
  const form=document.getElementById('inventory'),button=document.getElementById('sendPlan');
  const panel=document.createElement('section');panel.className='portal-verification';panel.hidden=true;
  panel.innerHTML='<h3>Verify your email to create your private move profile</h3><p id="verifyEmailLabel"></p><label for="moveEmailCode">Code from your email</label><input id="moveEmailCode" inputmode="numeric" autocomplete="one-time-code" maxlength="10" pattern="[0-9]{6,10}" placeholder="Email code"><button type="button" id="verifyMoveEmail">Verify Email</button> <button type="button" id="resendMoveEmail">Send Another Code</button><p id="moveEmailStatus" role="status" aria-live="polite"></p>';
  button.after(panel);
  const code=panel.querySelector('#moveEmailCode'),feedback=panel.querySelector('#moveEmailStatus');
  let email='',sending=false;
  async function sendCode(value){if(sending)return;sending=true;try{await api.sendCode(value);email=value;panel.hidden=false;panel.querySelector('#verifyEmailLabel').textContent='Enter the one-time code sent to '+value+'. Then click Send My Moving Plan again. Your customer profile is view-only; Haul Bros manages changes.';feedback.textContent='Code sent. Check your inbox.';code.value='';code.focus();}finally{sending=false;}}
  panel.querySelector('#verifyMoveEmail').onclick=async()=>{const control=panel.querySelector('#verifyMoveEmail');if(!code.value.trim()||!code.reportValidity())return;control.disabled=true;try{if(document.getElementById('email').value.trim().toLowerCase()!==email)throw new Error('Your email changed. Send a new code for the updated address.');await api.verify(email,code.value.trim());panel.hidden=true;code.value='';document.getElementById('submitStatus').textContent='Email verified. Click Send My Moving Plan to create your private profile.';button.focus();}catch(e){feedback.textContent=e.message;}finally{control.disabled=false;}};
  panel.querySelector('#resendMoveEmail').onclick=async()=>{try{await sendCode(document.getElementById('email').value.trim().toLowerCase());}catch(e){feedback.textContent=e.message;}};
  window.HaulBrosCalculatorPortal=Object.freeze({
    async ensureIdentity(value){const normalized=value.trim().toLowerCase();if(api.email().toLowerCase()===normalized)return true;await sendCode(normalized);return false;},
    async save(requestId,payload){return api.create(requestId,payload);}
  });
  button.textContent='Create My Private Move Profile →';
  const intro=document.createElement('p');intro.textContent='After verifying your email and submitting, your private move profile will contain your inventory and planning estimate. Only you and Haul Bros can view it; only Haul Bros can edit it. Pricing, deposit details and instructions will be added after review.';button.before(intro);
})();
