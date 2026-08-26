(()=>{
  'use strict';
  if(window.__SBPSavedPlayersSync)return;window.__SBPSavedPlayersSync=true;
  const CHECKOUT='sbpPadelCheckoutPlayers',SAVED='sbpPadelSavedPlayers';
  const owner=()=>{try{return String(JSON.parse(localStorage.getItem('sbpPadelUser')||'{}').full_name||'').trim()}catch{return''}};
  const read=k=>{try{const v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v.map(x=>String(x||'').trim()).filter(Boolean):[]}catch{return[]}};
  function mergeCheckout(){
    const me=owner().toLowerCase(),current=read(SAVED),seen=new Set(current.map(x=>x.toLowerCase()));let changed=false;
    for(const name of read(CHECKOUT)){
      const key=name.toLowerCase();if(!key||key===me||seen.has(key))continue;current.push(name);seen.add(key);changed=true;
    }
    if(changed){localStorage.setItem(SAVED,JSON.stringify(current));window.dispatchEvent(new CustomEvent('sbp-saved-players-change',{detail:{players:current}}));}
  }
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){const result=original.call(this,key,value);if(this===localStorage&&key===CHECKOUT)queueMicrotask(mergeCheckout);return result};
  window.SBPSyncSavedPlayers=mergeCheckout;
  window.addEventListener('focus',mergeCheckout);window.addEventListener('pageshow',mergeCheckout);mergeCheckout();
})();
