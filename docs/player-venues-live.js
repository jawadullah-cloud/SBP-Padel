(()=>{
  'use strict';
  if(window.__SBPPlayerVenuesLive)return;window.__SBPPlayerVenuesLive=true;
  const path=location.pathname||'/';
  if(path!=='/'&&!path.endsWith('/index.html')&&!path.endsWith('/docs/')&&!path.endsWith('/docs/index.html'))return;
  const API=(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  const STATE='sbpPadelBookingSessionV2',FAV='sbpPadelFavouriteVenueIds';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let venues=[],detail=null;
  async function api(path){const r=await fetch(`${API}${path}`,{cache:'no-store'});let b=null;try{b=await r.json()}catch{}if(!r.ok)throw new Error(typeof b?.detail==='string'?b.detail:`Request failed (${r.status})`);return b}
  function state(){try{return JSON.parse(localStorage.getItem(STATE)||'{}')}catch{return{}}}
  function favourites(){try{return new Set(JSON.parse(localStorage.getItem(FAV)||'[]'))}catch{return new Set()}}
  function isFavourite(id){return favourites().has(id)}
  function toggleFavourite(id){const f=favourites();if(f.has(id))f.delete(id);else f.add(id);localStorage.setItem(FAV,JSON.stringify([...f]));renderDetail()}
  function selectVenue(v){const s=state();const changed=s.venueId!==v.id;Object.assign(s,{venueId:v.id,venueName:v.name,status:'selecting',updatedAt:Date.now()});if(changed)Object.assign(s,{courtId:null,courtName:null,courtType:null,slotStarts:[],quote:null,policyId:null,policyAccepted:false,bookingUuid:null,bookingCode:null,paymentUuid:null,paymentStatus:null});localStorage.setItem(STATE,JSON.stringify(s));localStorage.setItem('sbpPadelSelectedVenueId',v.id)}
  function venueCard(v){return `<article class="venueLarge sbpVenueCard" data-sbp-venue="${esc(v.id)}"><div class="venueLargeImage courtScene"><span class="badge green">OPEN</span><span class="count">${esc(v.city)}</span></div><div class="venueLargeCopy"><p class="overline">${esc(v.city).toUpperCase()}</p><h3>${esc(v.name)}</h3><p>${esc(v.address||'Sports Board Punjab Padel facility')}</p><div class="amenityLine">${(v.amenities||[]).slice(0,3).map(a=>`<span>${esc(a)}</span>`).join('')}</div><button class="secondary" type="button">Explore venue <b>→</b></button></div></article>`}
  function renderDirectory(){const root=document.querySelector('#venues .content.tight');if(!root)return;root.innerHTML=venues.length?venues.map(venueCard).join(''):'<div class="coming"><div><b>No active venues available</b><p>Facilities will appear here when activated by SBP Padel.</p></div></div>'}
  function renderFeatured(){const v=venues[0],card=document.querySelector('#home .homeFeature');if(!card||!v)return;card.dataset.sbpVenue=v.id;card.removeAttribute('data-nav');const over=card.querySelector('.overline'),h=card.querySelector('h3'),p=card.querySelector('.homeFeatureCopy p:not(.overline)'),count=card.querySelector('.count');if(over)over.textContent=v.city.toUpperCase();if(h)h.textContent=v.name;if(p)p.textContent=v.address||'SBP Padel facility';if(count)count.textContent='EXPLORE'}
  function renderDetail(){const root=document.getElementById('nishtar');if(!root||!detail)return;const courts=detail.courts||[],indoor=courts.filter(c=>c.is_indoor).length,fav=isFavourite(detail.id);root.innerHTML=`<div class="venueHero courtScene"><button class="back" type="button" data-sbp-venue-back aria-label="Back to venues">←</button><span class="badge">${esc(detail.name).toUpperCase()} · ${esc(detail.city).toUpperCase()}</span></div><div class="content detail"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px"><div><p class="overline">SPORTS BOARD PUNJAB</p><h1>${esc(detail.name)}</h1></div><button type="button" data-sbp-favourite="${esc(detail.id)}" aria-pressed="${fav?'true':'false'}" aria-label="${fav?'Remove from favourites':'Add to favourites'}" style="flex:none;width:42px;height:42px;border-radius:50%;border:1px solid var(--line);background:var(--surface);color:${fav?'var(--brand)':'var(--text)'};font-size:22px">${fav?'♥':'♡'}</button></div><div class="stats"><div><strong>${courts.length}</strong><small>Courts</small></div><div><strong>${indoor?`${indoor} Indoor`:'Outdoor'}</strong><small>Facility</small></div><div><strong>${esc(detail.opening_time)}–${esc(detail.closing_time)}</strong><small>Hours</small></div></div><p class="lead">${esc(detail.description||detail.address||'SBP Padel facility')}</p><div class="amenities">${(detail.amenities||[]).map(a=>`<span>${esc(a)}</span>`).join('')}</div><button class="primary full" data-nav="select">BOOK A COURT <span>→</span></button></div>`}
  async function openVenue(id){const v=venues.find(x=>x.id===id);if(!v)return;selectVenue(v);detail=await api(`/venues/${id}?_=${Date.now()}`);renderDetail();window.SBPNavigate?.('nishtar')}
  async function load(){try{venues=await api(`/venues?_=${Date.now()}`);renderDirectory();renderFeatured();const s=state();const selected=venues.find(v=>v.id===s.venueId);if(selected){detail=await api(`/venues/${selected.id}?_=${Date.now()}`);renderDetail()}}catch(err){console.error('SBP venue directory:',err)}}
  document.addEventListener('click',e=>{
    const back=e.target.closest?.('[data-sbp-venue-back]');if(back){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();window.SBPNavigate?.('venues');return}
    const fav=e.target.closest?.('[data-sbp-favourite]');if(fav){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();toggleFavourite(fav.dataset.sbpFavourite);return}
    const card=e.target.closest?.('[data-sbp-venue]');if(!card)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openVenue(card.dataset.sbpVenue).catch(console.error)
  },true);
  window.SBPPlayerVenuesRefresh=load;
  load();
})();
