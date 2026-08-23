(()=>{
  'use strict';
  if(window.__SBPBookingDetailLive)return;
  window.__SBPBookingDetailLive=true;
  if(!location.pathname.endsWith('booking-detail.html'))return;

  const API=(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  const token=()=>localStorage.getItem('sbpPadelAccessToken')||'';
  const bookingId=new URLSearchParams(location.search).get('booking')||localStorage.getItem('sbpPadelSelectedBookingId')||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>`PKR ${Number(v||0).toLocaleString(undefined,{maximumFractionDigits:0})}`;
  const fmtDate=iso=>new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short',year:'numeric'});
  const fmtTime=t=>{const [h,m]=String(t||'00:00').split(':').map(Number);return new Date(2000,0,1,h,m||0).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})};
  const todayISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  let booking=null,venue=null,court=null,payment=null,refund=null,rescheduleDate=null,rescheduleSlots=[],rescheduleRates=new Map(),rescheduleBusy=false;

  async function api(path,opts={}){
    const headers={'Content-Type':'application/json',...(opts.headers||{})};if(token())headers.Authorization=`Bearer ${token()}`;
    const res=await fetch(`${API}${path}`,{...opts,headers,cache:'no-store'});let body=null;try{body=await res.json()}catch{}
    if(!res.ok){const e=new Error(body?.detail||`Request failed (${res.status})`);e.status=res.status;throw e}return body;
  }
  function toast(msg,bad=false){let el=document.getElementById('detailLiveToast');if(!el){el=document.createElement('div');el.id='detailLiveToast';Object.assign(el.style,{position:'fixed',left:'50%',bottom:'20px',transform:'translateX(-50%)',zIndex:'100',maxWidth:'340px',padding:'10px 13px',borderRadius:'12px',font:'700 10px Inter,sans-serif',boxShadow:'0 14px 40px #0008'});document.body.appendChild(el)}el.textContent=msg;el.style.background=bad?'#3a1717':'#10271d';el.style.color=bad?'#ffaaaa':'#d9ffc0';el.style.opacity='1';clearTimeout(el._t);el._t=setTimeout(()=>el.style.opacity='0',2800)}
  function set(id,value){const el=document.getElementById(id);if(el)el.textContent=value}
  function openModal(id){document.getElementById(id)?.classList.add('show')}
  function closeModal(id){document.getElementById(id)?.classList.remove('show')}
  function statusLabel(v){return String(v||'').replaceAll('_',' ').toUpperCase()}
  function methodLabel(v){return v==='card'?'Debit / Credit Card':v==='bank'?'Online Banking':v==='wallet'?'SBP Padel Wallet':v||'Not available'}
  function notifyParents(){try{window.parent?.SBPRefreshBookings?.()}catch{}try{window.parent?.SBPRefreshNotifications?.()}catch{}}

  function savePass(){
    if(!booking)return;
    const p={venue:venue?.name||'SBP Padel',court:court?.name||'Court',courtType:court?.court_type||'',date:fmtDate(booking.date),dateIso:booking.date,slots:(booking.slots||[]).map(s=>`${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}`),slotStarts:(booking.slots||[]).map(s=>s.start_time),amount:Number(booking.total)};
    localStorage.setItem('sbpPadelPayment',JSON.stringify(p));localStorage.setItem('sbpPadelBookingId',booking.booking_code);localStorage.setItem('sbpPadelSelectedBookingId',booking.id);
  }
  function go(url){if(window.parent&&window.parent!==window&&window.parent.SBPDeepRoute)window.parent.SBPDeepRoute(url);else location.href=url}

  async function hydrate(){
    if(!bookingId){toast('Booking could not be identified.',true);return}
    booking=await api(`/bookings/${bookingId}?_=${Date.now()}`);
    venue=await api(`/venues/${booking.venue_id}`);
    court=venue.courts?.find(c=>c.id===booking.court_id)||null;
    try{payment=await api(`/payments/by-booking/${booking.id}?_=${Date.now()}`)}catch{payment=null}
    try{const history=await api(`/payments/me?_=${Date.now()}`);refund=history.find(x=>x.booking_id===booking.id)?.refund||null}catch{refund=null}
    render();
  }

  function render(){
    localStorage.removeItem('sbpPadelCancelled');
    document.querySelector('.titleRow h2').textContent=venue?.name||'SBP Padel';
    set('court',`${court?.name||'Court'}${court?.court_type?` · ${court.court_type}`:''}`);set('date',fmtDate(booking.date));set('time',(booking.slots||[]).map(s=>`${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}`).join(', '));set('id',booking.booking_code);
    ['amount','paid','modalAmount'].forEach(id=>set(id,money(booking.total)));
    const status=document.getElementById('statusPill');if(status){status.textContent=statusLabel(booking.status);const cancelled=['cancelled','venue_cancelled'].includes(booking.status);status.style.color=cancelled?'#ff8b8b':'';status.style.borderColor=cancelled?'#6d3434':'';status.style.background=cancelled?'#2a1515':''}
    document.querySelector('.hero .badge').textContent=statusLabel(booking.status);
    const paymentState=payment?.status?statusLabel(payment.status):'NOT AVAILABLE';document.querySelectorAll('.paidMark').forEach(el=>el.textContent=paymentState);
    set('method',methodLabel(payment?.method));set('modalMethod',methodLabel(payment?.method));set('transactionId',payment?.provider_reference||'—');set('modalTxn',payment?.provider_reference||'—');set('receiptRef',payment?.provider_reference||'—');set('modalReceipt',payment?.provider_reference||'—');set('modalBooking',booking.booking_code);
    const owner=(()=>{try{return JSON.parse(localStorage.getItem('sbpPadelUser')||'{}').full_name||'Player'}catch{return'Player'}})();const players=document.getElementById('players');if(players)players.innerHTML=`<div class="player"><div class="avatar">${esc(owner.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase())}</div><div><b>${esc(owner)}</b><small>Booking owner</small></div></div>`;
    const refundState=document.getElementById('refundState');if(refundState){if(refund){refundState.style.display='block';refundState.innerHTML=`<b>REFUND ${esc(statusLabel(refund.status))}</b><br>${money(refund.amount)} · ${esc(refund.reason||'Refund linked to this booking.')}`}else refundState.style.display='none'}
    const tools=document.getElementById('tools');if(tools){const active=['confirmed','rescheduled'].includes(booking.status);tools.innerHTML=active?'<button class="primary" id="passBtn">VIEW PASS</button><button class="secondary" id="rescheduleBtn">RESCHEDULE</button><button class="secondary" id="receiptBtn">VIEW RECEIPT</button><button class="danger" id="cancelBtn">CANCEL BOOKING</button>':'<button class="primary" id="passBtn">VIEW PASS</button><button class="secondary" id="receiptBtn">VIEW RECEIPT</button>';wireTools()}
  }

  function wireTools(){
    const pass=document.getElementById('passBtn');if(pass)pass.onclick=e=>{e.preventDefault();savePass();go('digital-pass.html')};
    const receipt=document.getElementById('receiptBtn');if(receipt)receipt.onclick=e=>{e.preventDefault();openModal('receiptModal')};
    const cancel=document.getElementById('cancelBtn');if(cancel)cancel.onclick=e=>{e.preventDefault();openModal('cancelModal')};
    const reschedule=document.getElementById('rescheduleBtn');if(reschedule)reschedule.onclick=e=>{e.preventDefault();openReschedule()};
  }

  function updateRescheduleAction(){
    const modal=document.getElementById('rescheduleModal'),btn=modal?.querySelector('#confirmReschedule'),note=modal?.querySelector('.warn');if(!btn||!booking)return;
    const needed=Math.max(1,booking.slots?.length||1),selectedFee=rescheduleSlots.reduce((sum,start)=>sum+Number(rescheduleRates.get(start)||0),0),expectedFee=Number(booking.court_fee||0),complete=rescheduleSlots.length===needed,priceMatches=complete&&Math.abs(selectedFee-expectedFee)<0.001;
    btn.disabled=rescheduleBusy||!complete||!priceMatches;
    if(rescheduleBusy)btn.textContent='RESCHEDULING…';
    else if(!complete)btn.textContent=`SELECT ${needed} SLOT${needed===1?'':'S'}`;
    else if(!priceMatches)btn.textContent=`PRICE MUST MATCH ${money(expectedFee)}`;
    else btn.textContent='CONFIRM RESCHEDULE';
    if(note){
      if(!complete)note.innerHTML=`Your existing paid court fee is <b>${money(expectedFee)}</b>. Select ${needed} replacement slot${needed===1?'':'s'}.`;
      else if(!priceMatches)note.innerHTML=`Selected court fee is <b>${money(selectedFee)}</b>, but this booking was paid at <b>${money(expectedFee)}</b>. Price-adjusted rescheduling is not available yet. Choose slot${needed===1?'':'s'} totalling ${money(expectedFee)}.`;
      else note.innerHTML=`Replacement court fee matches the existing paid amount: <b>${money(expectedFee)}</b>.`;
    }
  }

  async function openReschedule(){
    const modal=document.getElementById('rescheduleModal');if(!modal)return;openModal('rescheduleModal');const dates=modal.querySelector('.dates'),slots=modal.querySelector('.slots'),action=modal.querySelector('#confirmReschedule');
    rescheduleDate=todayISO();rescheduleSlots=[];rescheduleRates=new Map();rescheduleBusy=false;dates.innerHTML='';slots.innerHTML='<div style="padding:18px 8px;color:var(--muted);font-size:9px">Choose a date to load live availability.</div>';
    const base=new Date();for(let i=0;i<6;i++){const d=new Date(base);d.setDate(base.getDate()+i);const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const b=document.createElement('button');b.dataset.date=iso;b.innerHTML=`<small>${d.toLocaleDateString('en-US',{weekday:'short'}).toUpperCase()}</small><b>${d.getDate()}</b>`;b.onclick=()=>loadRescheduleSlots(iso,b);dates.appendChild(b)}
    action.onclick=confirmReschedule;updateRescheduleAction();dates.querySelector('button')?.click();
  }
  async function loadRescheduleSlots(iso,button){
    rescheduleDate=iso;rescheduleSlots=[];rescheduleRates=new Map();const modal=document.getElementById('rescheduleModal'),dates=modal.querySelector('.dates'),slots=modal.querySelector('.slots');dates.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===button));slots.innerHTML='<div style="padding:18px 8px;color:var(--muted);font-size:9px">Checking live availability…</div>';updateRescheduleAction();
    try{const a=await api(`/venues/${booking.venue_id}/availability?date=${encodeURIComponent(iso)}&_=${Date.now()}`);const c=a.courts.find(x=>x.court_id===booking.court_id);const available=(c?.slots||[]).filter(x=>x.available);if(!available.length){slots.innerHTML='<div style="padding:18px 8px;color:var(--muted);font-size:9px">No available slots on this date.</div>';updateRescheduleAction();return}slots.innerHTML=available.map(s=>`<button type="button" data-start="${esc(s.start_time)}" data-rate="${Number(s.hourly_rate||0)}">${esc(fmtTime(s.start_time))} – ${esc(fmtTime(s.end_time))} · ${money(s.hourly_rate)}</button>`).join('');slots.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{const needed=Math.max(1,booking.slots?.length||1);if(!btn.classList.contains('on')&&rescheduleSlots.length>=needed){slots.querySelectorAll('button').forEach(x=>x.classList.remove('on'));rescheduleSlots=[];rescheduleRates=new Map()}btn.classList.toggle('on');rescheduleSlots=[...slots.querySelectorAll('button.on')].map(x=>x.dataset.start);rescheduleRates=new Map([...slots.querySelectorAll('button.on')].map(x=>[x.dataset.start,Number(x.dataset.rate||0)]));updateRescheduleAction()});updateRescheduleAction();}catch(err){slots.innerHTML=`<div style="padding:18px 8px;color:#ffaaaa;font-size:9px">${esc(err.message)}</div>`;updateRescheduleAction()}
  }
  async function confirmReschedule(){
    const btn=document.getElementById('confirmReschedule');if(!btn||rescheduleBusy||!rescheduleSlots.length)return;rescheduleBusy=true;updateRescheduleAction();try{await api(`/bookings/${booking.id}/reschedule`,{method:'POST',body:JSON.stringify({booking_date:rescheduleDate,slots:rescheduleSlots.map(start_time=>({start_time}))})});closeModal('rescheduleModal');toast('Booking rescheduled.');await hydrate();notifyParents()}catch(err){toast(err.message,true)}finally{rescheduleBusy=false;updateRescheduleAction()}
  }
  async function confirmCancel(){
    const btn=document.getElementById('confirmCancel');if(!btn)return;btn.disabled=true;btn.textContent='CANCELLING…';try{const cancelled=await api(`/bookings/${booking.id}/cancel`,{method:'POST',body:JSON.stringify({reason:'Cancelled by player'})});if(cancelled.refund_required&&payment?.id)await api(`/payments/${payment.id}/refund`,{method:'POST',body:JSON.stringify({reason:'Booking cancelled by player'})});closeModal('cancelModal');toast(cancelled.refund_required?'Booking cancelled. Refund requested.':'Booking cancelled.');await hydrate();notifyParents()}catch(err){toast(err.message,true);btn.disabled=false;btn.textContent='CANCEL & REQUEST REFUND'}
  }

  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=e=>{e.preventDefault();closeModal(b.dataset.close)});document.querySelectorAll('.modalBack').forEach(m=>m.onclick=e=>{if(e.target===m)closeModal(m.id)});
  const cancelConfirm=document.getElementById('confirmCancel');if(cancelConfirm)cancelConfirm.onclick=confirmCancel;
  const back=document.querySelector('.head .back');if(back)back.onclick=e=>{e.preventDefault();go('index.html?open=bookings')};
  hydrate().catch(err=>toast(err.message,true));
})();
