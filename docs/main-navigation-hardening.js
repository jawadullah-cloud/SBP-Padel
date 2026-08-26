(()=>{
  'use strict';
  if(window.__SBPMainNavigationHardening)return;
  window.__SBPMainNavigationHardening=true;

  const mainScreens=new Set(['home','bookings','venues','profile','nishtar','select','time','confirm','pass']);

  function clearStaleInteractionState(target){
    document.querySelectorAll('.screen').forEach(screen=>{
      screen.style.pointerEvents='';
      screen.style.touchAction='';
      if(screen.id===target){
        screen.style.pointerEvents='auto';
        screen.style.touchAction='pan-y';
        screen.style.webkitOverflowScrolling='touch';
      }
    });
    document.querySelectorAll('.sbp-pressed').forEach(el=>el.classList.remove('sbp-pressed'));

    const layer=document.getElementById('sbpDeepLayer');
    if(layer&&mainScreens.has(target)){
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

  function install(){
    const original=window.SBPNavigate;
    if(typeof original!=='function'||original.__sbpHardened)return false;
    const wrapped=function(target,...args){
      clearStaleInteractionState(target);
      const result=original.call(this,target,...args);
      requestAnimationFrame(()=>clearStaleInteractionState(target));
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
    if(!mainScreens.has(target))return;
    requestAnimationFrame(()=>clearStaleInteractionState(target));
  },true);

  window.addEventListener('pageshow',()=>{
    const active=document.querySelector('.screen.active');
    if(active)clearStaleInteractionState(active.id);
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)return;
    const active=document.querySelector('.screen.active');
    if(active)clearStaleInteractionState(active.id);
  });
})();