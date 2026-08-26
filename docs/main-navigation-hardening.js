(()=>{
  'use strict';
  if(window.__SBPMainNavigationHardening)return;
  window.__SBPMainNavigationHardening=true;

  const recoveryScreens=new Set(['home','bookings','venues','profile']);

  function deactivateAbandonedFlowScreens(target){
    if(!recoveryScreens.has(target))return;

    const review=document.getElementById('reviewNative');
    if(review&&review.id!==target){
      review.classList.remove('active');
      review.style.pointerEvents='none';
      review.style.touchAction='';
      review.style.webkitOverflowScrolling='';
    }

    document.querySelectorAll('.app>.screen:not(.active)').forEach(screen=>{
      if(recoveryScreens.has(screen.id))return;
      if(screen.style.pointerEvents==='auto')screen.style.pointerEvents='none';
    });

    const nav=document.querySelector('.app>nav,nav');
    if(nav)nav.classList.remove('flowHidden');
  }

  function finishPersistentRecovery(target){
    if(!recoveryScreens.has(target))return;

    recoveryScreens.forEach(id=>{
      const screen=document.getElementById(id);
      if(!screen)return;
      if(id===target){
        screen.style.pointerEvents='auto';
        screen.style.touchAction='pan-y';
        screen.style.webkitOverflowScrolling='touch';
      }else{
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
        try{window.SBPDeepClose(false)}catch{}
      }else if(stale){
        layer.classList.remove('on','leaving','swapping','backing','native','sbp-preload-detail','sbp-reveal-detail');
        layer.style.pointerEvents='none';
        const frame=document.getElementById('sbpDeepFrame');
        if(frame)frame.src='about:blank';
      }
    }
  }

  function recoverPersistentTarget(target){
    if(!recoveryScreens.has(target))return;
    // Flow screens that can physically cover the destination must be disabled
    // immediately after SBPNavigate() switches .active classes. Deep-layer
    // teardown stays on the next frame because it restores the active scroller.
    deactivateAbandonedFlowScreens(target);
    requestAnimationFrame(()=>finishPersistentRecovery(target));
  }

  function install(){
    const original=window.SBPNavigate;
    if(typeof original!=='function'||original.__sbpHardened)return false;
    const wrapped=function(target,...args){
      const result=original.call(this,target,...args);
      recoverPersistentTarget(target);
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
    // Capture-phase pre-cleanup ensures an already-invisible Review cannot
    // swallow the destination's first interaction while navigation settles.
    deactivateAbandonedFlowScreens(target);
    requestAnimationFrame(()=>finishPersistentRecovery(target));
  },true);

  window.addEventListener('pageshow',()=>{
    const active=document.querySelector('.screen.active');
    if(active&&recoveryScreens.has(active.id))recoverPersistentTarget(active.id);
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)return;
    const active=document.querySelector('.screen.active');
    if(active&&recoveryScreens.has(active.id))recoverPersistentTarget(active.id);
  });
})();