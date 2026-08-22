(function(){
  if(!/review-booking\.html$/i.test(location.pathname))return;
  const defaults=['Sara Khan','Hamza Ali','Mariam Shah'];
  const getSaved=()=>{try{const v=JSON.parse(localStorage.getItem('sbpPadelSavedPlayers')||'null');return Array.isArray(v)?v:defaults}catch{return defaults}};
  const initials=n=>n.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('');
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function rebuild(){const list=document.querySelector('.savedList');if(!list)return;const saved=getSaved();list.innerHTML=saved.length?saved.map(name=>`<button class="savedPlayer" data-name="${esc(name)}"><div class="miniAvatar">${initials(name)}</div><div><b>${esc(name)}</b><small>Saved player</small></div><span>ADD</span></button>`).join(''):`<div style="padding:18px 10px;text-align:center;color:#8d9d97;font-size:9px;border:1px dashed #1f3733;border-radius:13px">No saved players yet.<br>Add them from Profile → Saved Players.</div>`;list.querySelectorAll('.savedPlayer').forEach(b=>b.onclick=()=>{if(typeof addPlayer==='function')addPlayer(b.dataset.name)})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(rebuild,0));else setTimeout(rebuild,0);
  window.addEventListener('storage',rebuild);
})();
