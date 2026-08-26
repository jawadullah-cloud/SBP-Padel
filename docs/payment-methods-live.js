(()=>{
  'use strict';
  if(window.__SBPPaymentMethodsLive)return;window.__SBPPaymentMethodsLive=true;
  const supported=new Set(['card','bank']);
  const stateKey='sbpPadelBookingSessionV2';
  const API=()=>window.SBPApiBase?.()||(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function load(){try{return JSON.parse(localStorage.getItem(stateKey)||'{}')}catch{return{}}}
  function save(state){state.updatedAt=Date.now();localStorage.setItem(stateKey,JSON.stringify(state));if(state.bookingUuid)localStorage.setItem('sbpPadelBookingUuid',state.bookingUuid);if(state.bookingCode)localStorage.setItem('sbpPadelBookingId',state.bookingCode);if(state.paymentUuid)localStorage.setItem('sbpPadelPaymentUuid',state.paymentUuid)}
  async function api(path,opts={}){const headers={'Content-Type':'application/json',...(opts.headers||{})},token=localStorage.getItem('sbpPadelAccessToken');if(token)headers.Authorization=`Bearer ${token}`;const res=await fetch(`${API()}${path}`,{...opts,headers,cache:'no-store'});let body=null;try{body=await res.json()}catch{}if(!res.ok){const err=new Error(body?.detail||`Request failed (${res.status})`);err.status=res.status;throw err}return body}
  function go(url){if(window.parent&&window.parent!==window&&typeof window.parent.SBPDeepRoute==='function'){window.parent.SBPDeepRoute(url);return}if(typeof window.SBPDeepRoute==='function'){window.SBPDeepRoute(url);return}location.href=url}
  function toast(message,bad=false){let el=document.getElementById('paymentProviderToast');if(!el){el=document.createElement('div');el.id='paymentProviderToast';Object.assign(el.style,{position:'fixed',left:'50%',bottom:'72px',transform:'translateX(-50%)',zIndex:'99999',maxWidth:'340px',padding:'10px 13px',borderRadius:'12px',font:'700 10px Inter,sans-serif',boxShadow:'0 14px 40px #0008'});document.body.appendChild(el)}el.textContent=message;el.style.background=bad?'#3a1717':'#10271d';el.style.color=bad?'#ffaaaa':'#d9ffc0';el.style.border=`1px solid ${bad?'#783838':'#376844'}`;clearTimeout(el._t);el._t=setTimeout(()=>el.remove(),3200)}
  function normalize(){
    document.querySelectorAll('.payCard[data-method="wallet"],.wallet').forEach(el=>el.remove());
    const state=load();
    if(!supported.has(state.paymentMethod))state.paymentMethod='card';
    save(state);
    localStorage.setItem('sbpPadelMethod',state.paymentMethod);
    const chosen=document.querySelector(`.payCard[data-method="${state.paymentMethod}"]`)||document.querySelector('.payCard[data-method="card"]');
    if(chosen&&!chosen.classList.contains('selected'))chosen.click();
    installProviderCheckout();
  }
  function awaitingCard(init){
    let card=document.getElementById('providerAwaiting');if(card)return card;
    card=document.createElement('section');card.id='providerAwaiting';card.className='secure';card.style.cssText='display:block;margin-top:12px;padding:13px';
    const reference=init?.client_payload?.psid||init?.provider_reference||'';
    card.innerHTML=`<div style="font:800 9px var(--sport);letter-spacing:.08em;color:var(--brand)">PAYMENT REQUEST CREATED</div><div style="font-size:9px;line-height:1.55;margin-top:6px;color:var(--muted)">Complete payment using the provider instructions. Your booking will confirm only after verified server-side payment confirmation.</div>${reference?`<div style="margin-top:10px;padding:10px;border-radius:10px;background:var(--surface2)"><small style="display:block;color:var(--muted);font-size:8px">PAYMENT REFERENCE / PSID</small><div style="display:flex;gap:8px;align-items:center;margin-top:4px"><b id="providerReference" style="font-size:12px;word-break:break-all;flex:1;color:var(--text)"></b><button id="copyProviderReference" type="button" style="border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--text);padding:7px 9px;font:800 8px var(--sport)">COPY</button></div></div>`:''}<div id="providerPaymentStatus" style="margin-top:10px;font-size:9px;color:var(--brand)">Waiting for payment confirmation…</div><div style="display:flex;gap:8px;margin-top:10px">${init?.redirect_url?'<button id="openProviderPayment" type="button" style="flex:1;border:0;border-radius:10px;background:var(--brand);color:#071006;padding:10px;font:900 9px var(--sport)">OPEN PAYMENT</button>':''}<button id="checkProviderPayment" type="button" style="flex:1;border:1px solid var(--line);border-radius:10px;background:var(--surface2);color:var(--text);padding:10px;font:900 9px var(--sport)">CHECK STATUS</button></div>`;
    const bottom=document.querySelector('.bottom');bottom?.parentNode?.insertBefore(card,bottom);
    if(reference){const ref=card.querySelector('#providerReference');if(ref)ref.textContent=reference;card.querySelector('#copyProviderReference')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(reference);toast('Payment reference copied.')}catch{toast('Unable to copy automatically.',true)}})}
    card.querySelector('#openProviderPayment')?.addEventListener('click',()=>{if(init.redirect_url)location.href=init.redirect_url});
    return card;
  }
  async function paymentState(state,statusEl){
    if(!state.paymentUuid||!state.bookingUuid)return false;
    const [payment,booking]=await Promise.all([api(`/payments/${state.paymentUuid}`),api(`/bookings/${state.bookingUuid}`)]);
    state.paymentStatus=payment.status;save(state);
    if(payment.status==='paid'&&['confirmed','rescheduled','completed'].includes(booking.status)){
      state.status='confirmed';save(state);localStorage.setItem('sbpPadelNotificationsVersion',String(Date.now()));try{window.parent?.SBPRefreshNotifications?.()}catch{}try{await window.parent?.SBPBookingFlowSync?.()}catch{}go('payment-success.html');return true
    }
    if(payment.status==='failed'||booking.status==='payment_failed'){
      if(statusEl){statusEl.textContent='Payment failed. Please start the booking again.';statusEl.style.color='#ff8585'}return true
    }
    if(payment.status==='paid'&&['expired','cancelled','venue_cancelled'].includes(booking.status)){
      if(statusEl){statusEl.textContent='Payment was received after this booking could no longer be confirmed. A refund/reconciliation review has been opened.';statusEl.style.color='#f0c36b'}return true
    }
    if(statusEl)statusEl.textContent='Waiting for verified payment confirmation…';return false
  }
  async function waitForProvider(state,init){
    const card=awaitingCard(init),statusEl=card.querySelector('#providerPaymentStatus'),check=card.querySelector('#checkProviderPayment');let stopped=false;
    check.onclick=async()=>{check.disabled=true;try{stopped=await paymentState(state,statusEl)}catch(err){toast(err.message,true)}finally{check.disabled=false}};
    for(let i=0;i<40&&!stopped;i++){await sleep(i===0?900:3000);try{stopped=await paymentState(state,statusEl)}catch(err){console.warn('[SBP payment provider poll]',err)}}
    if(!stopped&&statusEl)statusEl.textContent='Still awaiting confirmation. You may check again after completing payment.';
  }
  function installProviderCheckout(){
    const btn=document.getElementById('payButton');if(!btn||btn.dataset.providerOwner==='1')return;btn.dataset.providerOwner='1';
    btn.onclick=async e=>{e.preventDefault();if(btn.disabled)return;let state=load();const label=btn.querySelector('span');btn.disabled=true;if(label)label.textContent='PROCESSING…';try{
      if(!state.quote||!state.policyAccepted)throw new Error('Please review and accept the booking policy first.');
      const quote=await api('/bookings/quote',{method:'POST',body:JSON.stringify({venue_id:state.venueId,court_id:state.courtId,booking_date:state.date,slots:(state.slotStarts||[]).map(start_time=>({start_time}))})});state.quote=quote;save(state);
      let booking=null;
      if(state.bookingUuid){try{booking=await api(`/bookings/${state.bookingUuid}`)}catch{state.bookingUuid=null;state.bookingCode=null;state.paymentUuid=null}}
      if(!booking||booking.status!=='pending_payment'){
        booking=await api('/bookings',{method:'POST',body:JSON.stringify({venue_id:state.venueId,court_id:state.courtId,booking_date:state.date,slots:(state.slotStarts||[]).map(start_time=>({start_time})),policy_version_id:state.policyId,policy_accepted:true})});state.bookingUuid=booking.id;state.bookingCode=booking.booking_code;state.status='booking_created';save(state)
      }
      const init=await api('/payments/initiate',{method:'POST',body:JSON.stringify({booking_id:state.bookingUuid,method:state.paymentMethod||'card'})});state.paymentUuid=init.payment_id;state.paymentProvider=init.provider;state.paymentReference=init.provider_reference;state.paymentClientPayload=init.client_payload||{};save(state);
      if(init.requires_provider_integration){const paid=await api(`/payments/${init.payment_id}/simulate-success`,{method:'POST'});state.paymentStatus=paid.payment_status;state.status='confirmed';save(state);localStorage.setItem('sbpPadelNotificationsVersion',String(Date.now()));try{window.parent?.SBPRefreshNotifications?.()}catch{}try{await window.parent?.SBPBookingFlowSync?.()}catch{}go('payment-success.html');return}
      if(label)label.textContent='AWAITING PAYMENT';await waitForProvider(state,init)
    }catch(err){btn.disabled=false;if(label)label.textContent='PAY & CONFIRM';if(err.status===409||/available|booked|conflict|past|started|expired/i.test(err.message)){state=load();state.slotStarts=[];state.quote=null;state.policyAccepted=false;state.status='selecting';save(state);toast(err.message||'That slot is no longer available.',true);setTimeout(()=>{if(window.parent&&window.parent!==window&&window.parent.SBPNavigate)window.parent.SBPNavigate('time');else location.href='index.html?open=time'},1000)}else toast(err.message,true)}
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(normalize,0),{once:true});else setTimeout(normalize,0);
})();