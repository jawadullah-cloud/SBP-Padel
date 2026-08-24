(()=>{
  'use strict';
  if(window.__SBPBookingSuccessLive)return;window.__SBPBookingSuccessLive=true;
  const API=(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  const token=()=>localStorage.getItem('sbpPadelAccessToken')||'';
  const money=v=>`PKR ${Number(v||0).toLocaleString(undefined,{maximumFractionDigits:0})}`;
  const fmtTime=t=>{const [h,m]=String(t||'00:00').split(':').map(Number);return new Date(2000,0,1,h,m||0).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})};
  const fmtDate=iso=>new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short',year:'numeric'});
  const set=(id,val)=>{const el=document.getElementById(id);if(el&&val!=null&&val!=='')el.textContent=val};
  function checkoutPlayers(){try{const p=JSON.parse(localStorage.getItem('sbpPadelCheckoutPlayers')||'[]');return Array.isArray(p)?p.filter(Boolean):[]}catch{return[]}}
  async function api(path){const res=await fetch(`${API}${path}`,{headers:{Authorization:`Bearer ${token()}`},cache:'no-store'});if(!res.ok)throw new Error(`Request failed (${res.status})`);return res.json()}
  async function hydrate(){
    const id=localStorage.getItem('sbpPadelBookingUuid')||'';if(!id||!token())return;
    localStorage.setItem('sbpPadelSelectedBookingId',id);
    const players=checkoutPlayers();if(players.length)set('players',`${players.length} player${players.length===1?'':'s'}`);
    try{
      const [b,venues]=await Promise.all([api(`/bookings/${encodeURIComponent(id)}?_=${Date.now()}`),api('/venues')]);
      const venue=(venues||[]).find(v=>v.id===b.venue_id);let vd=null;try{if(venue)vd=await api(`/venues/${venue.id}`)}catch{}
      const court=vd?.courts?.find(c=>c.id===b.court_id);
      set('venue',venue?.name||vd?.name);set('court',court?.name);set('date',fmtDate(b.date));
      if(b.slots?.length)set('time',`${fmtTime(b.slots[0].start_time)} – ${fmtTime(b.slots[b.slots.length-1].end_time)}`);
      set('amount',money(b.total));set('bookingId',b.booking_code);
      localStorage.setItem('sbpPadelBookingId',b.booking_code||'');
    }catch(err){console.warn('SBP confirmation hydration:',err)}
  }
  hydrate();window.addEventListener('pageshow',hydrate);
})();
