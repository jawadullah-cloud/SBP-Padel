(()=>{
  'use strict';
  if(window.__SBPAndroidBack)return;window.__SBPAndroidBack=true;
  function visible(el){if(!el)return false;const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&el.getClientRects().length>0}
  window.SBPHandleAndroidBack=()=>{
    try{
      const deep=document.getElementById('sbpDeepLayer');
      if(deep?.classList.contains('on')&&typeof window.SBPDeepBack==='function'){window.SBPDeepBack();return true}
      const active=document.querySelector('.screen.active');
      if(active){
        if(active.id==='reviewNative'){const b=active.querySelector('#rnBack');if(b){b.click();return true}}
        const explicit=[...active.querySelectorAll('[data-pm-back],.ntBack,.head .back,.back')].find(visible);
        if(explicit){explicit.click();return true}
        if(active.id&&active.id!=='home'&&typeof window.SBPNavigate==='function'){window.SBPNavigate('home');return true}
      }
      const standalone=[...document.querySelectorAll('.head .back,.back')].find(visible);
      if(standalone){standalone.click();return true}
    }catch(err){console.warn('[SBP Android back]',err)}
    return false;
  };
})();