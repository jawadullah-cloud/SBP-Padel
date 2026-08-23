(function(){
  'use strict';
  if(window.__SBPBookingsNavigation)return;
  window.__SBPBookingsNavigation=true;

  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='bookings-module.css?v=20260823-spa1';
  document.head.appendChild(css);

  const root=document.getElementById('bookings');
  if(!root)return;

  function waitForRouter(){
    if(typeof window.SBPDeepRoute==='function')return Promise.resolve(window.SBPDeepRoute);
    return new Promise((resolve,reject)=>{
      const started=Date.now();
      const timer=setInterval(()=>{
        if(typeof window.SBPDeepRoute==='function'){
          clearInterval(timer);
          resolve(window.SBPDeepRoute);
          return;
        }
        if(Date.now()-started>2500){
          clearInterval(timer);
          reject(new Error('Navigation is still loading. Please try again.'));
        }
      },16);
    });
  }

  async function openDeep(url){
    try{
      const route=await waitForRouter();
      route(url);
    }catch(err){
      window.SBPPadelAPI?.toast?.(err.message,true);
    }
  }

  function openMain(screen){
    if(typeof window.SBPNavigate==='function'){
      window.SBPNavigate(screen);
      return;
    }
    const target=document.querySelector(`[data-nav="${CSS.escape(screen)}"]`);
    target?.click();
  }

  // Capture phase is intentional. The live bookings renderer replaces this
  // section asynchronously and some legacy button handlers use location.href.
  // We own navigation before those handlers can cause a first-click page reload.
  root.addEventListener('click',async e=>{
    const manage=e.target.closest?.('[data-live-manage],[data-open]');
    if(manage){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const id=manage.dataset.liveManage||localStorage.getItem('sbpPadelSelectedBookingId')||'';
      if(id)localStorage.setItem('sbpPadelSelectedBookingId',id);
      await openDeep(`booking-detail.html${id?`?booking=${encodeURIComponent(id)}`:''}`);
      return;
    }

    const history=e.target.closest?.('[data-history]');
    if(history){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const type=history.hasAttribute('data-cancelled')?'cancelled':'past';
      await openDeep(`booking-history-detail.html?type=${type}&id=${encodeURIComponent(history.dataset.history||'')}`);
      return;
    }

    const rebook=e.target.closest?.('[data-live-rebook],[data-rebook]');
    if(rebook){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      openMain('nishtar');
    }
  },true);
})();
