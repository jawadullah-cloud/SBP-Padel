(()=>{
'use strict';
if(window.__SBPVenueCoverRuntime)return;window.__SBPVenueCoverRuntime=true;
const cache=new Map();let venuesPromise=null,scanTimer=0;
const apiBase=()=>window.SBPApiBase?.()||(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
function currentVenueId(){try{return JSON.parse(localStorage.getItem('sbpPadelBookingSessionV2')||'{}').venueId||localStorage.getItem('sbpPadelSelectedVenueId')||''}catch{return localStorage.getItem('sbpPadelSelectedVenueId')||''}}
async function venues(){if(!venuesPromise)venuesPromise=fetch(`${apiBase()}/venues?_=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():[]).catch(()=>[]);return venuesPromise}
async function venueByName(name){const key=String(name||'').trim().toLowerCase();if(!key)return null;return (await venues()).find(v=>String(v.name||'').trim().toLowerCase()===key)||null}
async function cover(id){if(!id)return'';if(cache.has(id))return cache.get(id);try{const v=(await venues()).find(x=>String(x.id)===String(id));if(v?.cover_image_data_url){cache.set(id,v.cover_image_data_url);return v.cover_image_data_url}const r=await fetch(`${apiBase()}/venues/${encodeURIComponent(id)}?_=${Date.now()}`,{cache:'no-store'}),d=await r.json();const url=r.ok?(d.cover_image_data_url||''):'';cache.set(id,url);return url}catch{cache.set(id,'');return''}}
function neutralizePrototype(el){if(!el)return;el.classList.add('sbpRealVenueCover');el.querySelectorAll?.('.courtVisual,.miniCourt').forEach(x=>x.style.setProperty('display','none','important'))}
async function apply(el,id){if(!el||!id)return;el.dataset.sbpCoverApplied=String(id);const url=await cover(id);if(!url||!el.isConnected||el.dataset.sbpCoverApplied!==String(id))return;neutralizePrototype(el);el.style.setProperty('background-image',`linear-gradient(180deg,rgba(2,12,9,.12),rgba(2,12,9,.48)),url("${url.replace(/"/g,'%22')}")`,'important');el.style.setProperty('background-size','cover','important');el.style.setProperty('background-position','center','important');el.style.setProperty('background-repeat','no-repeat','important')}
function ensureStrip(host){if(!host)return null;let strip=host.querySelector(':scope > .sbpVenueCoverStrip');if(strip)return strip;strip=document.createElement('div');strip.className='sbpVenueCoverStrip';strip.style.cssText='height:92px;margin:-1px -1px 12px;border-radius:15px 15px 10px 10px;background:linear-gradient(145deg,#07120f,#123a2a 52%,#1b5572);background-size:cover;background-position:center;pointer-events:none;';host.prepend(strip);return strip}
function applyCurrentToPageSurfaces(root=document){const id=currentVenueId();if(!id)return;
 root.querySelectorAll?.('#reviewNative .rnHero').forEach(el=>apply(el,id));
 root.querySelectorAll?.('.summary').forEach(host=>{if(host.querySelector('#venue'))apply(ensureStrip(host),id)});
 root.querySelectorAll?.('.successMark').forEach(mark=>{const host=mark.parentElement?.querySelector('.card');if(host)apply(ensureStrip(host),id)});
 root.querySelectorAll?.('#statusPill').forEach(()=>{const hero=document.querySelector('.hero');if(hero)apply(hero,id)});
 root.querySelectorAll?.('.pass #venue').forEach(()=>{const pass=document.querySelector('.pass');if(pass)apply(ensureStrip(pass),id)});
}
async function applyNamedSurfaces(root=document){const vs=await venues();for(const v of vs){const name=String(v.name||'').trim().toLowerCase();if(!name||!v.cover_image_data_url)continue;const nodes=[...(root.querySelectorAll?.('h1,h2,h3,small,p,span,b')||[])].filter(el=>String(el.textContent||'').trim().toLowerCase()===name);for(const node of nodes){const home=node.closest('.homeFeature');if(home)apply(home.querySelector('.homeFeatureVisual'),v.id);const large=node.closest('.venueLarge');if(large)apply(large.querySelector('.venueLargeImage'),v.id);const bk=node.closest('.bkCard');if(bk)apply(bk.querySelector('.bkHero'),v.id);const summary=node.closest('.summary');if(summary)apply(ensureStrip(summary),v.id);const confirm=node.closest('.card');if(confirm&&document.querySelector('.successMark'))apply(ensureStrip(confirm),v.id);const detail=node.closest('.titleRow');if(detail){const hero=document.querySelector('.hero');if(hero)apply(hero,v.id)}const pass=node.closest('.pass');if(pass)apply(ensureStrip(pass),v.id)}}}
function scan(root=document){
 root.querySelectorAll?.('[data-sbp-cover-venue]').forEach(el=>apply(el,el.dataset.sbpCoverVenue));root.querySelectorAll?.('[data-sbp-current-venue-cover]').forEach(el=>apply(el,currentVenueId()));
 root.querySelectorAll?.('.sbpVenueCard[data-sbp-venue]').forEach(card=>apply(card.querySelector('.venueLargeImage'),card.dataset.sbpVenue));
 root.querySelectorAll?.('#home .homeFeature[data-sbp-venue]').forEach(card=>apply(card.querySelector('.homeFeatureVisual'),card.dataset.sbpVenue));
 root.querySelectorAll?.('.bkCard[data-sbp-venue]').forEach(card=>apply(card.querySelector('.bkHero'),card.dataset.sbpVenue));
 applyCurrentToPageSurfaces(document);applyNamedSurfaces(document);
}
function schedule(){clearTimeout(scanTimer);scanTimer=setTimeout(()=>scan(),120)}
const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',scan):scan();window.addEventListener('pageshow',scan);window.addEventListener('sbp-venue-cover-refresh',()=>{venuesPromise=null;cache.clear();scan()});
window.SBPVenueCover={cover,apply,scan,currentVenueId,venueByName};
})();
