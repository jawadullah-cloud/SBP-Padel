(()=>{
  'use strict';
  if(window.__SBPAuthEnhancements)return;window.__SBPAuthEnhancements=true;
  const API=()=>(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');

  // The Android shell opens auth-preview.html on every cold start. If this
  // WebView already has a saved access token, hand control straight back to
  // the player app. index/player-live will validate the token with /auth/me
  // and return here only if it has expired or is invalid.
  if(localStorage.getItem('sbpPadelAccessToken')){
    location.replace('./');
    return;
  }

  const phone=document.querySelector('.phone');
  const signin=document.getElementById('signin');
  const signup=document.getElementById('signup');
  if(!phone||!signin||!signup)return;

  const style=document.createElement('style');
  style.textContent=`
    .sbpPwWrap{position:relative;width:100%}.sbpPwWrap input{padding-right:48px!important}
    .sbpPwToggle{position:absolute;right:6px;bottom:5px;width:38px;height:38px;border:0;border-radius:10px;background:transparent;color:#9fb2aa;display:grid;place-items:center}
    .sbpPwToggle svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .sbpPwToggle.on{color:var(--brand)}
    .sbpPwRules{display:grid;grid-template-columns:1fr 1fr;gap:5px 8px;margin:4px 1px 2px}
    .sbpPwRule{display:flex;gap:5px;align-items:center;font-size:8px;color:#71847c;line-height:1.25}
    .sbpPwRule:before{content:'○';font-size:10px}.sbpPwRule.ok{color:#aee86b}.sbpPwRule.ok:before{content:'✓';font-weight:900}
    .sbpResetPanel{position:absolute;z-index:7;left:10px;right:10px;bottom:10px;border:1px solid rgba(255,255,255,.11);border-radius:25px;background:linear-gradient(180deg,rgba(11,30,23,.96),rgba(4,17,12,.995));backdrop-filter:blur(22px);box-shadow:0 -18px 50px #0006;padding:22px 16px 18px;overflow:auto}
    .sbpResetIntro{font-size:10px;color:#9aaba4;line-height:1.5;margin:0 0 15px}.sbpResetMessage{font-size:9px;line-height:1.45;color:#b9c7c1;margin:10px 0}.sbpResetError{color:#ffaaa0!important}
    .sbpOtp{letter-spacing:.38em;text-align:center;font-size:18px!important;font-weight:800!important}
    .sbpResetActions{display:grid;gap:8px;margin-top:14px}.sbpResetBack{border:0;background:none;color:#9aaba4;font:800 9px var(--ui);padding:8px}
    .sbpResetPanel .field{margin-bottom:10px}
  `;document.head.appendChild(style);

  const rules=[
    ['len','8+ characters',v=>v.length>=8],['lower','Lowercase',v=>/[a-z]/.test(v)],
    ['upper','Uppercase',v=>/[A-Z]/.test(v)],['number','Number',v=>/\d/.test(v)],
    ['special','Special character',v=>/[^A-Za-z0-9]/.test(v)]
  ];
  const valid=v=>rules.every(([, ,test])=>test(v));
  function eyeSvg(open){return open?'<svg viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.6 10.7a2 2 0 0 0 2.7 2.7"/><path d="M9.9 4.3A10.6 10.6 0 0 1 12 4c5.4 0 9 5.2 9 5.2a13.8 13.8 0 0 1-3.1 3.6M6.2 6.2C4.2 7.5 3 9.2 3 9.2S6.6 14.5 12 14.5c1 0 1.9-.2 2.7-.5"/></svg>':'<svg viewBox="0 0 24 24"><path d="M3 12s3.6-5.5 9-5.5S21 12 21 12s-3.6 5.5-9 5.5S3 12 3 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>'}
  function enhancePassword(input,{checklist=false}={}){
    if(!input||input.dataset.sbpPw)return;input.dataset.sbpPw='1';
    const parent=input.parentElement;const wrap=document.createElement('div');wrap.className='sbpPwWrap';parent.insertBefore(wrap,input);wrap.appendChild(input);
    const toggle=document.createElement('button');toggle.type='button';toggle.className='sbpPwToggle';toggle.setAttribute('aria-label','Show password');toggle.innerHTML=eyeSvg(false);wrap.appendChild(toggle);
    toggle.onclick=e=>{e.preventDefault();const open=input.type==='password';input.type=open?'text':'password';toggle.classList.toggle('on',open);toggle.setAttribute('aria-label',open?'Hide password':'Show password');toggle.innerHTML=eyeSvg(open);input.focus({preventScroll:true})};
    if(checklist){const list=document.createElement('div');list.className='sbpPwRules';list.innerHTML=rules.map(([key,label])=>`<div class="sbpPwRule" data-rule="${key}">${label}</div>`).join('');wrap.after(list);const sync=()=>rules.forEach(([key,,test])=>list.querySelector(`[data-rule="${key}"]`)?.classList.toggle('ok',test(input.value)));input.addEventListener('input',sync);sync();}
  }

  const signPw=signin.querySelector('input[type="password"]');
  const signupPw=signup.querySelector('input[type="password"]');
  enhancePassword(signPw);enhancePassword(signupPw,{checklist:true});
  const signupSubmit=signup.querySelector('[data-go="done"]');
  signupSubmit?.addEventListener('click',e=>{if(valid(signupPw?.value||''))return;e.preventDefault();e.stopImmediatePropagation();signupPw?.focus();signupPw?.dispatchEvent(new Event('input'));},true);

  function activate(id){document.querySelectorAll('.phone>.screen').forEach(s=>s.classList.toggle('active',s.id===id))}
  const reset=document.createElement('section');reset.className='screen auth';reset.id='forgotPassword';reset.innerHTML=`<div class="authPhoto"></div><div class="authTop"><button class="back" type="button" data-reset-back="signin">←</button><img class="logo miniLogo" src="https://pbs.twimg.com/profile_images/1962396286369591296/htkHxnrk_400x400.jpg" alt="Sports Board Punjab"></div><div class="authHeadline"><div class="eyebrow">ACCOUNT RECOVERY</div><h2>Reset your<br>password.</h2><p>We'll send a six-digit verification code to your registered email address.</p></div><div class="sbpResetPanel"><div id="sbpResetRequest"><div class="panelTitle"><h3>Forgot password</h3><span>EMAIL OTP</span></div><p class="sbpResetIntro">Enter the email address linked to your SBP Padel account.</p><div class="field"><label>Email address</label><input id="sbpResetEmail" type="email" autocomplete="email" placeholder="name@email.com"></div><div class="sbpResetActions"><button class="primary" id="sbpSendOtp" type="button">SEND RESET CODE</button></div><p class="sbpResetMessage" id="sbpResetRequestMsg"></p></div><div id="sbpResetVerify" hidden><div class="panelTitle"><h3>Enter reset code</h3><span>10 MINUTES</span></div><p class="sbpResetIntro">Enter the six-digit code sent to <b id="sbpResetEmailLabel"></b>, then choose your new password.</p><div class="field"><label>Verification code</label><input class="sbpOtp" id="sbpResetOtp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000"></div><div class="field"><label>New password</label><input id="sbpResetPassword" type="password" autocomplete="new-password" placeholder="Create a strong password"></div><div class="sbpResetActions"><button class="primary" id="sbpResetSubmit" type="button">RESET PASSWORD</button><button class="sbpResetBack" id="sbpResetResend" type="button">Send a new code</button></div><p class="sbpResetMessage" id="sbpResetVerifyMsg"></p></div></div>`;
  phone.appendChild(reset);
  const newPw=reset.querySelector('#sbpResetPassword');enhancePassword(newPw,{checklist:true});
  document.querySelectorAll('[data-reset-back]').forEach(b=>b.onclick=()=>activate(b.dataset.resetBack));

  const forgot=signin.querySelector('.row .link');if(forgot){forgot.type='button';forgot.onclick=e=>{e.preventDefault();activate('forgotPassword');setTimeout(()=>reset.querySelector('#sbpResetEmail')?.focus(),100)}}
  let challenge='';
  const requestBox=reset.querySelector('#sbpResetRequest'),verifyBox=reset.querySelector('#sbpResetVerify');
  const requestMsg=reset.querySelector('#sbpResetRequestMsg'),verifyMsg=reset.querySelector('#sbpResetVerifyMsg');
  async function post(path,body){const res=await fetch(API()+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});let data={};try{data=await res.json()}catch{}if(!res.ok)throw new Error(data.detail||`Request failed (${res.status})`);return data}
  reset.querySelector('#sbpSendOtp').onclick=async()=>{const email=reset.querySelector('#sbpResetEmail').value.trim();if(!email||!email.includes('@')){requestMsg.textContent='Enter a valid email address.';requestMsg.classList.add('sbpResetError');return}const btn=reset.querySelector('#sbpSendOtp');btn.disabled=true;btn.textContent='SENDING…';requestMsg.textContent='';try{const data=await post('/auth/forgot-password',{email});challenge=data.challenge;requestBox.hidden=true;verifyBox.hidden=false;reset.querySelector('#sbpResetEmailLabel').textContent=email;if(data.delivery==='development-console')verifyMsg.textContent='Development mode: the code is printed in the backend PowerShell window.';setTimeout(()=>reset.querySelector('#sbpResetOtp').focus(),80)}catch(err){requestMsg.textContent=err.message;requestMsg.classList.add('sbpResetError')}finally{btn.disabled=false;btn.textContent='SEND RESET CODE'}};
  reset.querySelector('#sbpResetResend').onclick=()=>{challenge='';verifyBox.hidden=true;requestBox.hidden=false;verifyMsg.textContent=''};
  reset.querySelector('#sbpResetSubmit').onclick=async()=>{const otp=reset.querySelector('#sbpResetOtp').value.replace(/\D/g,'');const password=newPw.value;if(otp.length!==6){verifyMsg.textContent='Enter the six-digit code from your email.';verifyMsg.classList.add('sbpResetError');return}if(!valid(password)){verifyMsg.textContent='Complete all password requirements above.';verifyMsg.classList.add('sbpResetError');newPw.focus();return}const btn=reset.querySelector('#sbpResetSubmit');btn.disabled=true;btn.textContent='UPDATING…';try{await post('/auth/reset-password',{challenge,otp,new_password:password});verifyMsg.classList.remove('sbpResetError');verifyMsg.textContent='Password updated. You can sign in with your new password.';setTimeout(()=>{activate('signin');signPw?.focus()},850)}catch(err){verifyMsg.textContent=err.message;verifyMsg.classList.add('sbpResetError')}finally{btn.disabled=false;btn.textContent='RESET PASSWORD'}};
})();
