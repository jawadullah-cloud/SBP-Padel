(()=>{
  'use strict';
  if(window.__SBPBookingRouterBridge)return;
  window.__SBPBookingRouterBridge=true;
  const path=location.pathname.split('/').pop()||'';
  if(!['review-booking.html','payment.html'].includes(path))return;

  // The legacy parent deep-router installs its iframe click interceptor after this
  // document finishes loading. Register first and delegate controlled booking
  // actions back to the V2 page handler so routing cannot bypass business logic.
  document.addEventListener('click',e=>{
    const target=e.target.closest?.('#toPayment,#payButton,.head .back');
    if(!target)return;
    if(target.disabled){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();return}
    const handler=target.onclick;
    if(typeof handler!=='function')return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    handler.call(target,e);
  },true);
})();
