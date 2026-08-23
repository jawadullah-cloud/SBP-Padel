(()=>{
  'use strict';
  if(window.__SBPPlayerProfileLive)return;
  window.__SBPPlayerProfileLive=true;
  const root=document.getElementById('profile');if(!root)return;
  const API=(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  const token=()=>localStorage.getItem('sbpPadelAccessToken')||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials=n=>String(n||'Player').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'P';
  const style=document.createElement('style');
  style.dataset.sbpProfileLive='1';
  style.textContent=`
    #profile .menu button{display:grid!important;grid-template-columns:24px minmax(0,1fr) auto!important;align-items:center!important;gap:10px!important;text-align:left!important;min-height:50px!important;padding:0 13px!important}
    #profile .menu .profileIcon{width:24px;display:grid;place-items:center;color:var(--text);font-size:12px;line-height:1}
    #profile .menu .profileLabel{display:block!important;min-width:0!important;width:auto!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;line-height:1.2!important}
    #profile .menu .profileTail{justify-self:end;color:var(--muted);font-style:normal;white-space:nowrap}
    #profile .menu [data-profile-action="appearance"] .profileTail{color:var(--brand);font-family:var(--sport);font-weight:800;font-size:10px}
    #profile .menu [data-profile-action="logout"] .profileLabel{color:var(--text)}
  `;
  document.head.appendChild(style);
  async function api(path){const headers={'Content-Type':'application/json'};if(token())headers.Authorization=`Bearer ${token()}`;const r=await fetch(`${API}${path}`,{headers,cache:'no-store'});let b=null;try{b=await r.json()}catch{}if(!r.ok)throw new Error(typeof b?.detail==='string'?b.detail:`Request failed (${r.status})`);return b}
  function deep(url){if(typeof window.SBPDeepRoute==='function'){window.SBPDeepRoute(url);return}location.href=url}
  function row(icon,label,action='',tail='›'){return `<button type="button"${action?` data-profile-action="${action}"`:''}><i class="profileIcon">${icon}</i><span class="profileLabel">${label}</span><em class="profileTail">${tail}</em></button>`}
  function render(user){
    const wrap=root.querySelector('.content')||root;
    let head=wrap.querySelector('.profileHead');if(!head){head=document.createElement('div');head.className='profileHead';wrap.prepend(head)}
    head.innerHTML=`<div class="avatar">${esc(initials(user.full_name))}</div><div><h3>${esc(user.full_name||'Player')}</h3><p>${esc(user.email||user.phone||'SBP Padel player')}</p></div>`;
    let menu=wrap.querySelector('.menu');if(!menu){menu=document.createElement('div');menu.className='menu';wrap.appendChild(menu)}
    menu.innerHTML=[
      row('▣','My Bookings','bookings'),
      row('▤','My Wallet','wallet'),
      row('◫','Payment History','payments'),
      row('♙','Saved Players'),
      row('♥','Favourite Venues'),
      row('♢','Notifications'),
      row('◐','Appearance','appearance',(document.body.dataset.theme||'dark').toUpperCase()),
      row('?','Help & Support'),
      row('↪','Sign Out','logout','')
    ].join('');
  }
  function logout(){['sbpPadelAccessToken','sbpPadelUser','sbpPadelBookingSessionV2','sbpPadelSelectedBookingId','sbpPadelPayment','sbpPadelBookingId'].forEach(k=>localStorage.removeItem(k));location.href='auth-preview.html'}
  root.addEventListener('click',e=>{const btn=e.target.closest?.('[data-profile-action]');if(!btn)return;const action=btn.dataset.profileAction;if(action==='bookings'){e.preventDefault();window.SBPNavigate?.('bookings');return}if(action==='wallet'){e.preventDefault();deep('wallet.html');return}if(action==='payments'){e.preventDefault();deep('payment-history.html');return}if(action==='appearance'){e.preventDefault();const theme=(document.body.dataset.theme||'dark')==='dark'?'light':'dark';localStorage.setItem('sbpPadelTheme',theme);if(typeof window.SBPApplyTheme==='function')window.SBPApplyTheme(theme);else{document.body.dataset.theme=theme;document.documentElement.dataset.theme=theme}const em=btn.querySelector('.profileTail');if(em)em.textContent=theme.toUpperCase();return}if(action==='logout'){e.preventDefault();logout()}});
  async function load(){if(!token()){location.href='auth-preview.html';return}try{const user=await api(`/auth/me?_=${Date.now()}`);localStorage.setItem('sbpPadelUser',JSON.stringify(user));render(user)}catch{let fallback={full_name:'Player'};try{fallback={...fallback,...JSON.parse(localStorage.getItem('sbpPadelUser')||'{}')}}catch{}render(fallback)}}
  window.SBPRefreshProfile=load;document.addEventListener('click',e=>{if(e.target.closest?.('[data-nav="profile"]'))setTimeout(load,0)},true);load();
})();