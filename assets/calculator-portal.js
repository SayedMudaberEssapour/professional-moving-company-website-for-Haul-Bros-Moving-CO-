/* Preserve the moving plan in this tab while Google verifies the customer. */
(() => {
  const api=window.HaulBrosPortal;
  if(!api?.enabled)return;
  const form=document.getElementById('inventory'),button=document.getElementById('sendPlan');
  let profileTab=null;
  function reserveTab(){
    profileTab=window.open('about:blank','_blank');
    if(profileTab){profileTab.document.title='Preparing your move profile';profileTab.document.body.textContent='Preparing your private move profile…';}
    return profileTab;
  }
  function openProfile(moveId){
    if(!profileTab||profileTab.closed)return false;
    if(!api.prepareProfileSession(profileTab,moveId))return false;
    profileTab.location.href=new URL('../customer-portal/?move='+encodeURIComponent(moveId),location.href).href;
    profileTab.focus();return true;
  }

  window.HaulBrosCalculatorPortal=Object.freeze({
    async ensureIdentity(value){
      const normalized=value.trim().toLowerCase();
      if(api.email().toLowerCase()!==normalized)profileTab=await api.signInWithGoogle({keepOpen:true});
      else reserveTab();
      if(api.email().toLowerCase()!==normalized){
        const message='You signed in as '+api.email()+'. Use that email on your moving plan, or sign in with the matching Google account.';
        throw new Error(message);
      }
      return true;
    },
    async save(requestId,payload){return api.create(requestId,payload);},
    openProfile,
    openFromClick(moveId){reserveTab();return openProfile(moveId);},
    cancelProfile(){try{if(profileTab&&!profileTab.closed)profileTab.close();}catch(_){}profileTab=null;}

  });
  button.textContent='Sign in with Google & Send My Plan →';
  const intro=document.createElement('p');intro.textContent='Sign in with the Google account matching your email above. Your private move profile will contain your inventory and planning estimate. Only you and Haul Bros can view it; only Haul Bros can edit it. Pricing, deposits and instructions will be added after review.';button.before(intro);
  const link=document.createElement('a');link.href='../customer-portal/';link.textContent='Already submitted? Open My Move';form.querySelector('.calculator-submit').append(link);
})();
