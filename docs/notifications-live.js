(()=>{
  'use strict';
  if(window.__SBPNotificationsLiveV2)return;
  window.__SBPNotificationsLiveV2=true;

  const API=(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  const token=()=>localStorage.getItem('sbpPadelAccessToken')||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const iconFor=kind=>String(kind||'').includes('refund')?'↺':String(kind||'').includes('cancel')?'×':String(kind||'').includes('reminder')?'◷':'✓';
  const rel=iso=>{const d=new Date(iso);if(Number.isNaN(d.getTime()))return'';const mins=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));if(mins<1)return'Just now';if(mins<60)return`${mins} min ago`;const h=Math.floor(mins/60);if(h<24)return`${h}h ago`;const days=Math.floor(h/24);if(days<7)return`${days}d ago`;return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})};

  async function api(path,opts={}){
    const headers={'Content-Type':'application/json',...(opts.headers||{})};
    if(token())headers.Authorization=`Bearer ${token()}`;
    const res=await fetch(`${API}${path}`,{...opts,headers,cache:'no-store'});
    let body=null;try{body=await res.json()}catch{}
    if(!res.ok)throw new Error(body?.detail||`Request failed (${res.status})`);
    return body;
  }

  const style=document.createElement('style');
  style.id='sbpNotificationsV2Style';
  style.textContent=`
    #notifications{background:var(--bg);color:var(--text)}
    .ntWrap{padding:8px 16px 28px}.ntHead{display:flex;align-items:center;gap:11px;margin-bottom:18px}.ntBack{width:38px;height:38px;flex:none;border:1px solid var(--line);border-radius:50%;background:var(--surface);color:var(--text);display:grid;place-items:center}.ntHead small{display:block;color:var(--brand);font:800 9px var(--sport);letter-spacing:.12em}.ntHead h1{font-family:var(--ui)!important;font-size:25px!important;line-height:1.05!important;letter-spacing:-.035em!important;margin:2px 0 0!important}.ntSummary{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 14px}.ntSummary p{margin:0;color:var(--muted);font-size:9px;line-height:1.45}.ntMark{border:0;background:none;color:var(--brand);font:800 8px var(--sport);white-space:nowrap}.ntList{display:grid;gap:9px}.ntCard{position:relative;display:grid;grid-template-columns:40px 1fr;gap:11px;padding:13px;border:1px solid var(--line);border-radius:16px;background:var(--surface);text-align:left;color:var(--text);width:100%}.ntCard.unread{border-color:color-mix(in srgb,var(--brand) 38%,var(--line));background:color-mix(in srgb,var(--brand) 6%,var(--surface))}.ntCard.unread:after{content:'';position:absolute;right:11px;top:11px;width:7px;height:7px;border-radius:50%;background:var(--brand)}.ntIcon{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--surface2);color:var(--brand);font:900 16px var(--sport)}.ntCard b{display:block;font-size:10px;padding-right:12px}.ntCard p{font-size:8px;line-height:1.5;color:var(--muted);margin:4px 14px 5px 0}.ntCard small{font-size:7px;color:var(--muted)}.ntState{padding:34px 16px;border:1px dashed var(--line);border-radius:16px;text-align:center;color:var(--muted);font-size:9px;line-height:1.55}.ntState b{display:block;color:var(--text);font-size:12px;margin-bottom:4px}.topNotify{position:relative!important;display:grid!important;place-items:center!important}.topNotify svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.liveUnreadCount{position:absolute;right:-3px;top:-4px;min-width:15px;height:15px;padding:0 4px;border-radius:999px;background:var(--brand);color:#071006;display:none;place-items:center;font:900 8px var(--sport);line-height:15px;border:2px solid var(--bg)}.topNotify.hasUnread .liveUnreadCount{display:grid}
  `;
  document.head.appendChild(style);

  const app=document.querySelector('.app'),nav=document.querySelector('nav'),profile=document.getElementById('profile');
  if(!app||!nav||!profile)return;

  const oldScreen=document.getElementById('notifications');
  if(oldScreen)oldScreen.remove();
  const screen=document.createElement('section');screen.className='screen';screen.id='notifications';app.insertBefore(screen,nav);

  function replaceOldListeners(){
    let bell=document.querySelector('header .topNotify,header .theme');
    if(bell){const clean=bell.cloneNode(false);clean.removeAttribute('id');clean.className='theme topNotify';clean.type='button';clean.setAttribute('aria-label','Notifications');clean.innerHTML='<svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg><span class="liveUnreadCount"></span>';bell.replaceWith(clean);bell=clean;bell.addEventListener('click',e=>{e.preventDefault();show()})}
    const oldBtn=[...profile.querySelectorAll('.menu button')].find(b=>b.querySelector('span')?.textContent?.trim()==='Notifications');
    if(oldBtn){const clean=oldBtn.cloneNode(true);oldBtn.replaceWith(clean);clean.addEventListener('click',e=>{e.preventDefault();show()})}
  }

  function setActive(){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s===screen));document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.nav==='profile'));nav.classList.remove('flowHidden');screen.scrollTo({top:0,behavior:'auto'})}
  function back(){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id==='profile'));document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.nav==='profile'));nav.classList.remove('flowHidden')}
  function shell(){screen.innerHTML='<div class="ntWrap"><div class="ntHead"><button class="ntBack" type="button">←</button><div><small>ACTIVITY</small><h1>Notifications</h1></div></div><div class="ntSummary"><p>Live booking, payment, refund and venue updates from your account.</p><button class="ntMark" type="button" hidden>MARK ALL READ</button></div><div class="ntList"><div class="ntState"><b>Loading activity…</b>Fetching your latest notifications.</div></div></div>';screen.querySelector('.ntBack').onclick=back}
  function updateBadge(rows){const unread=rows.filter(n=>!n.read).length;const bell=document.querySelector('header .topNotify');if(!bell)return;bell.classList.toggle('hasUnread',unread>0);const badge=bell.querySelector('.liveUnreadCount');if(badge)badge.textContent=unread>99?'99+':String(unread);bell.setAttribute('aria-label',unread?`Notifications, ${unread} unread`:'Notifications, all read')}
  function render(rows){const list=screen.querySelector('.ntList'),mark=screen.querySelector('.ntMark');if(!list||!mark)return;const unread=rows.filter(n=>!n.read).length;mark.hidden=unread===0;if(!rows.length){list.innerHTML='<div class="ntState"><b>No notifications yet</b>New booking and account activity will appear here automatically.</div>';updateBadge(rows);return}list.innerHTML=rows.map(n=>`<button type="button" class="ntCard ${n.read?'':'unread'}" data-id="${esc(n.id)}"><span class="ntIcon">${iconFor(n.kind)}</span><span><b>${esc(n.title)}</b><p>${esc(n.body)}</p><small>${esc(rel(n.created_at))}</small></span></button>`).join('');list.querySelectorAll('[data-id]').forEach(card=>card.onclick=async()=>{if(!card.classList.contains('unread'))return;card.disabled=true;try{await api(`/notifications/${encodeURIComponent(card.dataset.id)}/read`,{method:'POST'});await load()}finally{card.disabled=false}});mark.onclick=async()=>{mark.disabled=true;try{await api('/notifications/me/read-all',{method:'POST'});await load()}finally{mark.disabled=false}};updateBadge(rows)}
  async function load(){if(!token()){render([]);return[]}try{const rows=await api(`/notifications/me?_=${Date.now()}`);render(rows);return rows}catch(err){const list=screen.querySelector('.ntList');if(list)list.innerHTML=`<div class="ntState"><b>Could not load notifications</b>${esc(err.message)}</div>`;return[]}}
  async function refreshBadge(){if(!token())return;try{updateBadge(await api(`/notifications/me?_=${Date.now()}`))}catch{}}
  async function show(){shell();setActive();await load()}

  window.SBPShowNotifications=show;
  window.SBPRefreshNotifications=async()=>{if(screen.classList.contains('active'))return load();return refreshBadge()};
  // The legacy profile module may be injected later in the same parser turn. Take
  // ownership after synchronous shell setup has finished, then clone its controls
  // to discard every prototype notification listener and repaint only from the API.
  setTimeout(()=>{replaceOldListeners();shell();refreshBadge()},0);
  window.addEventListener('focus',refreshBadge);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)window.SBPRefreshNotifications()});
  window.addEventListener('storage',e=>{if(['sbpPadelBookingSessionV2','sbpPadelBookingId','sbpPadelNotificationsVersion'].includes(e.key))window.SBPRefreshNotifications()});
})();
