(()=>{
  'use strict';
  const hide=()=>{
    document.querySelectorAll('.social').forEach(btn=>{
      if(/google/i.test(btn.textContent||'')){
        btn.hidden=true;
        btn.setAttribute('aria-hidden','true');
        const divider=btn.previousElementSibling;
        if(divider?.classList?.contains('divider')) divider.hidden=true;
      }
    });
  };
  hide();
  document.addEventListener('DOMContentLoaded',hide,{once:true});
  new MutationObserver(hide).observe(document.documentElement,{childList:true,subtree:true});
})();
