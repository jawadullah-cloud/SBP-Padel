(()=>{
  if(window.__sbpReviewLiveUI)return;
  window.__sbpReviewLiveUI=true;
  if(!/review-booking\.html$/i.test(location.pathname))return;

  const style=document.createElement('style');
  style.textContent=`
    #livePolicy{display:block!important;cursor:default!important;padding:0!important;overflow:hidden!important;border:1px solid var(--line)!important;background:var(--surface)!important;border-radius:16px!important;color:#c2cec9!important}
    #livePolicy>div:first-child{padding:12px 13px!important;border-bottom:1px solid var(--line)!important;background:linear-gradient(135deg,#102319,#0c1919)!important}
    #livePolicy>div:first-child b{color:var(--text)!important;font-size:11px!important}
    #livePolicy>div:nth-child(2){padding:12px 13px!important;margin:0!important;white-space:pre-wrap!important;line-height:1.55!important;font-size:9px!important}
    #livePolicy label{display:flex!important;align-items:flex-start!important;gap:10px!important;margin:0!important;padding:12px 13px!important;border-top:1px solid var(--line)!important;background:var(--surface2)!important;color:var(--text)!important;font-size:9px!important;line-height:1.45!important;cursor:pointer!important}
    #livePolicyAccept{appearance:none!important;width:20px!important;height:20px!important;min-width:20px!important;margin:0!important;border:1px solid #486159!important;border-radius:6px!important;background:var(--surface)!important;position:relative!important}
    #livePolicyAccept:checked{background:var(--brand)!important;border-color:var(--brand)!important}
    #livePolicyAccept:checked:after{content:'✓';position:absolute;inset:0;display:grid;place-items:center;color:#071006;font-size:12px;font-weight:900}
  `;
  document.head.appendChild(style);

  function paint(){
    const checkbox=document.getElementById('livePolicyAccept');
    const button=document.getElementById('toPayment');
    if(!checkbox||!button)return false;
    const enabled=checkbox.checked&&!button.dataset.sbpBusy;
    if(!button.dataset.sbpBusy)button.disabled=!checkbox.checked;
    button.setAttribute('aria-disabled',String(!enabled));
    if(enabled){
      button.style.setProperty('background','linear-gradient(135deg,var(--brand),#73d90f)','important');
      button.style.setProperty('color','#071006','important');
      button.style.setProperty('border-color','transparent','important');
      button.style.setProperty('cursor','pointer','important');
      button.style.setProperty('opacity','1','important');
    }else{
      button.style.setProperty('background','#303a37','important');
      button.style.setProperty('color','#77817d','important');
      button.style.setProperty('border','1px solid #414b47','important');
      button.style.setProperty('box-shadow','none','important');
      button.style.setProperty('cursor','not-allowed','important');
      button.style.setProperty('opacity','1','important');
      button.style.setProperty('transform','none','important');
    }
    if(!checkbox.dataset.sbpUiBound){
      checkbox.dataset.sbpUiBound='1';
      checkbox.addEventListener('change',()=>requestAnimationFrame(paint));
    }
    return true;
  }

  if(!paint()){
    const observer=new MutationObserver(()=>{if(paint())observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();