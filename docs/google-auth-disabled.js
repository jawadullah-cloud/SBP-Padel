(()=>{
  'use strict';
  if(window.__SBPGoogleAuthDisabled)return;window.__SBPGoogleAuthDisabled=true;
  const signin=document.getElementById('signin');
  const social=signin?.querySelector('.social');
  if(!signin||!social)return;

  // Google OAuth is intentionally deferred. Keep the login surface explicit:
  // do not expose a dead or partially configured Google sign-in control.
  social.hidden=true;
  social.setAttribute('aria-hidden','true');
  social.disabled=true;
  const divider=social.previousElementSibling;
  if(divider?.classList?.contains('divider')){
    divider.hidden=true;
    divider.setAttribute('aria-hidden','true');
  }
})();
