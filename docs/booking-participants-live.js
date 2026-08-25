(()=>{
  'use strict';
  if(window.__SBPBookingParticipantsLive)return;
  window.__SBPBookingParticipantsLive=true;

  const originalFetch=window.fetch.bind(window);
  const token=()=>localStorage.getItem('sbpPadelAccessToken')||'';
  const api=()=>window.SBPApiBase?.()||(localStorage.getItem('sbpPadelApiBase')||'').replace(/\/$/,'');
  function players(){
    try{
      const rows=JSON.parse(localStorage.getItem('sbpPadelCheckoutPlayers')||'[]');
      return Array.isArray(rows)?rows.map(x=>String(x||'').trim()).filter(Boolean).slice(0,4):[];
    }catch{return[]}
  }
  async function persist(bookingId){
    if(!bookingId||!token())return;
    const body={players:players()};
    const res=await originalFetch(`${api()}/bookings/${encodeURIComponent(bookingId)}/participants`,{
      method:'PUT',headers:{Authorization:`Bearer ${token()}`,'Content-Type':'application/json'},
      body:JSON.stringify(body),cache:'no-store'
    });
    if(!res.ok){let detail='';try{detail=(await res.json())?.detail||''}catch{};throw new Error(detail||`Participant sync failed (${res.status})`)}
    const saved=await res.json();
    localStorage.setItem('sbpPadelCheckoutPlayers',JSON.stringify(saved.players||body.players));
    return saved;
  }
  window.SBPSyncBookingParticipants=persist;

  window.fetch=async function(input,init={}){
    const method=String(init?.method||'GET').toUpperCase();
    const url=typeof input==='string'?input:String(input?.url||'');
    const createUrl=`${api()}/bookings`;
    const response=await originalFetch(input,init);
    if(method==='POST'&&url.replace(/\/$/,'')===createUrl.replace(/\/$/,'')&&response.ok){
      try{
        const created=await response.clone().json();
        if(created?.id)await persist(created.id);
      }catch(err){console.error('SBP participant persistence:',err);throw err}
    }
    return response;
  };
})();
