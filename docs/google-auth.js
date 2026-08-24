(()=>{
  'use strict';
  if(window.__SBPGoogleAuth)return;window.__SBPGoogleAuth=true;
  const signin=document.getElementById('signin');
  const social=signin?.querySelector('.social');
  if(!signin||!social)return;
  const API=()=>(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  let clientId='';
  let busy=false;

  const style=document.createElement('style');
  style.textContent=`
    .sbpGoogleWrap{width:100%;min-height:43px;display:flex;justify-content:center;align-items:center}
    .sbpGoogleWrap>div{width:100%!important;display:flex!important;justify-content:center!important}
    .sbpGoogleMessage{font-size:8px;line-height:1.35;color:#8da099;text-align:center;margin-top:6px;min-height:11px}
    .social.sbpGoogleBusy{opacity:.65;pointer-events:none}
  `;
  document.head.appendChild(style);
  const msg=document.createElement('div');msg.className='sbpGoogleMessage';social.after(msg);

  function setMessage(text,bad=false){msg.textContent=text||'';msg.style.color=bad?'#ffaaa0':'#8da099'}
  async function exchange(credential){
    if(busy||!credential)return;busy=true;social.classList.add('sbpGoogleBusy');setMessage('Signing in with Google…');
    try{
      const res=await fetch(`${API()}/auth/google`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential})});
      let data={};try{data=await res.json()}catch{}
      if(!res.ok)throw new Error(data.detail||`Google sign-in failed (${res.status})`);
      localStorage.setItem('sbpPadelAccessToken',data.access_token);
      localStorage.setItem('sbpPadelUser',JSON.stringify(data.user||{}));
      setMessage('Signed in. Opening SBP Padel…');
      location.href='./';
    }catch(err){setMessage(err.message||'Google sign-in failed.',true)}
    finally{busy=false;social.classList.remove('sbpGoogleBusy')}
  }

  window.SBPGoogleNativeResult=credential=>exchange(String(credential||''));
  window.SBPGoogleNativeError=message=>{busy=false;social.classList.remove('sbpGoogleBusy');setMessage(String(message||'Google sign-in was cancelled.'),true)};

  function nativeAvailable(){return !!(window.SBPAndroid&&typeof window.SBPAndroid.googleSignIn==='function')}
  function setupNative(){
    social.textContent='Continue with Google';
    social.disabled=false;
    social.onclick=e=>{
      e.preventDefault();
      if(!clientId){setMessage('Google sign-in is not configured.',true);return}
      busy=true;social.classList.add('sbpGoogleBusy');setMessage('Opening Google account chooser…');
      try{window.SBPAndroid.googleSignIn(clientId)}catch(err){window.SBPGoogleNativeError(err?.message||'Could not open Google sign-in.')}
    };
  }

  function loadGoogleScript(){
    return new Promise((resolve,reject)=>{
      if(window.google?.accounts?.id){resolve();return}
      const existing=document.querySelector('script[data-sbp-google-gsi]');
      if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}
      const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;script.dataset.sbpGoogleGsi='1';script.onload=resolve;script.onerror=reject;document.head.appendChild(script);
    });
  }
  async function setupWeb(){
    try{
      await loadGoogleScript();
      const wrap=document.createElement('div');wrap.className='sbpGoogleWrap';social.replaceWith(wrap);
      window.google.accounts.id.initialize({client_id:clientId,callback:r=>exchange(r.credential),auto_select:false,cancel_on_tap_outside:true});
      window.google.accounts.id.renderButton(wrap,{theme:'outline',size:'large',shape:'rectangular',text:'continue_with',width:320,logo_alignment:'left'});
    }catch(err){social.disabled=true;social.textContent='Google sign-in unavailable';setMessage('Could not load Google sign-in.',true)}
  }

  (async()=>{
    try{
      const res=await fetch(`${API()}/auth/google/config`,{cache:'no-store'});const config=await res.json();
      clientId=config.client_id||'';
      if(!config.enabled||!clientId){social.disabled=true;social.textContent='Continue with Google';setMessage('Google sign-in needs a Google OAuth Client ID.');return}
      if(nativeAvailable())setupNative();else await setupWeb();
    }catch(err){social.disabled=true;setMessage('Google sign-in configuration could not be loaded.',true)}
  })();
})();
