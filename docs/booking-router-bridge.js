(()=>{
  'use strict';
  if(window.__SBPBookingRouterBridge)return;
  window.__SBPBookingRouterBridge=true;
  const path=location.pathname.split('/').pop()||'index.html';
  const mainPage=path==='index.html'||path==='';
  if(!mainPage&&!['review-booking.html','payment.html','payment-success.html'].includes(path))return;

  function route(url){
    if(window.parent&&window.parent!==window&&typeof window.parent.SBPDeepRoute==='function'){window.parent.SBPDeepRoute(url);return}
    if(typeof window.SBPDeepRoute==='function'){window.SBPDeepRoute(url);return}
    location.href=url;
  }
  function openBookings(){route('index.html?open=bookings')}
  function openFreshBookingPass(){
    const createdBookingId=localStorage.getItem('sbpPadelBookingUuid')||'';
    if(createdBookingId){localStorage.setItem('sbpPadelSelectedBookingId',createdBookingId);localStorage.removeItem('sbpPadelPassQrReady')}
    // Use the live standalone pass. It resolves the selected booking UUID and
    // fetches the real QR from the backend, avoiding the legacy hard-coded pass
    // embedded in index.html and the stale history entry it created.
    route('digital-pass.html');
  }
  function syncVisibleCourtToSession(){
    if(!mainPage)return;let session={};try{session=JSON.parse(localStorage.getItem('sbpPadelBookingSessionV2')||'{}')}catch{}
    if(session.courtId)return;const select=document.getElementById('select');if(!select?.classList.contains('active'))return;
    const card=select.querySelector('.courtOption.selected[data-court],.courtOption[data-court]');if(card)card.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
  }
  if(mainPage){
    const install=()=>{if(typeof window.SBPNavigate!=='function'||window.SBPNavigate.__sbpCourtSync)return false;const original=window.SBPNavigate;const wrapped=function(screen,...args){const result=original.call(this,screen,...args);if(screen==='select')setTimeout(syncVisibleCourtToSession,0);return result};wrapped.__sbpCourtSync=true;window.SBPNavigate=wrapped;return true};
    if(!install()){const timer=setInterval(()=>{if(install())clearInterval(timer)},25);setTimeout(()=>clearInterval(timer),3000)}
    window.addEventListener('pageshow',()=>setTimeout(syncVisibleCourtToSession,0));document.addEventListener('click',e=>{if(e.target.closest?.('[data-nav="select"]'))setTimeout(syncVisibleCourtToSession,0)},true);return;
  }
  if(path==='payment-success.html'){
    const createdBookingId=localStorage.getItem('sbpPadelBookingUuid')||'';if(createdBookingId){localStorage.setItem('sbpPadelSelectedBookingId',createdBookingId);localStorage.removeItem('sbpPadelPassQrReady')}
    const bookings=document.getElementById('backHome');if(bookings){bookings.textContent='MY BOOKINGS';bookings.setAttribute('aria-label','Open My Bookings')}
  }
  document.addEventListener('click',e=>{
    const success=e.target.closest?.('#viewPass,#backHome');if(path==='payment-success.html'&&success){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();success.id==='viewPass'?openFreshBookingPass():openBookings();return}
    const target=e.target.closest?.('#toPayment,#payButton,.head .back');if(!target)return;if(target.disabled){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();return}
    const handler=target.onclick;if(typeof handler!=='function')return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();handler.call(target,e);
  },true);
})();
