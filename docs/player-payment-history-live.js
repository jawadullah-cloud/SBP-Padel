(()=>{
  'use strict';
  if(window.__SBPPaymentHistoryLive)return;window.__SBPPaymentHistoryLive=true;
  if(!location.pathname.endsWith('payment-history.html'))return;
  const API=(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  const token=()=>localStorage.getItem('sbpPadelAccessToken')||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>`PKR ${Number(v||0).toLocaleString(undefined,{maximumFractionDigits:0})}`;
  const method=m=>m==='card'?'Debit / Credit Card':m==='bank'?'Online Banking':m==='wallet'?'SBP Padel Wallet':(m||'Payment');
  async function api(path){const h={'Content-Type':'application/json'};if(token())h.Authorization=`Bearer ${token()}`;const r=await fetch(`${API}${path}`,{headers:h,cache:'no-store'});let b=null;try{b=await r.json()}catch{}if(!r.ok)throw new Error(b?.detail||`Request failed (${r.status})`);return b}
  function deep(url){if(window.parent&&window.parent!==window&&typeof window.parent.SBPDeepRoute==='function'){window.parent.SBPDeepRoute(url);return}location.href=url}
  function showState(msg){const list=document.getElementById('list');if(list)list.innerHTML=`<div class="empty show">${esc(msg)}</div>`}
  function applyFilter(filter){let shown=0;document.querySelectorAll('#list .entry').forEach(e=>{const ok=filter==='all'||e.dataset.type===filter;e.hidden=!ok;if(ok)shown++});document.getElementById('empty')?.classList.toggle('show',shown===0)}
  async function load(){
    if(!token()){location.href='auth-preview.html';return}
    showState('Loading payment history…');
    try{
      const rows=await api(`/payments/me?_=${Date.now()}`);
      const paid=rows.filter(r=>['paid','succeeded'].includes(String(r.payment_status||'').toLowerCase())).reduce((a,r)=>a+Number(r.amount||0),0);
      const refunded=rows.filter(r=>r.refund).reduce((a,r)=>a+Number(r.refund?.amount||0),0);
      const sums=document.querySelectorAll('.summary b');if(sums[0])sums[0].textContent=money(paid);if(sums[1])sums[1].textContent=money(refunded);
      const entries=[];
      rows.forEach(r=>{
        const d=r.booking_date?new Date(`${r.booking_date}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
        entries.push(`<article class="entry" data-type="payments"><div class="row"><div><b>Padel court booking</b><small>${esc(d)}</small></div><div class="money">${money(r.amount)}</div></div><div class="details"><div><span>Status</span><strong class="statusPaid">${esc(String(r.payment_status||'').toUpperCase())}</strong></div><div><span>Method</span><strong>${esc(method(r.method))}</strong></div><div><span>Transaction</span><strong>${esc(r.provider_reference||String(r.id||'').slice(0,8).toUpperCase())}</strong></div><div><span>Booking ID</span><strong>${esc(r.booking_code||'—')}</strong></div></div><button class="receipt" data-booking="${esc(r.booking_id)}">VIEW BOOKING</button></article>`);
        if(r.refund){const rd=new Date(r.refund.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});entries.push(`<article class="entry" data-type="refunds"><div class="row"><div><b>Booking refund</b><small>${esc(rd)}</small></div><div class="money refund">+ ${money(r.refund.amount)}</div></div><div class="details"><div><span>Status</span><strong class="statusRefund">${esc(String(r.refund.status||'').toUpperCase())}</strong></div><div><span>Method</span><strong>${esc(method(r.method))}</strong></div><div><span>Refund ref</span><strong>${esc(r.refund.provider_reference||String(r.refund.id||'').slice(0,8).toUpperCase())}</strong></div><div><span>Booking ID</span><strong>${esc(r.booking_code||'—')}</strong></div></div><button class="receipt" data-booking="${esc(r.booking_id)}">VIEW BOOKING</button></article>`)}
      });
      const list=document.getElementById('list');if(list)list.innerHTML=entries.join('');
      document.querySelectorAll('[data-booking]').forEach(b=>b.onclick=()=>{localStorage.setItem('sbpPadelSelectedBookingId',b.dataset.booking);deep(`booking-detail.html?booking=${encodeURIComponent(b.dataset.booking)}`)});
      applyFilter(document.querySelector('[data-filter].on')?.dataset.filter||'all');
    }catch(err){showState(`Could not load payment history: ${err.message}`)}
  }
  document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('on',x===b));applyFilter(b.dataset.filter)});
  const back=document.querySelector('.head .back');if(back)back.onclick=e=>{e.preventDefault();deep('index.html?open=profile')};
  load();
})();