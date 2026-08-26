(()=>{
  'use strict';
  if(window.__SBPMainNavigationHardening)return;
  window.__SBPMainNavigationHardening=true;

  // Recovery belongs only to the persistent bottom-navigation destinations.
  // Booking-flow screens have their own transition/scroll lifecycle and must not
  // be reset by this guard.
  const recoveryScreens=new Set(['home','bookings','venues','profile']);

  function clearStaleInteractionState(target){
    if(!recoveryScreens.has(target))return;
    recoveryScreens.forEach(id=>{
      const screen=document.getElementById(id);
      if(!screen)return;
      if(id===target){
        screen.style.pointerEvents='auto';
        screen.style.touchAction='pan-y';
        screen.style.webkitOverflowScrolling='touch';
      }else{
        // Remove inline values left behind by an earlier active state so the
        // normal inactive-screen CSS can make the screen non-interactive again.
        screen.style.pointerEvents='';
        screen.style.touchAction='';
        screen.style.webkitOverflowScrolling='';
      }
    });
    document.querySelectorAll('.sbp-pressed').forEach(el=>el.classList.remove('sbp-pressed'));

    const layer=document.getElementById('sbpDeepLayer');
    if(layer){
      const stale=layer.classList.contains('on')||layer.classList.contains('leaving')||layer.classList.contains('swapping')||layer.classList.contains('backing')||layer.classList.contains('sbp-preload-detail')||layer.classList.contains('sbp-reveal-detail');
      if(stale&&typeof window.SBPDeepClose==='function'){
        // Run only after the destination screen has become active. SBPDeepClose
        // restores the current active scroller, so doing this before navigation
        // can accidentally re-enable the screen being left.
        try{window.SBPDeepClose(false)}catch{}
      }else if(stale){
        layer.classList.remove('on','leaving','swapping','backing','native','sbp-preload-detail','sbp-reveal-detail');
        layer.style.pointerEvents='none';
        const frame=document.getElementById('sbpDeepFrame');
        if(frame)frame.src='about:blank';
      }
    }
  }

  function install(){
    const original=window.SBPNavigate;
    if(typeof original!=='function'||original.__sbpHardened)return false;
    const wrapped=function(target,...args){
      const result=original.call(this,target,...args);
      if(recoveryScreens.has(target))requestAnimationFrame(()=>clearStaleInteractionState(target));
      return result;
    };
    wrapped.__sbpHardened=true;
    wrapped.__sbpOriginal=original;
    window.SBPNavigate=wrapped;
    return true;
  }

  if(!install()){
    let tries=0;
    const timer=setInterval(()=>{tries++;if(install()||tries>200)clearInterval(timer)},20);
  }

  document.addEventListener('click',event=>{
    const nav=event.target.closest?.('nav [data-nav],header [data-nav],.homeBtn[data-nav]');
    if(!nav)return;
    const target=nav.dataset.nav;
    if(!recoveryScreens.has(target))return;
    requestAnimationFrame(()=>clearStaleInteractionState(target));
  },true);

  window.addEventListener('pageshow',()=>{
    const active=document.querySelector('.screen.active');
    if(active&&recoveryScreens.has(active.id))clearStaleInteractionState(active.id);
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)return;
    const active=document.querySelector('.screen.active');
    if(active&&recoveryScreens.has(active.id))clearStaleInteractionState(active.id);
  });
})();