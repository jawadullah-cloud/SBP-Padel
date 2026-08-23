(()=>{
  'use strict';
  if(window.__SBPDeepRouteSmooth)return;
  window.__SBPDeepRouteSmooth=true;

  const style=document.createElement('style');
  style.textContent=`
    #sbpDeepLayer.sbp-preload-detail{opacity:0!important;transform:translateX(24px)!important;pointer-events:none!important}
    #sbpDeepLayer.sbp-reveal-detail{opacity:1!important;transform:none!important;transition:opacity .20s ease,transform .28s cubic-bezier(.2,.8,.2,1)!important}
    #sbpDeepLayer.sbp-preload-detail #sbpDeepFrame{opacity:0!important}
    #sbpDeepLayer.sbp-reveal-detail #sbpDeepFrame{opacity:1!important;transition:opacity .14s ease!important}
  `;
  document.head.appendChild(style);

  let installed=false;
  function install(){
    if(installed||typeof window.SBPDeepRoute!=='function')return false;
    const original=window.SBPDeepRoute;
    window.SBPDeepRoute=function(url,...args){
      let page='';
      try{page=new URL(url,location.href).pathname.split('/').pop()}catch{page=String(url||'').split('?')[0]}
      if(page!=='booking-detail.html')return original.call(this,url,...args);

      const layer=document.getElementById('sbpDeepLayer');
      const frame=document.getElementById('sbpDeepFrame');
      if(!layer||!frame)return original.call(this,url,...args);

      layer.classList.remove('sbp-reveal-detail');
      layer.classList.add('sbp-preload-detail');
      let revealed=false;
      const reveal=()=>{
        if(revealed)return;
        revealed=true;
        layer.classList.remove('sbp-preload-detail','swapping');
        layer.classList.add('on','sbp-reveal-detail');
        requestAnimationFrame(()=>setTimeout(()=>layer.classList.remove('sbp-reveal-detail'),300));
      };
      frame.addEventListener('load',()=>{
        if(frame.src==='about:blank')return;
        requestAnimationFrame(()=>requestAnimationFrame(reveal));
      },{once:true});
      const result=original.call(this,url,...args);
      // Never strand navigation if a browser suppresses the expected load event.
      setTimeout(reveal,900);
      return result;
    };
    installed=true;
    return true;
  }

  if(!install()){
    let tries=0;
    const timer=setInterval(()=>{tries++;if(install()||tries>200)clearInterval(timer)},20);
  }
})();
