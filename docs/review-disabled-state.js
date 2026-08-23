(()=>{
  if(window.__sbpReviewDisabledState)return;
  window.__sbpReviewDisabledState=true;
  if(!/review-booking\.html$/i.test(location.pathname))return;

  const apply=()=>{
    const btn=document.getElementById('toPayment');
    if(!btn)return false;
    const disabled=btn.disabled||btn.getAttribute('aria-disabled')==='true';
    if(disabled){
      btn.style.setProperty('background','#303a37','important');
      btn.style.setProperty('background-image','none','important');
      btn.style.setProperty('color','#77817d','important');
      btn.style.setProperty('border','1px solid #414b47','important');
      btn.style.setProperty('box-shadow','none','important');
      btn.style.setProperty('opacity','1','important');
      btn.style.setProperty('filter','none','important');
      btn.style.setProperty('cursor','not-allowed','important');
      btn.style.setProperty('transform','none','important');
    }else{
      btn.style.setProperty('background','linear-gradient(135deg,var(--brand),#73d90f)','important');
      btn.style.removeProperty('background-image');
      btn.style.setProperty('color','#071006','important');
      btn.style.setProperty('border-color','transparent','important');
      btn.style.removeProperty('box-shadow');
      btn.style.setProperty('opacity','1','important');
      btn.style.setProperty('cursor','pointer','important');
      btn.style.removeProperty('filter');
      btn.style.removeProperty('transform');
    }
    return true;
  };

  const bind=()=>{
    const btn=document.getElementById('toPayment');
    if(!btn)return false;
    apply();
    new MutationObserver(apply).observe(btn,{attributes:true,attributeFilter:['disabled','aria-disabled','class','style']});
    document.addEventListener('change',e=>{
      if(e.target?.id==='livePolicyAccept'||e.target?.id==='acceptBookingPolicy')setTimeout(apply,0);
    },true);
    return true;
  };

  if(!bind()){
    const observer=new MutationObserver(()=>{if(bind())observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();