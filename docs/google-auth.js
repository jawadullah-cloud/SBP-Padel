(()=>{
  'use strict';
  if(window.__SBPGoogleAuth)return;window.__SBPGoogleAuth=true;
  const signin=document.getElementById('signin');
  const social=signin?.querySelector('.social');
  if(!signin||!social)return;

  // Google OAuth is intentionally deferred for the current release. Keep the
  // implementation/configuration in the repository, but do not expose a dead
  // or partially configured control to players.
  social.hidden=true;
  social.setAttribute('aria-hidden','true');
  social.disabled=true;
  const divider=social.previousElementSibling;
  if(divider?.classList?.contains('divider')){
    divider.hidden=true;
    divider.setAttribute('aria-hidden','true');
  }
})();
