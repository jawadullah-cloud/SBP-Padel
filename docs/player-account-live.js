(()=>{
  'use strict';
  if(window.__SBPPlayerAccountLive)return;
  window.__SBPPlayerAccountLive=true;

  const API=(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  const token=()=>localStorage.getItem('sbpPadelAccessToken')||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>`PKR ${Number(v||0).toLocaleString(undefined,{maximumFractionDigits:0})}`;
  const methodLabel=m=>m==='card'?'Debit / Credit Card':m==='bank'?'Online Banking':m==='wallet'?'SBP Padel Wallet':(m||'Payment');
  async function api(path,opts={}){
    const headers={'Content-Type':'application/json',...(opts.headers||{})};
    if(token())headers.Authorization=`Bearer ${token()}`;
    const res=await fetch(`${API}${path}`,{...opts,headers});
    let body=null;try{body=await res.json()}catch{}
    if(!res.ok)throw new Error(body?.detail||`Request failed (${res.status})`);
    return body;
  }
  function deep(url){
    if(window.parent&&window.parent!==window&&typeof window.parent.SBPDeepRoute==='function'){window.parent.SBPDeepRoute(url);return}
    if(typeof window.SBPDeepRoute==='function'){window.SBPDeepRoute(url);return}
    location.href=url;
  }
  function relativeTime(iso){
    const ms=Date.now()-new Date(iso).getTime();
    const min=Math.max(0,Math.floor(ms/60000));
    if(min<1)return'Just now';if(min<60)return`${min} min ago`;
    const hr=Math.floor(min/60);if(hr<24)return`${hr}h ago`;
    const day=Math.floor(hr/24);if(day<7)return`${day}d ago`;
    return new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
  }
  const iconFor=k=>String(k||'').includes('refund')?'↺':String(k||'').includes('cancel')?'×':String(k||'').includes('reminder')?'◷':'✓';

  async function loadNotifications(){
    const screen=document.getElementById('notifications');if(!screen||!token())return;
    let rows;try{rows=await api('/notifications/me')}catch{return}
    const list=screen.querySelector('.pmNoticeList');if(!list)return;
    const unread=rows.filter(n=>!n.read).length;
    list.innerHTML=rows.length?rows.map(n=>`<article class="pmNotice ${n.read?'':'unread'}" data-notification="${esc(n.id)}"><div class="pmNoticeIcon">${iconFor(n.kind)}</div><div><b>${esc(n.title)}</b><p>${esc(n.body)}</p><small>${relativeTime(n.created_at)}</small></div></article>`).join(''):'<div class="pmEmpty show">No notifications yet.</div>';
    const count=screen.querySelector('.pmSectionTitle small');if(count)count.textContent=unread?`${unread} new`:'All read';
    const mark=screen.querySelector('[data-mark-read]');if(mark){mark.hidden=unread===0;mark.onclick=async()=>{mark.disabled=true;try{await api('/notifications/me/read-all',{method:'POST'});await loadNotifications()}finally{mark.disabled=false}}}
    list.querySelectorAll('[data-notification]').forEach(card=>card.onclick=async()=>{if(!card.classList.contains('unread'))return;try{await api(`/notifications/${card.dataset.notification}/read`,{method:'POST'});card.classList.remove('unread');await refreshNotificationDot()}catch{}});
    await refreshNotificationDot(rows);
  }
  async function refreshNotificationDot(existing){
    let rows=existing;try{if(!rows)rows=await api('/notifications/me')}catch{return}
    const unread=rows.some(n=>!n.read);const bell=document.querySelector('header .topNotify');if(bell)bell.classList.toggle('hasUnread',unread);
  }

  async function loadPaymentHistory(){
    if(!location.pathname.endsWith('payment-history.html')||!token())return;
    let rows;try{rows=await api('/payments/me')}catch{return}
    const list=document.getElementById('list'),empty=document.getElementById('empty');if(!list)return;
    const payments=rows.filter(r=>r.payment_status==='succeeded');
    const refunds=rows.filter(r=>r.refund);
    const paid=payments.reduce((a,r)=>a+Number(r.amount||0),0);
    const refunded=refunds.reduce((a,r)=>a+Number(r.refund?.amount||0),0);
    const sums=document.querySelectorAll('.summary b');if(sums[0])sums[0].textContent=money(paid);if(sums[1])sums[1].textContent=money(refunded);
    const entries=[];
    rows.forEach(r=>{
      entries.push(`<article class="entry" data-type="payments"><div class="row"><div><b>Padel court booking</b><small>${esc(new Date(`${r.booking_date}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}))}</small></div><div class="money">${money(r.amount)}</div></div><div class="details"><div><span>Status</span><strong class="statusPaid">${esc(String(r.payment_status).toUpperCase())}</strong></div><div><span>Method</span><strong>${esc(methodLabel(r.method))}</strong></div><div><span>Transaction</span><strong>${esc(r.provider_reference||r.id.slice(0,8).toUpperCase())}</strong></div><div><span>Booking ID</span><strong>${esc(r.booking_code)}</strong></div></div><button class="receipt" data-receipt="${esc(r.booking_id)}">VIEW RECEIPT</button></article>`);
      if(r.refund)entries.push(`<article class="entry" data-type="refunds"><div class="row"><div><b>Booking refund</b><small>${esc(new Date(r.refund.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}))}</small></div><div class="money refund">+ ${money(r.refund.amount)}</div></div><div class="details"><div><span>Status</span><strong class="statusRefund">${esc(String(r.refund.status).toUpperCase())}</strong></div><div><span>Method</span><strong>${esc(methodLabel(r.method))}</strong></div><div><span>Refund ref</span><strong>${esc(r.refund.provider_reference||r.refund.id.slice(0,8).toUpperCase())}</strong></div><div><span>Booking ID</span><strong>${esc(r.booking_code)}</strong></div></div><button class="receipt" data-receipt="${esc(r.booking_id)}">VIEW DETAILS</button></article>`);
    });
    list.innerHTML=entries.join('');
    list.querySelectorAll('[data-receipt]').forEach(b=>b.onclick=()=>{localStorage.setItem('sbpPadelSelectedBookingId',b.dataset.receipt);deep(`booking-detail.html?booking=${encodeURIComponent(b.dataset.receipt)}`)});
    function applyFilter(filter){let shown=0;list.querySelectorAll('.entry').forEach(e=>{const show=filter==='all'||e.dataset.type===filter;e.style.display=show?'block':'none';if(show)shown++});if(empty)empty.classList.toggle('show',shown===0)}
    document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('on'));b.classList.add('on');applyFilter(b.dataset.filter)});
    applyFilter(document.querySelector('[data-filter].on')?.dataset.filter||'all');
    const back=document.querySelector('.head .back');if(back)back.onclick=e=>{e.preventDefault();deep('index.html?open=profile')};
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('button');
    const label=btn?.querySelector?.('span')?.textContent?.trim();
    if(label==='Notifications')setTimeout(loadNotifications,30);
    if(btn?.classList?.contains('topNotify'))setTimeout(loadNotifications,30);
  },true);
  window.addEventListener('pageshow',()=>{if(document.getElementById('notifications')?.classList.contains('active'))loadNotifications();});
  refreshNotificationDot();
  loadPaymentHistory();
})();
