(()=>{
  'use strict';
  if(window.__SBPPassRouteLive)return;window.__SBPPassRouteLive=true;
  function install(){
    if(typeof window.SBPDeepRoute!=='function'){setTimeout(install,25);return}
    if(window.SBPDeepRoute.__livePassRoute)return;
    const base=window.SBPDeepRoute;
    function wrapped(url,...args){
      let page='';try{page=new URL(url,location.href).pathname.split('/').pop()}catch{page=String(url||'').split('?')[0]}
      if(page==='digital-pass.html'){
        const id=localStorage.getItem('sbpPadelSelectedBookingId')||localStorage.getItem('sbpPadelBookingUuid')||'';
        const target=`digital-pass.html${id?`?booking=${encodeURIComponent(id)}`:''}`;
        location.href=target;
        return;
      }
      return base(url,...args);
    }
    wrapped.__livePassRoute=true;window.SBPDeepRoute=wrapped;
  }
  install();
})();