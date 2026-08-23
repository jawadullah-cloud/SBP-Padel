(()=>{
  'use strict';
  if(window.__SBPPlayerStability)return;window.__SBPPlayerStability=true;
  const peopleSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="2.5"/><path d="M4.8 16c.5-2.8 1.9-4.2 4.2-4.2s3.7 1.4 4.2 4.2"/><circle cx="16.5" cy="9" r="2"/><path d="M14.5 13c1.9-.6 4.1.5 4.7 3"/></svg>';
  function fixCourtCaps(){document.querySelectorAll('#select .courtOption .courtCap').forEach(x=>{x.innerHTML=peopleSvg+'<b>4</b>';x.classList.add('capIcon')})}
  const observer=new MutationObserver(fixCourtCaps);const list=document.querySelector('#select .courtList');if(list)observer.observe(list,{childList:true,subtree:true});fixCourtCaps();
  // Prevent ghost/double taps while keeping the first real tap responsive.
  let lastEl=null,lastAt=0;
  document.addEventListener('click',e=>{
    const el=e.target.closest?.('button,[data-nav],.courtOption,.slotRow,[data-live-manage],[data-live-pass],[data-live-rebook]');if(!el)return;
    const now=performance.now();if(el===lastEl&&now-lastAt<220){e.preventDefault();e.stopPropagation();return}lastEl=el;lastAt=now;
  },true);
})();