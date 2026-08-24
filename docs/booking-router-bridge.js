(()=>{
  'use strict';
  if(window.__SBPBookingRouterBridge)return;
  window.__SBPBookingRouterBridge=true;
  const path=location.pathname.split('/').pop()||'index.html';
  const mainPage=path==='index.html'||path==='';
  if(!mainPage&&!['review-booking.html','payment.html','payment-success.html'].includes(path))return;

  function route(url){
    if(window.parent&&window.parent!==window&&typeof window.parent.SBPDeepRoute==='function'){
      window.parent.SBPDeepRoute(url);
      return;
    }
    if(typeof window.SBPDeepRoute==='function'){
      window.SBPDeepRoute(url);
      return;
    }
    location.href=url;
  }

  function openBookings(){
    if(window.parent&&window.parent!==window){
      const p=window.parent;
      try{
        if(typeof p.SBPDeepRoute==='function')p.SBPDeepRoute('index.html?open=bookings');
        setTimeout(()=>{
          if(typeof p.SBPNavigate==='function')p.SBPNavigate('bookings');
          else p.document?.querySelector?.('[data-nav="bookings"]')?.click();
        },360);
        return;
      }catch{}
    }
    if(typeof window.SBPNavigate==='function'){
      window.SBPNavigate('bookings');
      return;
    }
    location.href='index.html?open=bookings';
  }

  function openFreshBookingPass(){
    const createdBookingId=localStorage.getItem('sbpPadelBookingUuid')||'';
    if(createdBookingId){
      localStorage.setItem('sbpPadelSelectedBookingId',createdBookingId);
      localStorage.removeItem('sbpPadelPassQrReady');
    }

    // Reuse the exact in-app pass implementation that is already proven from
    // My Bookings. Do not route confirmation through standalone digital-pass.html,
    // which has a separate renderer and was leaving the prototype square visible.
    if(window.parent&&window.parent!==window){
      const p=window.parent;
      try{
        if(typeof p.SBPDeepRoute==='function')p.SBPDeepRoute('index.html?open=pass');
        setTimeout(()=>{
          if(typeof p.SBPNavigate==='function')p.SBPNavigate('pass');
          if(typeof p.SBPHydrateNativePassQR==='function')p.SBPHydrateNativePassQR();
        },360);
        return;
      }catch{}
    }
    if(typeof window.SBPNavigate==='function'){
      window.SBPNavigate('pass');
      setTimeout(()=>window.SBPHydrateNativePassQR?.(),0);
      return;
    }
    location.href='index.html?open=pass';
  }

  function syncVisibleCourtToSession(){
    if(!mainPage)return;
    let session={};
    try{session=JSON.parse(localStorage.getItem('sbpPadelBookingSessionV2')||'{}')}catch{}
    if(session.courtId)return;
    const select=document.getElementById('select');
    if(!select?.classList.contains('active'))return;
    const card=select.querySelector('.courtOption.selected[data-court],.courtOption[data-court]');
    if(!card)return;
    card.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
  }

  if(mainPage){
    const installNavigateSync=()=>{
      if(typeof window.SBPNavigate!=='function'||window.SBPNavigate.__sbpCourtSync)return false;
      const original=window.SBPNavigate;
      const wrapped=function(screen,...args){
        const result=original.call(this,screen,...args);
        if(screen==='select')setTimeout(syncVisibleCourtToSession,0);
        return result;
      };
      wrapped.__sbpCourtSync=true;
      window.SBPNavigate=wrapped;
      return true;
    };
    if(!installNavigateSync()){
      const timer=setInterval(()=>{if(installNavigateSync())clearInterval(timer)},25);
      setTimeout(()=>clearInterval(timer),3000);
    }
    window.addEventListener('pageshow',()=>setTimeout(syncVisibleCourtToSession,0));
    document.addEventListener('click',e=>{
      if(e.target.closest?.('[data-nav="select"]'))setTimeout(syncVisibleCourtToSession,0);
    },true);
    return;
  }

  if(path==='payment-success.html'){
    const createdBookingId=localStorage.getItem('sbpPadelBookingUuid')||'';
    if(createdBookingId){
      localStorage.setItem('sbpPadelSelectedBookingId',createdBookingId);
      localStorage.removeItem('sbpPadelPassQrReady');
    }
    const bookings=document.getElementById('backHome');
    if(bookings){
      bookings.textContent='MY BOOKINGS';
      bookings.setAttribute('aria-label','Open My Bookings');
    }
  }

  document.addEventListener('click',e=>{
    const successTarget=e.target.closest?.('#viewPass,#backHome');
    if(path==='payment-success.html'&&successTarget){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      if(successTarget.id==='viewPass')openFreshBookingPass();
      else openBookings();
      return;
    }

    const target=e.target.closest?.('#toPayment,#payButton,.head .back');
    if(!target)return;
    if(target.disabled){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();return}
    const handler=target.onclick;
    if(typeof handler!=='function')return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    handler.call(target,e);
  },true);
})();
