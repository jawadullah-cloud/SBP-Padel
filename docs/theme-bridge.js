(()=>{
  'use strict';
  const KEY='sbpPadelTheme';
  const valid=t=>t==='light'||t==='dark';
  function current(){
    let t=localStorage.getItem(KEY);
    if(!valid(t)&&window.parent&&window.parent!==window){try{t=window.parent.document.body.dataset.theme}catch{}}
    return valid(t)?t:'dark';
  }
  function apply(t=current()){
    if(!valid(t))t='dark';
    document.body.dataset.theme=t;
    document.documentElement.dataset.theme=t;
    document.documentElement.style.colorScheme=t;
  }
  apply();
  window.SBPApplyTheme=apply;
  window.addEventListener('storage',e=>{if(e.key===KEY)apply(e.newValue)});
  window.addEventListener('pageshow',()=>apply());
})();