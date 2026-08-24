(()=>{
  'use strict';
  if(window.__SBPPlayerVenuesLive)return;window.__SBPPlayerVenuesLive=true;
  const path=location.pathname||'/';
  if(path!=='/'&&!path.endsWith('/index.html')&&!path.endsWith('/docs/')&&!path.endsWith('/docs/index.html'))return;
  const API=(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  const STATE='sbpPadelBookingSessionV2',FAV='sbpPadelFavouriteVenueIds';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtTime=t=>{if(!t)return'';const [h,m]=String(t).split(':').map(Number);const d=new Date(2000,0,1,h,m||0);return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}).replace(' ',' ')};
  const amenityIcon=a=>{const k=String(a||'').toLowerCase();if(k.includes('park'))return'Ⓟ';if(k.includes('cafe')||k.includes('food'))return'☕';if(k.includes('seat'))return'▥';if(k.includes('chang'))return'◉';if(k.includes('light'))return'☼';return'✓'};
  let venues=[],detail=null;
  async function api(path){const r=await fetch(`${API}${path}`,{cache:'no-store'});let b=null;try{b=await r.json()}catch{}if(!r.ok)throw new Error(typeof b?.detail==='string'?b.detail:`Request failed (${r.status})`);return b}
  function state(){try{return JSON.parse(localStorage.getItem(STATE)||'{}')}catch{return{}}}
  function favourites(){try{return new Set(JSON.parse(localStorage.getItem(FAV)||'[]'))}catch{return new Set()}}
  function isFavourite(id){return favourites().has(id)}
  function toggleFavourite(id){const f=favourites();if(f.has(id))f.delete(id);else f.add(id);localStorage.setItem(FAV,JSON.stringify([...f]));window.dispatchEvent(new CustomEvent('sbp-favourites-change',{detail:{ids:[...f]}}));renderDetail()}
  function selectVenue(v){const s=state();const changed=s.venueId!==v.id;Object.assign(s,{venueId:v.id,venueName:v.name,status:'selecting',updatedAt:Date.now()});if(changed)Object.assign(s,{courtId:null,courtName:null,courtType:null,slotStarts:[],quote:null,policyId:null,policyAccepted:false,bookingUuid:null,bookingCode:null,paymentUuid:null,paymentStatus:null});localStorage.setItem(STATE,JSON.stringify(s));localStorage.setItem('sbpPadelSelectedVenueId',v.id)}
  function venueCard(v){return `<article class="venueLarge sbpVenueCard" data-sbp-venue="${esc(v.id)}"><div class="venueLargeImage courtScene"><span class="badge green">OPEN</span><span class="count">${esc(v.city)}</span></div><div class="venueLargeCopy"><p class="overline">${esc(v.city).toUpperCase()}</p><h3>${esc(v.name)}</h3><p>${esc(v.address||'Sports Board Punjab Padel facility')}</p><div class="amenityLine">${(v.amenities||[]).slice(0,3).map(a=>`<span>${esc(a)}</span>`).join('')}</div><button class="secondary" type="button">Explore venue <b>→</b></button></div></article>`}
  function renderDirectory(){const root=document.querySelector('#venues .content.tight');if(!root)return;root.innerHTML=venues.length?venues.map(venueCard).join(''):'<div class="coming"><div><b>No active venues available</b><p>Facilities will appear here when activated by SBP Padel.</p></div></div>'}
  function renderFeatured(){const v=venues[0],card=document.querySelector('#home .homeFeature');if(!card||!v)return;card.dataset.sbpVenue=v.id;card.removeAttribute('data-nav');const over=card.querySelector('.overline'),h=card.querySelector('h3'),p=card.querySelector('.homeFeatureCopy p:not(.overline)'),count=card.querySelector('.count');if(over)over.textContent=v.city.toUpperCase();if(h)h.textContent=v.name;if(p)p.textContent=v.address||'SBP Padel facility';if(count)count.textContent='EXPLORE'}
  function renderDetail(){
    const root=document.getElementById('nishtar');if(!root||!detail)return;
    const courts=detail.courts||[],fav=isFavourite(detail.id),indoor=courts.filter(c=>c.is_indoor).length;
    const facility=indoor===courts.length&&courts.length?'Indoor':indoor?'Indoor + Outdoor':'Outdoor';
    const directions=(detail.latitude!=null&&detail.longitude!=null)?`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(detail.latitude)},${encodeURIComponent(detail.longitude)}`:'';
    const amenities=(detail.amenities||[]).map(a=>`<div><i>${amenityIcon(a)}</i>${esc(a)}</div>`).join('');
    root.innerHTML=`<div class="venueRefHero courtScene"><button class="back" type="button" data-sbp-venue-back aria-label="Back to venues">←</button><button class="venueShare" type="button" aria-label="Share venue">↗</button><div class="ratingPill"><b>★ 4.8</b> (120)</div></div><div class="venueRefBody"><div class="venueTitleRow"><div><p class="overline">${esc(detail.city).toUpperCase()} · SPORTS BOARD PUNJAB</p><h1>${esc(detail.name)}</h1></div><button class="heartBtn" type="button" data-sbp-favourite="${esc(detail.id)}" aria-pressed="${fav?'true':'false'}" aria-label="${fav?'Remove from favourites':'Add to favourites'}" style="color:${fav?'#ff5b62':'var(--text)'}">${fav?'♥':'♡'}</button></div><div class="venueFeatureBar"><div><strong>${courts.length}</strong><span>Courts</span></div><div><strong>◫</strong><span>${facility}</span></div><div><strong>☼</strong><span>Floodlights</span></div><div><strong>Ⓟ</strong><span>Parking</span></div></div><section class="venueRefSection"><h3>About Venue</h3><p>${esc(detail.description||'Professional SBP Padel courts for everyday play and competition.')}</p><div class="venueMeta"><div class="venueLocationRow"><span>⌖ ${esc(detail.address||`${detail.name}, ${detail.city}`)}</span>${directions?`<a class="directionsLink" href="${directions}" data-sbp-directions>DIRECTIONS ↗</a>`:''}</div><span><b>◉ Open ${esc(fmtTime(detail.opening_time))} – ${esc(fmtTime(detail.closing_time))}</b></span></div></section><section class="venueRefSection"><h3>Amenities</h3><div class="venueAmenities">${amenities||'<div><i>✓</i>Padel Courts</div>'}</div></section><div class="venueBookBar"><button class="primary full" data-nav="select">BOOK A COURT <span>→</span></button></div></div>`;
    window.SBPRefreshBackIcons?.();
  }
  async function openVenue(id){let v=venues.find(x=>String(x.id)===String(id));if(!v){venues=await api(`/venues?_=${Date.now()}`);v=venues.find(x=>String(x.id)===String(id))}if(!v)return;selectVenue(v);detail=await api(`/venues/${id}?_=${Date.now()}`);renderDetail();window.SBPNavigate?.('nishtar')}
  async function load(){try{venues=await api(`/venues?_=${Date.now()}`);renderDirectory();renderFeatured();const s=state();const selected=venues.find(v=>v.id===s.venueId);if(selected){detail=await api(`/venues/${selected.id}?_=${Date.now()}`);renderDetail()}}catch(err){console.error('SBP venue directory:',err)}}
  document.addEventListener('click',e=>{
    const back=e.target.closest?.('[data-sbp-venue-back]');if(back){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();window.SBPNavigate?.('venues');return}
    const fav=e.target.closest?.('[data-sbp-favourite]');if(fav){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();toggleFavourite(fav.dataset.sbpFavourite);return}
    const dir=e.target.closest?.('[data-sbp-directions]');if(dir){e.stopPropagation();return}
    const card=e.target.closest?.('[data-sbp-venue]');if(!card)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openVenue(card.dataset.sbpVenue).catch(console.error)
  },true);
  window.SBPPlayerVenuesRefresh=load;
  window.SBPPlayerOpenVenue=id=>openVenue(id);
  load();
})();
