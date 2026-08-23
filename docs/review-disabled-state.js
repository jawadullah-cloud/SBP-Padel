(()=>{
  if(window.__sbpReviewDisabledState)return;
  window.__sbpReviewDisabledState=true;
  if(!/review-booking\.html$/i.test(location.pathname))return;

  const apply=()=>{
    const btn=document.getElementById('toPayment');
    if(!btn)return false;
    const disabled=btn.disabled||btn.getAttribute('aria-disabled')==='true';
    btn.dataset.sbpDisabled=disabled?'1':'0';
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
      btn.style.setProperty('background-image','linear-gradient(135deg,var(--brand),#73d90f)','important');
      btn.style.setProperty('color','#071006','important');
      btn.style.setProperty('border','0','important');
      btn.style.setProperty('box-shadow','none','important');
      btn.style.setProperty('opacity','1','important');
      btn.style.setProperty('filter','none','important');
      btn.style.setProperty('cursor','pointer','important');
      btn.style.setProperty('transform','none','important');
    }
    return true;
  };

  const bind=()=>{
    const btn=document.getElementById('toPayment');
    if(!btn||btn.dataset.sbpDisabledBound==='1')return !!btn;
    btn.dataset.sbpDisabledBound='1';
    apply();
    // Observe only state attributes. Observing style here creates a self-triggering loop
    // because apply() intentionally updates inline styles.
    new MutationObserver(()=>apply()).observe(btn,{attributes:true,attributeFilter:['disabled','aria-disabled']});
    document.addEventListener('change',e=>{
      if(e.target?.id==='livePolicyAccept'||e.target?.id==='acceptBookingPolicy')requestAnimationFrame(apply);
    },true);
    return true;
  };

  if(!bind()){
    const observer=new MutationObserver(()=>{if(bind())observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();