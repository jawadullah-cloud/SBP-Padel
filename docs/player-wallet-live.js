(()=>{
  'use strict';
  if(window.__SBPWalletLive)return;window.__SBPWalletLive=true;
  if(!location.pathname.endsWith('wallet.html'))return;
  const API=(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  const token=()=>localStorage.getItem('sbpPadelAccessToken')||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>`PKR ${Number(v||0).toLocaleString(undefined,{maximumFractionDigits:0})}`;
  async function api(path){const h={'Content-Type':'application/json'};if(token())h.Authorization=`Bearer ${token()}`;const r=await fetch(`${API}${path}`,{headers:h,cache:'no-store'});let b=null;try{b=await r.json()}catch{}if(!r.ok)throw new Error(b?.detail||`Request failed (${r.status})`);return b}
  function deep(url){if(window.parent&&window.parent!==window&&typeof window.parent.SBPDeepRoute==='function'){window.parent.SBPDeepRoute(url);return}location.href=url}
  function date(v){try{return new Date(v).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}catch{return''}}
  async function load(){
    if(!token()){location.href='auth-preview.html';return}
    const balance=document.getElementById('balance');if(balance)balance.textContent='NOT ENABLED';
    const desc=document.querySelector('.balance p');if(desc)desc.textContent='A wallet ledger and top-up gateway are not enabled in the current backend. Refund and payment activity is shown below from live records.';
    const add=document.getElementById('addFunds');if(add){add.disabled=true;add.textContent='ADD FUNDS NOT AVAILABLE'}
    const note=document.querySelector('.note');if(note)note.textContent='No wallet balance is being simulated. This screen will show a spendable balance only after a real wallet ledger and funding workflow are implemented.';
    try{
      const rows=await api(`/payments/me?_=${Date.now()}`),items=[];
      for(const r of rows.slice(0,8)){
        if(r.refund)items.push(`<article class="item"><div class="icon">↙</div><div><b>Booking refund</b><small>${esc(date(r.refund.created_at))} · ${esc(String(r.refund.status||'').replaceAll('_',' '))}</small></div><div class="amount in">+ ${money(r.refund.amount)}</div></article>`);
        items.push(`<article class="item"><div class="icon">↗</div><div><b>${esc(r.booking_code||'Padel booking')}</b><small>${esc(r.booking_date||'')} · ${esc(String(r.payment_status||'payment').replaceAll('_',' '))}</small></div><div class="amount out">− ${money(r.amount)}</div></article>`)
      }
      const tx=document.querySelector('.tx');if(tx)tx.innerHTML=items.length?items.join(''):'<div style="padding:28px 8px;text-align:center;color:var(--muted);font-size:9px">No payment activity yet.</div>';
    }catch(err){const tx=document.querySelector('.tx');if(tx)tx.innerHTML=`<div style="padding:28px 8px;text-align:center;color:#ffaaaa;font-size:9px">${esc(err.message)}</div>`}
  }
  document.querySelectorAll('[data-wallet-history]').forEach(b=>b.onclick=e=>{e.preventDefault();deep('payment-history.html')});
  const back=document.querySelector('.head .back');if(back)back.onclick=e=>{e.preventDefault();deep('index.html?open=profile')};
  load();
})();