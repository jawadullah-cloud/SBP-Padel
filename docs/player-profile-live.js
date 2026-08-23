(()=>{
  'use strict';
  if(window.__SBPPlayerProfileLive)return;
  window.__SBPPlayerProfileLive=true;
  const root=document.getElementById('profile');if(!root)return;
  const API=(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  const token=()=>localStorage.getItem('sbpPadelAccessToken')||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials=n=>String(n||'Player').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'P';
  const svg=paths=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  const icons={
    bookings:svg('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16"/><path d="m9 14 2 2 4-4"/>'),
    wallet:svg('<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v12H6.5A2.5 2.5 0 0 1 4 16.5z"/><path d="M4 8h14M15 12h5v4h-5a2 2 0 0 1 0-4z"/>'),
    payments:svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>'),
    players:svg('<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3.5 2.5-5.2 5.5-5.2s4.9 1.7 5.5 5.2"/><path d="M16 7.5a2.5 2.5 0 0 1 0 5M16 14c2.6.3 4 1.9 4.5 4.5"/>'),
    favourite:svg('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>'),
    notifications:svg('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>'),
    appearance:svg('<circle cx="12" cy="12" r="9"/><path d="M12 3v18M12 3a9 9 0 0 1 0 18"/>'),
    help:svg('<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 3.7 2c-1 .7-1.4 1.2-1.4 2.2M12 17h.01"/>'),
    logout:svg('<path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10"/>'),
    camera:svg('<path d="M8.5 6 10 4h4l1.5 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><circle cx="12" cy="12.5" r="3.5"/>')
  };
  const style=document.createElement('style');
  style.dataset.sbpProfileLive='1';
  style.textContent=`
    #profile .profileHead{display:grid!important;grid-template-columns:56px minmax(0,1fr)!important;align-items:center!important;gap:12px!important;padding:12px 16px 14px!important}
    #profile .profileAvatarButton{position:relative;width:56px;height:56px;border-radius:50%;border:2px solid var(--brand);padding:0;background:var(--surface2);color:var(--text);overflow:visible;display:grid;place-items:center;font-weight:800;font-size:13px;cursor:pointer}
    #profile .profileAvatarButton img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block}
    #profile .profileCameraBadge{position:absolute;right:-2px;bottom:-2px;width:22px;height:22px;border-radius:50%;background:var(--brand);color:#071006;border:3px solid var(--bg);display:grid;place-items:center}
    #profile .profileCameraBadge svg{width:11px;height:11px}
    #profile .profileHead h3{margin:0 0 3px!important}.profileIdentity p{margin:0!important}
    #profile .profilePhotoActions{display:flex;align-items:center;gap:8px;margin-top:5px;min-height:14px}
    #profile .profilePhotoHint,#profile .profilePhotoStatus,#profile .profileRemovePhoto{font-size:7px;color:var(--muted)}
    #profile .profileRemovePhoto{border:0;background:none;padding:0;color:var(--brand);cursor:pointer}
    #profile .profilePhotoStatus.error{color:#ff8b8b}
    #profile .menu button{display:grid!important;grid-template-columns:26px minmax(0,1fr) auto!important;align-items:center!important;gap:10px!important;text-align:left!important;min-height:52px!important;padding:0 13px!important}
    #profile .menu .profileIcon{width:26px;height:26px;display:grid;place-items:center;color:var(--muted)}
    #profile .menu .profileIcon svg{width:18px;height:18px;display:block}
    #profile .menu button:hover .profileIcon,#profile .menu button:focus-visible .profileIcon{color:var(--brand)}
    #profile .menu .profileLabel{display:block!important;min-width:0!important;width:auto!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;line-height:1.2!important}
    #profile .menu .profileTail{justify-self:end;color:var(--muted);font-style:normal;white-space:nowrap}
    #profile .menu [data-profile-action="appearance"] .profileTail{color:var(--brand);font-family:var(--sport);font-weight:800;font-size:10px}
  `;
  document.head.appendChild(style);

  function errorText(body,status){if(typeof body?.detail==='string')return body.detail;if(Array.isArray(body?.detail))return body.detail.map(x=>x?.msg||String(x)).join('; ');return `Request failed (${status})`}
  async function api(path,opts={}){const headers={'Content-Type':'application/json',...(opts.headers||{})};if(token())headers.Authorization=`Bearer ${token()}`;const r=await fetch(`${API}${path}`,{...opts,headers,cache:'no-store'});let b=null;try{b=await r.json()}catch{}if(!r.ok)throw new Error(errorText(b,r.status));return b}
  function deep(url){if(typeof window.SBPDeepRoute==='function'){window.SBPDeepRoute(url);return}location.href=url}
  function row(icon,label,action='',tail='›'){return `<button type="button"${action?` data-profile-action="${action}"`:''}><i class="profileIcon">${icons[icon]||''}</i><span class="profileLabel">${label}</span><em class="profileTail">${tail}</em></button>`}

  function render(user){
    const wrap=root.querySelector('.content')||root;
    let head=wrap.querySelector('.profileHead');if(!head){head=document.createElement('div');head.className='profileHead';wrap.prepend(head)}
    const avatar=user.avatar_data_url?`<img src="${esc(user.avatar_data_url)}" alt="${esc(user.full_name||'Player')} profile picture">`:esc(initials(user.full_name));
    head.innerHTML=`<button type="button" class="profileAvatarButton" data-profile-photo aria-label="Change profile picture">${avatar}<span class="profileCameraBadge">${icons.camera}</span></button><div class="profileIdentity"><h3>${esc(user.full_name||'Player')}</h3><p>${esc(user.email||user.phone||'SBP Padel player')}</p><div class="profilePhotoActions"><span class="profilePhotoHint">Tap photo to change</span>${user.avatar_data_url?'<button type="button" class="profileRemovePhoto" data-remove-profile-photo>Remove</button>':''}<span class="profilePhotoStatus" aria-live="polite"></span></div><input type="file" data-profile-photo-input accept="image/jpeg,image/png,image/webp" hidden></div>`;
    let menu=wrap.querySelector('.menu');if(!menu){menu=document.createElement('div');menu.className='menu';wrap.appendChild(menu)}
    menu.innerHTML=[
      row('bookings','My Bookings','bookings'),
      row('wallet','My Wallet','wallet'),
      row('payments','Payment History','payments'),
      row('players','Saved Players'),
      row('favourite','Favourite Venues'),
      row('notifications','Notifications'),
      row('appearance','Appearance','appearance',(document.body.dataset.theme||'dark').toUpperCase()),
      row('help','Help & Support'),
      row('logout','Sign Out','logout','')
    ].join('');
  }
  function setPhotoStatus(text,error=false){const el=root.querySelector('.profilePhotoStatus');if(el){el.textContent=text||'';el.classList.toggle('error',error)}}
  async function resizeImage(file){
    if(!file.type.match(/^image\/(jpeg|png|webp)$/))throw new Error('Choose a JPEG, PNG or WebP image');
    if(file.size>8*1024*1024)throw new Error('Profile picture must be smaller than 8 MB');
    const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Could not read image'));r.readAsDataURL(file)});
    const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Could not open image'));i.src=src});
    const size=256,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');
    const side=Math.min(img.naturalWidth,img.naturalHeight),sx=(img.naturalWidth-side)/2,sy=(img.naturalHeight-side)/2;
    ctx.drawImage(img,sx,sy,side,side,0,0,size,size);
    return canvas.toDataURL('image/jpeg',0.84);
  }
  async function uploadPhoto(file){
    setPhotoStatus('Uploading…');
    try{const data=await resizeImage(file);await api('/auth/me/avatar',{method:'PUT',body:JSON.stringify({avatar_data_url:data})});await load();setPhotoStatus('Photo updated')}
    catch(err){setPhotoStatus(err.message||'Could not update photo',true)}
  }
  async function removePhoto(){
    setPhotoStatus('Removing…');
    try{await api('/auth/me/avatar',{method:'DELETE'});await load()}
    catch(err){setPhotoStatus(err.message||'Could not remove photo',true)}
  }
  function logout(){['sbpPadelAccessToken','sbpPadelUser','sbpPadelBookingSessionV2','sbpPadelSelectedBookingId','sbpPadelPayment','sbpPadelBookingId'].forEach(k=>localStorage.removeItem(k));location.href='auth-preview.html'}

  root.addEventListener('click',e=>{
    if(e.target.closest?.('[data-profile-photo]')){e.preventDefault();root.querySelector('[data-profile-photo-input]')?.click();return}
    if(e.target.closest?.('[data-remove-profile-photo]')){e.preventDefault();removePhoto();return}
    const btn=e.target.closest?.('[data-profile-action]');if(!btn)return;const action=btn.dataset.profileAction;
    if(action==='bookings'){e.preventDefault();window.SBPNavigate?.('bookings');return}
    if(action==='wallet'){e.preventDefault();deep('wallet.html');return}
    if(action==='payments'){e.preventDefault();deep('payment-history.html');return}
    if(action==='appearance'){e.preventDefault();const theme=(document.body.dataset.theme||'dark')==='dark'?'light':'dark';localStorage.setItem('sbpPadelTheme',theme);if(typeof window.SBPApplyTheme==='function')window.SBPApplyTheme(theme);else{document.body.dataset.theme=theme;document.documentElement.dataset.theme=theme}const em=btn.querySelector('.profileTail');if(em)em.textContent=theme.toUpperCase();return}
    if(action==='logout'){e.preventDefault();logout()}
  });
  root.addEventListener('change',e=>{const input=e.target.closest?.('[data-profile-photo-input]');if(!input)return;const file=input.files?.[0];input.value='';if(file)uploadPhoto(file)});

  async function load(){if(!token()){location.href='auth-preview.html';return}try{const user=await api(`/auth/me?_=${Date.now()}`);localStorage.setItem('sbpPadelUser',JSON.stringify(user));render(user)}catch{let fallback={full_name:'Player'};try{fallback={...fallback,...JSON.parse(localStorage.getItem('sbpPadelUser')||'{}')}}catch{}render(fallback)}}
  window.SBPRefreshProfile=load;document.addEventListener('click',e=>{if(e.target.closest?.('[data-nav="profile"]'))setTimeout(load,0)},true);load();
})();