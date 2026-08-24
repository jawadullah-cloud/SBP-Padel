(()=>{
  'use strict';
  if(window.__SBPBackIcons)return;window.__SBPBackIcons=true;
  const svg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>';
  const selector='.back,.pmBack,.ntBack';
  const style=document.createElement('style');style.textContent=`${selector}{display:inline-grid!important;place-items:center!important}${selector} svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.7;stroke-linecap:round;stroke-linejoin:round}`;document.head.appendChild(style);
  const upgrade=btn=>{if(!btn||btn.dataset.sbpBackIcon)return;btn.dataset.sbpBackIcon='1';btn.innerHTML=svg};
  const apply=root=>(root||document).querySelectorAll?.(selector)?.forEach(upgrade);
  apply(document);
  new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(n=>{if(n.nodeType===1){if(n.matches?.(selector))upgrade(n);apply(n)}}))).observe(document.documentElement,{childList:true,subtree:true});
  window.SBPRefreshBackIcons=()=>apply(document);
})();
