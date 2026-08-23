(()=>{
  'use strict';
  if(window.__SBPBookingRouterBridge)return;
  window.__SBPBookingRouterBridge=true;
  const path=location.pathname.split('/').pop()||'';
  if(!['review-booking.html','payment.html','payment-success.html'].includes(path))return;

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

  if(path==='payment-success.html'){
    const bookings=document.getElementById('backHome');
    if(bookings){
      bookings.textContent='MY BOOKINGS';
      bookings.setAttribute('aria-label','Open My Bookings');
    }
  }

  // Routing is centralized here. Review/payment business actions remain owned by
  // the V2 booking controller; the success screen only delegates destinations.
  document.addEventListener('click',e=>{
    const successTarget=e.target.closest?.('#viewPass,#backHome');
    if(path==='payment-success.html'&&successTarget){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      if(successTarget.id==='viewPass')route('digital-pass.html');
      else route('index.html?open=bookings');
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
