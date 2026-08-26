(()=>{
  'use strict';
  if(window.__SBPBookingsActivationGuard)return;
  window.__SBPBookingsActivationGuard=true;
  const root=document.getElementById('bookings');
  if(!root)return;
  let timer=0,lastActive=false;
  const refresh=()=>{
    clearTimeout(timer);
    timer=setTimeout(()=>{
      if(!root.classList.contains('active'))return;
      if(typeof window.SBPRefreshBookings==='function'){
        Promise.resolve(window.SBPRefreshBookings()).catch(()=>{});
        return;
      }
      let tries=0;
      const wait=setInterval(()=>{
        if(!root.classList.contains('active')||++tries>40){clearInterval(wait);return}
        if(typeof window.SBPRefreshBookings==='function'){
          clearInterval(wait);
          Promise.resolve(window.SBPRefreshBookings()).catch(()=>{});
        }
      },25);
    },0);
  };
  const sync=()=>{
    const active=root.classList.contains('active');
    if(active&&!lastActive)refresh();
    lastActive=active;
  };
  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['class']});
  document.addEventListener('click',event=>{
    const target=event.target.closest?.('[data-nav="bookings"]');
    if(!target)return;
    setTimeout(refresh,0);
  },true);
  window.addEventListener('pageshow',()=>{if(root.classList.contains('active'))refresh()});
  sync();
})();
