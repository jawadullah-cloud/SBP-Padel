(()=>{
  'use strict';
  if(window.__SBPSavedPlayerSync)return;
  window.__SBPSavedPlayerSync=true;

  const SAVED_KEY='sbpPadelSavedPlayers';

  function ownerName(){
    try{return String(JSON.parse(localStorage.getItem('sbpPadelUser')||'{}').full_name||'').trim()}catch{return''}
  }
  function savedPlayers(){
    try{const rows=JSON.parse(localStorage.getItem(SAVED_KEY)||'[]');return Array.isArray(rows)?rows.filter(x=>typeof x==='string'&&x.trim()):[]}catch{return[]}
  }
  function savePartner(name){
    name=String(name||'').trim();
    if(!name)return;
    const owner=ownerName();
    if(owner&&name.localeCompare(owner,undefined,{sensitivity:'accent'})===0)return;
    const rows=savedPlayers();
    if(rows.some(x=>x.localeCompare(name,undefined,{sensitivity:'accent'})===0))return;
    rows.push(name);
    localStorage.setItem(SAVED_KEY,JSON.stringify(rows));
    window.dispatchEvent(new CustomEvent('sbp-saved-players-change',{detail:{players:rows.slice()}}));
  }

  // The canonical Step-5 Review keeps current-booking participants in
  // sbpPadelCheckoutPlayers. When the user explicitly types and adds a playing
  // partner, persist that partner to the profile-level Saved Players store too.
  // Removing someone from the current booking does not erase the saved partner.
  document.addEventListener('click',event=>{
    const add=event.target.closest?.('#rnAddGo');
    if(!add)return;
    const input=document.getElementById('rnName');
    const name=input?.value?.trim();
    if(!name)return;
    queueMicrotask(()=>{
      try{
        const current=JSON.parse(localStorage.getItem('sbpPadelCheckoutPlayers')||'[]');
        if(Array.isArray(current)&&current.some(x=>String(x).trim().toLowerCase()===name.toLowerCase()))savePartner(name);
      }catch{}
    });
  },true);
})();
