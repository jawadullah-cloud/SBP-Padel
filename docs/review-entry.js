(()=>{
  'use strict';
  if(window.__SBPBookingFlowV2)return;
  window.__SBPBookingFlowV2=true;

  const API=(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  const TOKEN='sbpPadelAccessToken';
  const STATE='sbpPadelBookingSessionV2';
  const PATH=location.pathname.split('/').pop()||'index.html';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>`PKR ${Number(v||0).toLocaleString(undefined,{maximumFractionDigits:0})}`;
  const fmtTime=t=>{const [h,m]=String(t||'00:00').split(':').map(Number);return new Date(2000,0,1,h,m||0).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})};
  const fmtDate=iso=>new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short',year:'numeric'});
  const todayISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};

  function fresh(){return {version:2,venueId:null,venueName:null,date:todayISO(),courtId:null,courtName:null,courtType:null,slotStarts:[],quote:null,policyId:null,policyTitle:null,policyBody:null,policyAccepted:false,paymentMethod:'wallet',bookingUuid:null,bookingCode:null,paymentUuid:null,paymentStatus:null,status:'selecting',updatedAt:Date.now()}}
  function load(){try{return {...fresh(),...JSON.parse(localStorage.getItem(STATE)||'{}')}}catch{return fresh()}}
  let state=load();
  function reloadState(){state=load();return state}
  function save(){state.updatedAt=Date.now();localStorage.setItem(STATE,JSON.stringify(state));syncLegacy()}
  function syncLegacy(){
    const slots=state.quote?.slots?.map(s=>`${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}`)||state.slotStarts.map(x=>fmtTime(x));
    const p={venue:state.venueName,court:state.courtName,courtType:state.courtType,date:state.date?fmtDate(state.date):'',dateIso:state.date,slots,slotStarts:[...state.slotStarts],courtFee:Number(state.quote?.court_fee||0),serviceFee:Number(state.quote?.service_fee||0),amount:Number(state.quote?.total||0)};
    localStorage.setItem('sbpPadelReview',JSON.stringify(p));localStorage.setItem('sbpPadelPayment',JSON.stringify(p));
    if(state.bookingUuid)localStorage.setItem('sbpPadelBookingUuid',state.bookingUuid);
    if(state.bookingCode)localStorage.setItem('sbpPadelBookingId',state.bookingCode);
    if(state.paymentUuid)localStorage.setItem('sbpPadelPaymentUuid',state.paymentUuid);
  }
  function invalidate(level){
    if(level<=2){state.courtId=null;state.courtName=null;state.courtType=null}
    if(level<=3)state.slotStarts=[];
    if(level<=4){state.quote=null;state.policyAccepted=false;state.policyId=null;state.bookingUuid=null;state.bookingCode=null;state.paymentUuid=null;state.paymentStatus=null;state.status='selecting'}
    save();
  }
  function newBooking(){const keep={venueId:state.venueId,venueName:state.venueName};state={...fresh(),...keep};save()}

  async function api(path,opts={}){
    const headers={'Content-Type':'application/json',...(opts.headers||{})};const token=localStorage.getItem(TOKEN);if(token)headers.Authorization=`Bearer ${token}`;
    const res=await fetch(`${API}${path}`,{...opts,headers,cache:'no-store'});let body=null;try{body=await res.json()}catch{}
    if(!res.ok){const e=new Error(body?.detail||`Request failed (${res.status})`);e.status=res.status;e.body=body;throw e}return body;
  }
  function toast(msg,bad=false){let el=document.getElementById('flowV2Toast');if(!el){el=document.createElement('div');el.id='flowV2Toast';Object.assign(el.style,{position:'fixed',left:'50%',bottom:'78px',transform:'translateX(-50%)',zIndex:'99999',maxWidth:'340px',padding:'10px 13px',borderRadius:'12px',font:'700 10px Inter,sans-serif',boxShadow:'0 14px 40px #0008',transition:'.2s'});document.body.appendChild(el)}el.textContent=msg;el.style.background=bad?'#3a1717':'#10271d';el.style.color=bad?'#ffaaaa':'#d9ffc0';el.style.border=`1px solid ${bad?'#783838':'#376844'}`;el.style.opacity='1';clearTimeout(el._t);el._t=setTimeout(()=>el.style.opacity='0',2800)}

  function goMain(screen,focusStep){
    save();
    if(window.parent&&window.parent!==window&&window.parent.SBPDeepRoute){window.parent.SBPDeepRoute(`index.html?open=${encodeURIComponent(screen)}${focusStep?`&flowStep=${focusStep}`:''}`);return}
    if(window.SBPNavigate){window.SBPNavigate(screen);setTimeout(()=>focusSection(focusStep),60);return}
    location.href=`index.html?open=${encodeURIComponent(screen)}${focusStep?`&flowStep=${focusStep}`:''}`;
  }
  function goDeep(url){save();if(window.parent&&window.parent!==window&&window.parent.SBPDeepRoute){window.parent.SBPDeepRoute(url);return}if(window.SBPDeepRoute){window.SBPDeepRoute(url);return}location.href=url}
  function focusSection(step){if(!step)return;const el=step===2?document.querySelector('#select .dateRail'):step===3?document.querySelector('#select .courtList'):step===4?document.querySelector('#time .timeline'):null;el?.scrollIntoView({behavior:'smooth',block:'center'})}

  function decorateSteps(){
    const roots=[...document.querySelectorAll('#select .steps,#time .steps')];if(PATH==='review-booking.html')roots.push(...document.querySelectorAll('.progress'));
    roots.forEach(root=>{[...root.querySelectorAll(':scope > b,:scope > span')].forEach((el,i)=>{const n=i+1;if(n>5)return;el.dataset.sbpStep=String(n);el.setAttribute('role','button');el.setAttribute('tabindex','0');el.style.cursor='pointer';el.style.userSelect='none';el.title=`Go to step ${n}`})});
  }
  async function stepTo(n){
    if(n===1){goMain('nishtar',1);return}
    if(n===2||n===3){goMain('select',n);return}
    if(n===4){if(!state.courtId){toast('Choose a court first.',true);goMain('select',3);return}await refreshAvailability();goMain('time',4);return}
    if(n===5){if(!state.slotStarts.length){toast('Select at least one time slot first.',true);goMain('time',4);return}try{await ensureQuote();goDeep('review-booking.html')}catch(e){toast(e.message,true)}}
  }

  let venueDetail=null,availability=null;
  async function bootstrapData(){
    const venues=await api('/venues');if(!venues.length)throw new Error('No active venues are configured.');
    let venue=venues.find(v=>v.id===state.venueId)||venues[0];state.venueId=venue.id;state.venueName=venue.name;
    venueDetail=await api(`/venues/${venue.id}`);
    if(!state.date||state.date<todayISO())state.date=todayISO();
    availability=await api(`/venues/${venue.id}/availability?date=${encodeURIComponent(state.date)}`);
    const court=availability.courts.find(c=>c.court_id===state.courtId)||availability.courts[0]||null;
    if(court){state.courtId=court.court_id;state.courtName=court.court_name;state.courtType=court.court_type}
    save();
  }
  function ensureDateStyle(){if(document.getElementById('sbpDatePickerStyle'))return;const s=document.createElement('style');s.id='sbpDatePickerStyle';s.textContent=`.dateRail .dateMore{min-width:54px;height:58px;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--text);display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;cursor:pointer;overflow:hidden}.dateRail .dateMore small{font-size:7px;color:var(--muted);font-weight:700}.dateRail .dateMore b{font:900 18px var(--sport);line-height:1.1;color:var(--brand)}.dateRail .dateMore.selected{border-color:var(--brand);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--brand) 30%,transparent)}.dateRail .dateMore input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}`;document.head.appendChild(s)}
  function dateButtons(){
    const rail=document.querySelector('#select .dateRail');if(!rail)return;ensureDateStyle();
    const base=new Date();rail.innerHTML='';let quickSelected=false;
    for(let i=0;i<7;i++){const d=new Date(base);d.setDate(base.getDate()+i);const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const b=document.createElement('button');b.dataset.date=iso;b.classList.toggle('selected',iso===state.date);if(iso===state.date)quickSelected=true;b.innerHTML=`<small>${d.toLocaleDateString('en-US',{weekday:'short'}).toUpperCase()}</small><b>${d.getDate()}</b>`;rail.appendChild(b)}
    const more=document.createElement('label');more.className=`dateMore ${quickSelected?'':'selected'}`;more.title='Choose any future date';more.innerHTML=`<small>${quickSelected?'MORE':'SELECTED'}</small><b>${quickSelected?'＋':new Date(`${state.date}T12:00:00`).getDate()}</b><input type="date" min="${todayISO()}" value="${state.date}">`;const input=more.querySelector('input');input.onchange=async()=>{if(!input.value||input.value<todayISO())return;state.date=input.value;invalidate(2);state.date=input.value;await refreshAvailability();dateButtons();renderCourts()};rail.appendChild(more);
  }
  function renderCourts(){
    const list=document.querySelector('#select .courtList');if(!list||!availability)return;
    list.innerHTML=availability.courts.map(c=>`<article class="courtOption ${c.court_id===state.courtId?'selected':''}" data-court="${esc(c.court_id)}"><div class="courtThumb"></div><div><h4>${esc(c.court_name)}</h4><p>${esc(c.court_type)}</p></div><span class="${c.court_id===state.courtId?'courtTick':'courtCap'}">${c.court_id===state.courtId?'✓':'4'}</span></article>`).join('');
  }
  function selectedCourt(){return availability?.courts?.find(c=>c.court_id===state.courtId)||null}
  function reconcileSlots(){const c=selectedCourt();if(!c)return;const available=new Set(c.slots.filter(s=>s.available).map(s=>s.start_time));const before=state.slotStarts.length;state.slotStarts=state.slotStarts.filter(s=>available.has(s));if(before!==state.slotStarts.length){state.quote=null;state.policyAccepted=false;save();toast('One of your previously selected slots is no longer available.',true)}}
  function renderTimes(){
    const list=document.querySelector('#time .timeline');const c=selectedCourt();if(!list||!c)return;reconcileSlots();
    const sub=document.querySelector('#time .subline');if(sub)sub.textContent=`${fmtDate(state.date)} · ${state.courtName}`;
    list.innerHTML=c.slots.map(s=>{const chosen=state.slotStarts.includes(s.start_time)&&s.available;const unavailable=!s.available;return `<article class="slotRow ${unavailable?'booked':''} ${chosen?'chosen':''}" data-start="${esc(s.start_time)}" data-rate="${Number(s.hourly_rate||0)}"><div><b>${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}</b><small>${unavailable?esc(s.unavailable_reason||'Unavailable'):chosen?'Selected':`${money(s.hourly_rate)} / hour`}</small></div><div style="text-align:right"><strong style="display:block;font:800 10px var(--sport);color:${unavailable?'var(--muted)':'var(--brand)'}">${s.hourly_rate?money(s.hourly_rate):'—'}</strong><button class="slotBook" ${unavailable?'disabled':''}>${unavailable?'UNAVAILABLE':chosen?'✓':'BOOK'}</button></div></article>`}).join('');refreshSummary();
  }
  function refreshSummary(){const summary=document.getElementById('slotSummary'),total=document.getElementById('slotTotal');if(!summary||!total)return;const c=selectedCourt();const rows=(c?.slots||[]).filter(s=>state.slotStarts.includes(s.start_time));if(!rows.length){summary.textContent='No slots selected';total.textContent='Choose slots';return}summary.textContent=`${rows.length} slot${rows.length>1?'s':''} · ${rows.length} Hour${rows.length>1?'s':''}`;total.textContent=`${money(rows.reduce((a,s)=>a+Number(s.hourly_rate||0),0))} court fee`}
  async function refreshAvailability(){
    if(!state.venueId||!state.date)return;
    availability=await api(`/venues/${state.venueId}/availability?date=${encodeURIComponent(state.date)}&_=${Date.now()}`);
    const c=availability.courts.find(x=>x.court_id===state.courtId)||availability.courts[0];
    if(c&&!state.courtId){state.courtId=c.court_id;state.courtName=c.court_name;state.courtType=c.court_type;save()}
    renderCourts();renderTimes();
  }
  async function ensureQuote(){
    if(!state.venueId||!state.courtId||!state.date||!state.slotStarts.length)throw new Error('Booking selection is incomplete.');
    const q=await api('/bookings/quote',{method:'POST',body:JSON.stringify({venue_id:state.venueId,court_id:state.courtId,booking_date:state.date,slots:state.slotStarts.map(start_time=>({start_time}))})});
    state.quote=q;state.venueName=q.venue?.name||state.venueName;state.courtName=q.court?.name||state.courtName;state.courtType=q.court?.court_type||state.courtType;save();return q;
  }

  function installMainCapture(){
    document.addEventListener('click',async e=>{
      const step=e.target.closest?.('[data-sbp-step]');if(step){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();await stepTo(Number(step.dataset.sbpStep));return}
      const start=e.target.closest?.('#nishtar [data-nav="select"],#home [data-nav="select"]');if(start){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();reloadState();if(state.status==='confirmed')newBooking();await refreshAvailability();goMain('select',2);return}
      const date=e.target.closest?.('#select .dateRail button[data-date]');if(date){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(date.dataset.date!==state.date){state.date=date.dataset.date;invalidate(2);state.date=date.dataset.date;await refreshAvailability()}dateButtons();renderCourts();return}
      const court=e.target.closest?.('#select .courtOption[data-court]');if(court){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(court.dataset.court!==state.courtId){const c=availability?.courts?.find(x=>x.court_id===court.dataset.court);state.courtId=c?.court_id||court.dataset.court;state.courtName=c?.court_name||'';state.courtType=c?.court_type||'';invalidate(3);state.courtId=c?.court_id||court.dataset.court;state.courtName=c?.court_name||'';state.courtType=c?.court_type||'';save()}renderCourts();return}
      const toTime=e.target.closest?.('#select .bookingBottom .primary');if(toTime){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(!state.courtId){toast('Choose a court first.',true);return}toTime.disabled=true;const old=toTime.innerHTML;toTime.textContent='CHECKING AVAILABILITY…';try{await refreshAvailability();renderTimes();goMain('time',4)}catch(err){toast(err.message,true)}finally{toTime.disabled=false;toTime.innerHTML=old}return}
      const slot=e.target.closest?.('#time .slotRow:not(.booked)');if(slot){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const startTime=slot.dataset.start;if(!startTime)return;const set=new Set(state.slotStarts);set.has(startTime)?set.delete(startTime):set.add(startTime);state.slotStarts=[...set].sort();invalidate(4);state.slotStarts=[...set].sort();save();renderTimes();return}
      const review=e.target.closest?.('#time .bookingBottom .primary');if(review){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(!state.slotStarts.length){toast('Select at least one available time slot.',true);return}review.disabled=true;review.textContent='CHECKING AVAILABILITY…';try{await refreshAvailability();if(!state.slotStarts.length){throw new Error('Your selected slot is no longer available. Please choose another time.')}await ensureQuote();review.disabled=false;review.innerHTML='CONTINUE <span>→</span>';goDeep('review-booking.html')}catch(err){review.disabled=false;review.innerHTML='CONTINUE <span>→</span>';toast(err.message,true);await refreshAvailability()}return}
    },true);
    document.addEventListener('keydown',e=>{const s=e.target.closest?.('[data-sbp-step]');if(s&&(e.key==='Enter'||e.key===' ')){e.preventDefault();stepTo(Number(s.dataset.sbpStep))}},true);
  }

  async function syncFromStorage(){
    reloadState();
    if(!state.venueId)return;
    try{await refreshAvailability();dateButtons();renderCourts();renderTimes();decorateSteps()}catch(e){console.warn('[SBP Padel] availability sync failed',e)}
  }

  async function mainPage(){
    installMainCapture();
    window.SBPBookingFlowSync=syncFromStorage;
    try{await bootstrapData();dateButtons();renderCourts();renderTimes();decorateSteps();const wanted=new URLSearchParams(location.search).get('flowStep');setTimeout(()=>focusSection(Number(wanted)||0),100)}catch(e){toast(e.message,true)}
    window.addEventListener('load',()=>setTimeout(()=>{syncFromStorage()},650),{once:true});
    window.addEventListener('pageshow',()=>{setTimeout(()=>{syncFromStorage()},0)});
    window.addEventListener('focus',()=>{if(document.querySelector('#select.active,#time.active'))syncFromStorage()});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&document.querySelector('#select.active,#time.active'))syncFromStorage()});
  }

  function reviewStyle(){if(document.getElementById('flowV2ReviewStyle'))return;const s=document.createElement('style');s.id='flowV2ReviewStyle';s.textContent=`#livePolicy{display:block!important;cursor:default!important;padding:0!important;overflow:hidden!important;border:1px solid var(--line)!important;background:var(--surface)!important;border-radius:16px!important;color:var(--text)!important}#livePolicy .lpHead{padding:12px 13px;border-bottom:1px solid var(--line);background:var(--surface2)}#livePolicy .lpHead b{color:var(--text);font-size:11px}#livePolicy .lpBody{padding:12px 13px;white-space:pre-wrap;line-height:1.55;font-size:9px;color:var(--muted)}#livePolicy label{display:flex;align-items:flex-start;gap:10px;padding:12px 13px;border-top:1px solid var(--line);background:var(--surface2);color:var(--text);font-size:9px;line-height:1.45;cursor:pointer}#livePolicyAccept{appearance:none;width:20px;height:20px;min-width:20px;margin:0;border:1px solid #486159;border-radius:6px;background:var(--surface);position:relative}#livePolicyAccept:checked{background:var(--brand);border-color:var(--brand)}#livePolicyAccept:checked:after{content:'✓';position:absolute;inset:0;display:grid;place-items:center;color:#071006;font-size:12px;font-weight:900}#toPayment:disabled{background:#cfd5d2!important;background-image:none!important;color:#7a8480!important;border:1px solid #bdc6c1!important;box-shadow:none!important;opacity:1!important;cursor:not-allowed!important;transform:none!important}`;document.head.appendChild(s)}
  async function reviewPage(){
    reviewStyle();decorateSteps();
    if(!state.quote){try{await ensureQuote()}catch(e){toast(e.message,true);setTimeout(()=>goMain('time',4),700);return}}
    const q=state.quote;const user=await api('/auth/me');const policy=await api('/policies/active');state.policyId=policy.id;state.policyTitle=policy.title;state.policyBody=policy.body;save();
    const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val};set('venue',state.venueName);set('court',`${state.courtName}${state.courtType?` · ${state.courtType}`:''}`);set('date',fmtDate(state.date));set('time',(q.slots||[]).map(s=>`${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}`).join(', '));
    set('feeLabel',`Court fee × ${state.slotStarts.length} hour${state.slotStarts.length===1?'':'s'}`);set('fee',money(q.court_fee));const priceRows=document.querySelectorAll('.priceRow');if(priceRows[1]?.querySelector('b'))priceRows[1].querySelector('b').textContent=money(q.service_fee);set('total',money(q.total));
    const owner=document.querySelector('.playerCard h3');if(owner)owner.textContent=user.full_name;const av=document.querySelector('.playerCard .avatar');if(av)av.textContent=String(user.full_name||'P').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
    const old=document.getElementById('policyCard')||document.getElementById('livePolicy');if(old){old.outerHTML=`<section id="livePolicy"><div class="lpHead"><b>${esc(policy.title)}</b><br><small>Version ${esc(policy.version)}</small></div><div class="lpBody">${esc(policy.body)}</div><label><input id="livePolicyAccept" type="checkbox" ${state.policyAccepted?'checked':''}><span>I have read and accept the Booking, Cancellation & Refund Policy.</span></label></section>`}
    const cb=document.getElementById('livePolicyAccept'),btn=document.getElementById('toPayment');if(!cb||!btn)return;
    const paint=()=>{btn.disabled=!cb.checked;btn.setAttribute('aria-disabled',String(!cb.checked))};paint();cb.onchange=()=>{state.policyAccepted=cb.checked;save();paint()};
    btn.onclick=e=>{e.preventDefault();e.stopPropagation();if(!cb.checked)return;state.policyAccepted=true;state.status='reviewed';save();goDeep('payment.html')};
    const back=document.querySelector('.head .back');if(back)back.onclick=e=>{e.preventDefault();goMain('time',4)};
    document.addEventListener('click',e=>{const st=e.target.closest?.('[data-sbp-step]');if(st){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();stepTo(Number(st.dataset.sbpStep))}},true);
  }

  async function paymentPage(){
    if(!state.quote||!state.policyAccepted){toast('Please review and accept the booking policy first.',true);setTimeout(()=>goDeep('review-booking.html'),700);return}
    const q=state.quote;const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val};set('venue',state.venueName);set('court',state.courtName);set('date',fmtDate(state.date));set('time',(q.slots||[]).map(s=>`${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}`).join(', '));['amount','total','buttonAmount'].forEach(id=>set(id,money(q.total)));
    document.querySelectorAll('.payCard').forEach(card=>{card.classList.toggle('selected',card.dataset.method===state.paymentMethod);card.onclick=()=>{document.querySelectorAll('.payCard').forEach(x=>x.classList.remove('selected'));card.classList.add('selected');state.paymentMethod=card.dataset.method;save()}});
    const back=document.querySelector('.head .back');if(back)back.onclick=e=>{e.preventDefault();goDeep('review-booking.html')};
    const btn=document.getElementById('payButton');if(!btn)return;btn.onclick=async e=>{e.preventDefault();if(btn.disabled)return;btn.disabled=true;const label=btn.querySelector('span');if(label)label.textContent='PROCESSING…';try{
      await ensureQuote();
      const created=await api('/bookings',{method:'POST',body:JSON.stringify({venue_id:state.venueId,court_id:state.courtId,booking_date:state.date,slots:state.slotStarts.map(start_time=>({start_time})),policy_version_id:state.policyId,policy_accepted:true})});
      state.bookingUuid=created.id;state.bookingCode=created.booking_code;state.status='booking_created';save();
      const init=await api('/payments/initiate',{method:'POST',body:JSON.stringify({booking_id:created.id,method:state.paymentMethod||'wallet'})});state.paymentUuid=init.payment_id;save();
      const paid=await api(`/payments/${init.payment_id}/simulate-success`,{method:'POST'});state.paymentStatus=paid.payment_status;state.status='confirmed';save();
      localStorage.setItem('sbpPadelNotificationsVersion',String(Date.now()));
      try{window.parent?.SBPRefreshNotifications?.()}catch{}
      try{await window.parent?.SBPBookingFlowSync?.()}catch{}
      goDeep('payment-success.html');
    }catch(err){btn.disabled=false;if(label)label.textContent='PAY & CONFIRM';if(err.status===409||/available|booked|conflict|past|started/i.test(err.message)){state.slotStarts=[];state.quote=null;state.policyAccepted=false;state.status='selecting';save();toast(err.message||'That slot is no longer available.',true);setTimeout(()=>goMain('time',4),1000)}else toast(err.message,true)}};
  }

  function successPage(){
    if(!state.bookingCode)return;const q=state.quote||{};const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val};set('venue',state.venueName);set('court',state.courtName);set('date',fmtDate(state.date));set('time',(q.slots||[]).map(s=>`${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}`).join(', '));set('amount',money(q.total));set('bookingId',state.bookingCode);set('method',state.paymentMethod==='card'?'Card':state.paymentMethod==='bank'?'Online Banking':'SBP Padel Wallet');localStorage.setItem('sbpPadelBookingId',state.bookingCode);syncLegacy();
    const pass=document.getElementById('viewPass');if(pass)pass.onclick=e=>{e.preventDefault();goDeep('digital-pass.html')};const bookings=document.getElementById('backHome');if(bookings){bookings.textContent='MY BOOKINGS';bookings.onclick=e=>{e.preventDefault();goMain('bookings')}};
  }

  function boot(){
    if(PATH==='index.html'||PATH==='')mainPage();
    else if(PATH==='review-booking.html')reviewPage().catch(e=>toast(e.message,true));
    else if(PATH==='payment.html')paymentPage().catch(e=>toast(e.message,true));
    else if(PATH==='payment-success.html')successPage();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
