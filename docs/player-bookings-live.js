(()=>{
  'use strict';
  if(window.__SBPPlayerBookingsLive)return;
  window.__SBPPlayerBookingsLive=true;

  // My Bookings has one runtime owner. Load its presentation here as well so
  // retiring the legacy bookings-entry.js cannot remove the module stylesheet.
  if(!document.querySelector('link[data-sbp-bookings-style]')){
    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href='bookings-module.css?v=20260824-single-owner2';
    css.dataset.sbpBookingsStyle='1';
    document.head.appendChild(css);
  }

  const root=document.getElementById('bookings');
  if(!root)return;
  const API=(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  const token=()=>localStorage.getItem('sbpPadelAccessToken')||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>`PKR ${Number(v||0).toLocaleString(undefined,{maximumFractionDigits:0})}`;
  const fmtDate=iso=>new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  const fmtTime=t=>{const [h,m]=String(t||'00:00').split(':').map(Number);return new Date(2000,0,1,h,m||0).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})};
  const initials=()=>{try{return String(JSON.parse(localStorage.getItem('sbpPadelUser')||'{}').full_name||'Player').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()}catch{return'P'}};
  let currentTab='upcoming',loadSeq=0,rendered=false,lastDetails=[],lastVenueDetails=new Map();

  async function api(path){
    const headers={'Content-Type':'application/json'};if(token())headers.Authorization=`Bearer ${token()}`;
    const res=await fetch(`${API}${path}`,{headers,cache:'no-store'});let body=null;try{body=await res.json()}catch{}
    if(!res.ok)throw new Error(body?.detail||`Request failed (${res.status})`);return body;
  }
  function state(message){root.innerHTML=`<div class="bkWrap"><div class="bkHead"><div><h1>My Bookings</h1><p>Manage upcoming and previous court sessions.</p></div><div class="bkAvatar">${esc(initials())}</div></div><div style="padding:38px 12px;text-align:center;color:var(--muted);font-size:9px">${esc(message)}</div></div>`}
  function statusLabel(value){return String(value||'').replaceAll('_',' ').toUpperCase()}
  function applyTab(tab=currentTab){
    if(!['upcoming','past','cancelled'].includes(tab))tab='upcoming';currentTab=tab;
    root.querySelectorAll('[data-live-tab]').forEach(x=>x.classList.toggle('on',x.dataset.liveTab===currentTab));
    ['upcoming','past','cancelled'].forEach(g=>{const list=root.querySelector(`#live-${g}`);if(list)list.hidden=g!==currentTab});
  }
  function openDeep(url){
    if(typeof window.SBPDeepRoute==='function'){window.SBPDeepRoute(url);return}
    location.href=url;
  }

  async function load(){
    const seq=++loadSeq;
    if(!token()){state('Sign in to view your bookings.');return[]}
    if(!rendered)state('Loading your bookings…');
    try{
      const rows=await api(`/bookings/me?_=${Date.now()}`);if(seq!==loadSeq)return rows;
      const venueDetails=new Map();
      for(const id of [...new Set(rows.map(x=>x.venue_id))]){try{const d=await api(`/venues/${id}`);if(seq!==loadSeq)return rows;venueDetails.set(id,d)}catch{}}
      const details=await Promise.all(rows.map(async b=>{try{return {...b,detail:await api(`/bookings/${b.id}?_=${Date.now()}`)}}catch{return {...b,detail:null}}}));
      if(seq!==loadSeq)return rows;
      lastDetails=details;lastVenueDetails=venueDetails;
      const today=new Date();today.setHours(0,0,0,0);const groups={upcoming:[],past:[],cancelled:[]};
      for(const b of details){const day=new Date(`${b.date}T12:00:00`);if(['cancelled','venue_cancelled'].includes(b.status))groups.cancelled.push(b);else if(['completed','expired','payment_failed'].includes(b.status)||day<today)groups.past.push(b);else groups.upcoming.push(b)}
      const card=(b,type)=>{const d=b.detail||{},vd=venueDetails.get(b.venue_id),court=vd?.courts?.find(c=>c.id===b.court_id),first=d.slots?.[0],last=d.slots?.[d.slots.length-1],time=first?`${fmtTime(first.start_time)}${last?` – ${fmtTime(last.end_time)}`:''}`:'',label=type==='cancelled'?'CANCELLED':type==='past'?(b.status==='completed'?'COMPLETED':statusLabel(b.status)):statusLabel(b.status);return `<article class="bkCard" data-booking-card="${esc(b.id)}"><div class="bkHero"><span class="bkState ${type==='past'?'past':type==='cancelled'?'cancelled':''}">${esc(label)}</span></div><div class="bkBody"><div class="bkTop"><div><small>${esc((vd?.name||'SBP PADEL').toUpperCase())}</small><h2>${esc(court?.name||'Court')} · ${esc(court?.court_type||'Padel Court')}</h2><small>${esc(fmtDate(b.date))}</small></div><div class="bkTime">${esc(time)}</div></div><div class="bkMeta"><div><small>Booking ID</small><b>${esc(b.booking_code)}</b></div><div><small>Amount</small><b>${money(b.total)}</b></div></div><div class="bkActions">${type==='upcoming'?`<button class="bkPrimary" data-live-manage="${esc(b.id)}">MANAGE BOOKING</button><button class="bkSecondary" data-live-pass="${esc(b.id)}">PASS</button>`:`<button class="bkPrimary" data-live-rebook="${esc(b.id)}">BOOK AGAIN</button><button class="bkSecondary" data-live-manage="${esc(b.id)}">DETAILS</button>`}</div></div></article>`};
      root.innerHTML=`<div class="bkWrap"><div class="bkHead"><div><h1>My Bookings</h1><p>Manage upcoming and previous court sessions.</p></div><div class="bkAvatar">${esc(initials())}</div></div><div class="bkTabs"><button data-live-tab="upcoming">Upcoming (${groups.upcoming.length})</button><button data-live-tab="past">Past (${groups.past.length})</button><button data-live-tab="cancelled">Cancelled (${groups.cancelled.length})</button></div>${['upcoming','past','cancelled'].map(g=>`<div class="bkList" id="live-${g}">${groups[g].length?groups[g].map(x=>card(x,g)).join(''):`<div style="padding:34px 12px;text-align:center;color:var(--muted);font-size:9px">No ${g} bookings.</div>`}</div>`).join('')}</div>`;
      rendered=true;applyTab(currentTab);return rows;
    }catch(err){if(seq===loadSeq&&!rendered)state(`Could not load bookings: ${err.message}`);return[]}
  }

  root.addEventListener('click',async e=>{
    const tab=e.target.closest?.('[data-live-tab]');if(tab){e.preventDefault();e.stopPropagation();applyTab(tab.dataset.liveTab);return}
    const manage=e.target.closest?.('[data-live-manage]');if(manage){e.preventDefault();e.stopPropagation();const id=manage.dataset.liveManage;if(id){localStorage.setItem('sbpPadelSelectedBookingId',id);openDeep(`booking-detail.html?booking=${encodeURIComponent(id)}`)}return}
    const pass=e.target.closest?.('[data-live-pass]');if(pass){e.preventDefault();e.stopPropagation();const b=lastDetails.find(x=>x.id===pass.dataset.livePass);if(!b?.detail)return;const vd=lastVenueDetails.get(b.venue_id),court=vd?.courts?.find(c=>c.id===b.court_id),p={venue:vd?.name||'SBP Padel',court:court?.name||'Court',courtType:court?.court_type||'',date:fmtDate(b.date),dateIso:b.date,slots:(b.detail.slots||[]).map(s=>`${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}`),slotStarts:(b.detail.slots||[]).map(s=>s.start_time),amount:Number(b.total)};localStorage.setItem('sbpPadelPayment',JSON.stringify(p));localStorage.setItem('sbpPadelBookingId',b.booking_code);localStorage.setItem('sbpPadelSelectedBookingId',b.id);openDeep('digital-pass.html');return}
    const rebook=e.target.closest?.('[data-live-rebook]');if(rebook){e.preventDefault();e.stopPropagation();window.SBPNavigate?.('nishtar')}
  },true);

  window.SBPRefreshBookings=load;
  document.addEventListener('click',e=>{if(e.target.closest?.('nav [data-nav="bookings"],#home [data-nav="bookings"],#profile [data-nav="bookings"]'))setTimeout(load,0)},true);
  let focusTimer=0;window.addEventListener('focus',()=>{if(!root.classList.contains('active'))return;clearTimeout(focusTimer);focusTimer=setTimeout(load,80)});
  window.addEventListener('storage',e=>{if(['sbpPadelNotificationsVersion','sbpPadelBookingSessionV2'].includes(e.key)&&root.classList.contains('active'))load()});
})();
