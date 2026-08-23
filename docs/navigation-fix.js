(()=>{
  if(window.__sbpNavigationFix)return;
  window.__sbpNavigationFix=true;

  function resetTransientBookingState(){
    const proceed=document.querySelector('#time .bookingBottom .primary');
    if(proceed){
      proceed.disabled=false;
      proceed.removeAttribute('aria-disabled');
      if(/CHECKING AVAILABILITY|CHECKING|LOADING/i.test(proceed.textContent||''))proceed.innerHTML='CONTINUE <span>→</span>';
    }
    document.querySelectorAll('button').forEach(btn=>{
      if(/RESERVING COURT|PROCESSING/i.test(btn.textContent||'')){
        btn.disabled=false;
        if(btn.id==='toPayment')btn.textContent='CONTINUE TO PAYMENT →';
        if(btn.id==='payButton'){
          const span=btn.querySelector('span');
          if(span)span.textContent='PAY & CONFIRM';
        }
      }
    });
  }

  function openMainScreen(screen){
    resetTransientBookingState();
    if(window.SBPNavigate){window.SBPNavigate(screen);return true}
    const target=document.querySelector(`[data-nav="${screen}"]`);
    if(target){target.click();return true}
    return false;
  }

  function openDeep(url){
    if(window.SBPDeepRoute){window.SBPDeepRoute(url);return true}
    return false;
  }

  window.addEventListener('pageshow',resetTransientBookingState);
  window.addEventListener('focus',resetTransientBookingState);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)resetTransientBookingState()});

  window.addEventListener('message',e=>{
    if(e.origin!==location.origin)return;
    if(e.data?.type==='sbp-open-main'&&e.data.screen){
      openMainScreen(e.data.screen);
    }
  });

  document.addEventListener('click',e=>{
    const manage=e.target.closest?.('[data-live-manage]');
    if(manage){
      const id=manage.dataset.liveManage;
      if(id&&openDeep(`booking-detail.html?booking=${encodeURIComponent(id)}`)){
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
        localStorage.setItem('sbpPadelSelectedBookingId',id);
      }
      return;
    }

    const history=e.target.closest?.('[data-history]');
    if(history&&window.SBPDeepRoute){
      const type=history.hasAttribute('data-cancelled')?'cancelled':'past';
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      openDeep(`booking-history-detail.html?type=${type}&id=${encodeURIComponent(history.dataset.history||'')}`);
      return;
    }

    const successBookings=e.target.closest?.('#backHome,[data-success-bookings]');
    if(successBookings&&/payment-success\.html$/i.test(location.pathname)){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      if(window.parent&&window.parent!==window){
        window.parent.postMessage({type:'sbp-open-main',screen:'bookings'},location.origin);
      }else{
        location.href='index.html?open=bookings';
      }
    }
  },true);

  if(/payment-success\.html$/i.test(location.pathname)){
    const btn=document.getElementById('backHome');
    if(btn){
      btn.textContent='MY BOOKINGS';
      btn.setAttribute('data-success-bookings','1');
    }
  }

  resetTransientBookingState();
})();