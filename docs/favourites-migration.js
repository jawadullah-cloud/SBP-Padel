(()=>{
  'use strict';
  const LEGACY='sbpPadelFavouriteNishtar',CURRENT='sbpPadelFavouriteVenueIds';
  function ids(){try{const v=JSON.parse(localStorage.getItem(CURRENT)||'[]');return Array.isArray(v)?v.map(String):[]}catch{return[]}}
  async function migrate(){
    if(localStorage.getItem(LEGACY)!=='1'||ids().length)return;
    try{
      const API=(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
      const r=await fetch(`${API}/venues?_=${Date.now()}`,{cache:'no-store'});if(!r.ok)return;
      const venues=await r.json();
      const venue=Array.isArray(venues)?venues.find(v=>/nishtar park sports complex/i.test(String(v?.name||''))):null;
      if(!venue?.id)return;
      localStorage.setItem(CURRENT,JSON.stringify([String(venue.id)]));
      window.dispatchEvent(new CustomEvent('sbp-favourites-change',{detail:{ids:[String(venue.id)]}}));
    }catch{}
  }
  window.addEventListener('sbp-favourites-change',e=>{
    if(localStorage.getItem(LEGACY)===null)return;
    const current=Array.isArray(e.detail?.ids)?e.detail.ids.map(String):ids();
    const selected=localStorage.getItem('sbpPadelSelectedVenueId');
    if(selected&&current.includes(String(selected)))localStorage.setItem(LEGACY,'1');
    else if(selected)localStorage.setItem(LEGACY,'0');
  });
  migrate();
})();
