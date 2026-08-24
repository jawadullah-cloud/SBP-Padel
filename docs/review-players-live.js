(()=>{
  'use strict';
  if(window.__SBPReviewPlayersLive)return;
  window.__SBPReviewPlayersLive=true;

  const KEY='sbpPadelSavedPlayers';
  const CHECKOUT_KEY='sbpPadelCheckoutPlayers';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials=n=>String(n||'').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('');
  function getPlayers(){try{const rows=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(rows)?rows.filter(x=>typeof x==='string'&&x.trim()):[]}catch{return[]}}
  function selectedPlayers(){return [...document.querySelectorAll('#playerList .playerCard')].map(card=>card.querySelector('h3')?.textContent?.trim()).filter(Boolean)}
  function persistCheckoutPlayers(){const rows=selectedPlayers();if(rows.length)localStorage.setItem(CHECKOUT_KEY,JSON.stringify(rows))}
  function render(){
    const list=document.querySelector('#playerModal .savedList');
    if(!list)return;
    const rows=getPlayers();
    list.innerHTML=rows.length?rows.map(name=>`<button class="savedPlayer" type="button" data-sbp-saved-player="${esc(name)}"><div class="miniAvatar">${esc(initials(name))}</div><div><b>${esc(name)}</b><small>Saved player</small></div><span>ADD</span></button>`).join(''):'<div style="padding:16px 8px;text-align:center;color:var(--muted);font-size:9px">No saved players yet. Add them from Profile → Saved Players.</div>';
  }
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-sbp-saved-player]');
    if(btn){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      const input=document.getElementById('manualPlayer');
      const add=document.getElementById('manualAddBtn');
      if(!input||!add)return;
      input.value=btn.dataset.sbpSavedPlayer||'';
      add.click();
      return;
    }
    if(e.target.closest?.('#toPayment'))persistCheckoutPlayers();
  },true);
  window.addEventListener('storage',e=>{if(e.key===KEY)render()});
  window.addEventListener('focus',render);
  render();
})();
