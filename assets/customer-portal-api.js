/* Verified email sessions live only in this tab's memory, never in browser storage. */
(() => {
  const config = window.HaulBrosPortalConfig || {};
  let session = null;
  const enabled = config.enabled === true && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url || '') && !!config.publishableKey;
  async function request(path, options = {}, authenticated = false) {
    if (!enabled) throw new Error('The private portal is not connected yet. Please call 571-899-1919.');
    if (authenticated && !session) throw new Error('Please sign in again.');
    if (authenticated && session.expires_at < Date.now() + 60000) {
      try {
        const refreshed = await request('/auth/v1/token?grant_type=refresh_token', {method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})});
        setSession(refreshed);
      } catch (_) { session = null; throw new Error('Your session expired. Sign in again.'); }
    }
    const response = await fetch(config.url + path, {
      ...options,
      headers:{apikey:config.publishableKey,'Content-Type':'application/json',...(authenticated ? {Authorization:'Bearer '+session.access_token} : {}),...options.headers},
      credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer', signal:AbortSignal.timeout(20000)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401) session = null;
      throw new Error(response.status === 429 ? 'Too many requests. Please wait before trying again.' : 'The request could not be completed. Check your sign-in and try again, or call 571-899-1919.');
    }
    return data;
  }
  function setSession(data) {
    if (!data?.access_token || !data?.user?.email) throw new Error('Sign-in could not be verified.');
    session = {...data,expires_at:Date.now() + Number(data.expires_in || 3600)*1000};
  }
  window.HaulBrosPortal = Object.freeze({
    enabled,
    email:() => session?.user?.email || '',
    async sendCode(email) { return request('/auth/v1/otp',{method:'POST',body:JSON.stringify({email,create_user:true})}); },
    async verify(email,token) { setSession(await request('/auth/v1/verify',{method:'POST',body:JSON.stringify({email,token,type:'email'})})); },
    async signOut() { try { if (session) await request('/auth/v1/logout',{method:'POST'},true); } finally { session=null; } },
    async isOwner() { return request('/rest/v1/rpc/portal_is_owner',{method:'POST',body:'{}'},true); },
    async list(offset=0) { return request('/rest/v1/customer_moves?select=*&order=created_at.desc&limit=50&offset='+offset,{},true); },
    async create(id,formData) {
      if (formData.get('email')?.trim().toLowerCase() !== session?.user?.email?.toLowerCase()) throw new Error('Sign in with the email on your moving plan.');
      const submission = Object.fromEntries(formData);
      submission.inventory=JSON.parse(submission.inventory); submission.planning_estimate=JSON.parse(submission.planning_estimate);
      const result=await request('/rest/v1/rpc/create_customer_move',{method:'POST',body:JSON.stringify({p_request_id:id,p_submission:submission})},true);
      if(typeof result!=='string'||!/^[-a-f0-9]{36}$/i.test(result))throw new Error('Your profile could not be confirmed. Try submitting again.');
      return result;
    },
    async update(id,updatedAt,changes) {
      // Backend RLS enforces owner access even if someone bypasses this UI.
      const allowed=['customer_details','inventory','planning_estimate','move_status','confirmed_price_cents','deposit_due_cents','deposit_paid_cents','deposit_instructions','moving_instructions','customer_notes'];
      const payload=Object.fromEntries(Object.entries(changes).filter(([key]) => allowed.includes(key)));
      const rows=await request('/rest/v1/customer_moves?id=eq.'+encodeURIComponent(id)+'&updated_at=eq.'+encodeURIComponent(updatedAt),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)},true);
      if (!rows?.length) throw new Error('This record changed or could not be saved. Refresh before editing again.');
      return rows[0];
    }
  });
})();
