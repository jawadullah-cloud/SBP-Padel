(()=>{
  'use strict';
  if(window.__SBPPaymentMethodsLive)return;window.__SBPPaymentMethodsLive=true;
  const supported=new Set(['card','bank']);
  function normalize(){
    document.querySelectorAll('.payCard[data-method="wallet"],.wallet').forEach(el=>el.remove());
    const stateKey='sbpPadelBookingSessionV2';let state={};try{state=JSON.parse(localStorage.getItem(stateKey)||'{}')}catch{}
    if(!supported.has(state.paymentMethod))state.paymentMethod='card';
    localStorage.setItem(stateKey,JSON.stringify({...state,updatedAt:Date.now()}));
    localStorage.setItem('sbpPadelMethod',state.paymentMethod);
    const chosen=document.querySelector(`.payCard[data-method="${state.paymentMethod}"]`)||document.querySelector('.payCard[data-method="card"]');
    if(chosen&&!chosen.classList.contains('selected'))chosen.click();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(normalize,0),{once:true});else setTimeout(normalize,0);
})();