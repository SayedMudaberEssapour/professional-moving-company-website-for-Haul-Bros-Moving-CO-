(() => {
  const parameters=new URLSearchParams(location.search);
  const code=parameters.get('code'),error=parameters.get('error');
  // Remove the one-time code from the visible URL and browser history immediately.
  history.replaceState(null,'',location.pathname);
  const status=document.getElementById('callbackStatus');
  if(!window.opener){status.textContent='Return to the Haul Bros tab and try Google sign-in again. This callback must be opened by the website.';return;}
  if(!code||error){window.opener.postMessage({type:'haulbros-google-auth',error:true},location.origin);status.textContent='Sign-in was not completed. Return to the Haul Bros tab and try again.';return;}
  // Never place access tokens in links, postMessage payloads or browser storage.
  window.opener.postMessage({type:'haulbros-google-auth',code},location.origin);
  status.textContent='Finishing sign-in. You can return to the Haul Bros tab.';
})();
