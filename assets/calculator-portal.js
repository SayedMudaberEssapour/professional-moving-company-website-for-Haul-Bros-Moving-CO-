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
      reserveTab();
      return true;
    },
    async save(requestId,payload){return api.createGuest(requestId,payload);},
    openProfile,
    openFromClick(moveId){reserveTab();return openProfile(moveId);},
    cancelProfile(){try{if(profileTab&&!profileTab.closed)profileTab.close();}catch(_){}profileTab=null;}

  });
  button.textContent='Create My Move Profile';
  const intro=document.createElement('p');intro.textContent='Submit your plan to receive a private profile and a unique access code. Save that code: use it with your phone number to return. Only Haul Bros can edit your record.';button.before(intro);
  const link=document.createElement('a');link.href='../customer-portal/';link.textContent='Already submitted? Open My Move';form.querySelector('.calculator-submit').append(link);
})();
