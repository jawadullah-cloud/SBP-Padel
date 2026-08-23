(()=>{
  'use strict';
  if(window.__SBPPlayerStability)return;window.__SBPPlayerStability=true;
  const peopleSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="2.5"/><path d="M4.8 16c.5-2.8 1.9-4.2 4.2-4.2s3.7 1.4 4.2 4.2"/><circle cx="16.5" cy="9" r="2"/><path d="M14.5 13c1.9-.6 4.1.5 4.7 3"/></svg>';
  function decorateCap(x){
    if(!x||x.dataset.sbpCapDecorated==='1')return;
    x.dataset.sbpCapDecorated='1';
    x.classList.add('capIcon');
    x.innerHTML=peopleSvg+'<b>4</b>';
  }
  function fixCourtCaps(root=document){root.querySelectorAll?.('#select .courtOption .courtCap').forEach(decorateCap)}
  const list=document.querySelector('#select .courtList');
  if(list){
    const observer=new MutationObserver(records=>{
      for(const record of records){
        for(const node of record.addedNodes){
          if(node.nodeType!==1)continue;
          if(node.matches?.('.courtCap'))decorateCap(node);
          node.querySelectorAll?.('.courtCap').forEach(decorateCap);
        }
      }
    });
    observer.observe(list,{childList:true,subtree:true});
  }
  fixCourtCaps();
})();