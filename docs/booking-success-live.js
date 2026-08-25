(()=>{
  'use strict';
  if(window.__SBPBookingSuccessLive)return;window.__SBPBookingSuccessLive=true;
  const token=()=>localStorage.getItem('sbpPadelAccessToken')||'';
  const apiBase=()=>window.SBPApiBase?.()||(localStorage.getItem('sbpPadelApiBase')||'').replace(/\/$/,'');
  const bookingUuid=()=>localStorage.getItem('sbpPadelBookingUuid')||localStorage.getItem('sbpPadelSelectedBookingId')||'';
  const money=v=>`PKR ${Number(v||0).toLocaleString(undefined,{maximumFractionDigits:0})}`;
  const fmtTime=t=>{const[h,m]=String(t||'00:00').split(':').map(Number);return new Date(2000,0,1,h,m||0).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})};
  const fmtDate=iso=>new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short',year:'numeric'});
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val??'—'};
  async function api(path){const res=await fetch(`${apiBase()}${path}`,{headers:{Authorization:`Bearer ${token()}`,Accept:'application/json'},cache:'no-store'});let body=null;try{body=await res.json()}catch{}if(!res.ok)throw new Error(body?.detail||`Request failed (${res.status})`);return body}
  const methodLabel=v=>v==='card'?'Card':v==='bank'?'Online Banking':v?String(v).replaceAll('_',' '):'Payment complete';
  const sessionMeta=slots=>{const rows=Array.isArray(slots)?slots:[];if(!rows.length)return{label:'—',hours:0,count:0};const first=rows[0],last=rows[rows.length-1];return{label:`${fmtTime(first.start_time)} – ${fmtTime(last.end_time)}`,hours:rows.length,count:rows.length}};
  function route(url){if(window.parent&&window.parent!==window&&typeof window.parent.SBPDeepRoute==='function'){window.parent.SBPDeepRoute(url);return}if(typeof window.SBPDeepRoute==='function'){window.SBPDeepRoute(url);return}location.href=url}
  function wire(){document.addEventListener('click',e=>{const btn=e.target.closest?.('#viewPass,#backHome');if(!btn)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const id=bookingUuid();if(id)localStorage.setItem('sbpPadelSelectedBookingId',id);if(btn.id==='viewPass')route('digital-pass.html');else route('index.html?open=bookings')},true)}
  async function hydrate(){
    const id=bookingUuid();if(!id||!token()){set('bookingId','Booking unavailable');return}
    localStorage.setItem('sbpPadelBookingUuid',id);localStorage.setItem('sbpPadelSelectedBookingId',id);
    try{
      const [b,participants,venues,payment]=await Promise.all([
        api(`/bookings/${encodeURIComponent(id)}?_=${Date.now()}`),
        api(`/bookings/${encodeURIComponent(id)}/participants?_=${Date.now()}`),
        api(`/venues?_=${Date.now()}`),
        api(`/payments/by-booking/${encodeURIComponent(id)}?_=${Date.now()}`).catch(()=>null)
      ]);
      const venue=(venues||[]).find(v=>v.id===b.venue_id);let vd=null;try{if(venue)vd=await api(`/venues/${venue.id}?_=${Date.now()}`)}catch{}
      const court=vd?.courts?.find(c=>c.id===b.court_id),session=sessionMeta(b.slots);
      set('venue',venue?.name||vd?.name||'SBP Padel');set('court',court?.name||'Court');set('date',fmtDate(b.date));set('time',session.label);set('duration',`${session.hours} hour${session.hours===1?'':'s'}`);set('slotCount',`${session.count} slot${session.count===1?'':'s'}`);set('amount',money(b.total));set('bookingId',b.booking_code);set('method',methodLabel(payment?.method));
      const count=Number(participants?.player_count||1);set('players',`${count} player${count===1?'':'s'}`);
      localStorage.setItem('sbpPadelBookingId',b.booking_code||'');localStorage.setItem('sbpPadelCheckoutPlayers',JSON.stringify(participants?.players||[]));
      const legacy={venue:venue?.name||vd?.name||'SBP Padel',court:court?.name||'Court',date:fmtDate(b.date),dateIso:b.date,slots:[session.label],slotStarts:(b.slots||[]).map(x=>x.start_time),amount:Number(b.total),players:participants?.players||[],durationHours:session.hours,slotCount:session.count};localStorage.setItem('sbpPadelPayment',JSON.stringify(legacy));
    }catch(err){console.error('SBP confirmation hydration:',err);set('bookingId','Could not load booking')}
  }
  wire();hydrate();window.addEventListener('pageshow',hydrate);
})();