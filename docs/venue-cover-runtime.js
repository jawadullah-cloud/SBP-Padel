(()=>{
'use strict';
if(window.__SBPVenueCoverRuntime)return;window.__SBPVenueCoverRuntime=true;
const cache=new Map(),apiBase=()=>window.SBPApiBase?.()||(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
function currentVenueId(){try{return JSON.parse(localStorage.getItem('sbpPadelBookingSessionV2')||'{}').venueId||localStorage.getItem('sbpPadelSelectedVenueId')||''}catch{return localStorage.getItem('sbpPadelSelectedVenueId')||''}}
async function cover(id){if(!id)return'';if(cache.has(id))return cache.get(id);try{const r=await fetch(`${apiBase()}/venues/${encodeURIComponent(id)}?_=${Date.now()}`,{cache:'no-store'}),v=await r.json();const url=r.ok?(v.cover_image_data_url||''):'';cache.set(id,url);return url}catch{cache.set(id,'');return''}}
async function apply(el,id){if(!el||!id)return;el.dataset.sbpCoverApplied=id;const url=await cover(id);if(!url||!el.isConnected||el.dataset.sbpCoverApplied!==id)return;el.style.backgroundImage=`linear-gradient(180deg,rgba(2,12,9,.08),rgba(2,12,9,.38)),url("${url.replace(/"/g,'%22')}")`;el.style.backgroundSize='cover';el.style.backgroundPosition='center';el.classList.add('sbpRealVenueCover')}
function scan(root=document){root.querySelectorAll?.('[data-sbp-cover-venue]').forEach(el=>apply(el,el.dataset.sbpCoverVenue));root.querySelectorAll?.('[data-sbp-current-venue-cover]').forEach(el=>apply(el,currentVenueId()))}
const observer=new MutationObserver(rows=>rows.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType===1){if(n.matches?.('[data-sbp-cover-venue]'))apply(n,n.dataset.sbpCoverVenue);if(n.matches?.('[data-sbp-current-venue-cover]'))apply(n,currentVenueId());scan(n)}})));
observer.observe(document.documentElement,{childList:true,subtree:true});
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>scan()):scan();
window.SBPVenueCover={cover,apply,scan,currentVenueId};
})();
