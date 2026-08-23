(()=>{
  if(window.__sbpFlowRecovery)return;
  window.__sbpFlowRecovery=true;

  function resetTransientButtons(){
    const path=location.pathname.split('/').pop()||'index.html';
    if(path==='index.html'||path===''){
      const next=document.querySelector('#time .bookingBottom .primary');
      if(next&&/CHECKING AVAILABILITY|LOADING|PLEASE WAIT/i.test(next.textContent||'')){
        next.disabled=false;
        next.innerHTML='CONTINUE <span>→</span>';
      }
      const selectNext=document.querySelector('#select .bookingBottom .primary');
      if(selectNext&&selectNext.disabled&&/CHECKING|LOADING|PLEASE WAIT/i.test(selectNext.textContent||'')){
        selectNext.disabled=false;
        selectNext.innerHTML='CONTINUE <span>→</span>';
      }
    }
    if(path==='review-booking.html'){
      const btn=document.getElementById('toPayment');
      const cb=document.getElementById('livePolicyAccept');
      if(btn&&cb&&!/RESERVING COURT/i.test(btn.textContent||'')){
        btn.disabled=!cb.checked;
        btn.setAttribute('aria-disabled',String(!cb.checked));
      }
    }
    if(path==='payment.html'){
      const btn=document.getElementById('payButton');
      if(btn&&/PROCESSING/i.test(btn.textContent||'')){
        btn.disabled=false;
        const label=btn.querySelector('span');
        if(label)label.textContent='PAY & CONFIRM';
      }
    }
  }

  window.addEventListener('pageshow',()=>setTimeout(resetTransientButtons,0));
  window.addEventListener('focus',resetTransientButtons);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)resetTransientButtons()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',resetTransientButtons,{once:true});
  else resetTransientButtons();
})();