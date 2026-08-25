(()=>{
'use strict';
if(window.__SBPVenueCoverRuntime)return;window.__SBPVenueCoverRuntime=true;
const cache=new Map();let venuesPromise=null,scanTimer=0;
const apiBase=()=>window.SBPApiBase?.()||(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
function currentVenueId(){try{return JSON.parse(localStorage.getItem('sbpPadelBookingSessionV2')||'{}').venueId||localStorage.getItem('sbpPadelSelectedVenueId')||''}catch{return localStorage.getItem('sbpPadelSelectedVenueId')||''}}
async function venues(){if(!venuesPromise)venuesPromise=fetch(`${apiBase()}/venues?_=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():[]).catch(()=>[]);return venuesPromise}
async function venueByName(name){const key=String(name||'').trim().toLowerCase();if(!key)return null;return (await venues()).find(v=>String(v.name||'').trim().toLowerCase()===key)||null}
async function cover(id){if(!id)return'';if(cache.has(id))return cache.get(id);try{const v=(await venues()).find(x=>String(x.id)===String(id));if(v?.cover_image_data_url){cache.set(id,v.cover_image_data_url);return v.cover_image_data_url}const r=await fetch(`${apiBase()}/venues/${encodeURIComponent(id)}?_=${Date.now()}`,{cache:'no-store'}),d=await r.json();const url=r.ok?(d.cover_image_data_url||''):'';cache.set(id,url);return url}catch{cache.set(id,'');return''}}
async function apply(el,id){if(!el||!id)return;el.dataset.sbpCoverApplied=String(id);const url=await cover(id);if(!url||!el.isConnected||el.dataset.sbpCoverApplied!==String(id))return;el.style.backgroundImage=`linear-gradient(180deg,rgba(2,12,9,.08),rgba(2,12,9,.42)),url("${url.replace(/"/g,'%22')}")`;el.style.backgroundSize='cover';el.style.backgroundPosition='center';el.classList.add('sbpRealVenueCover')}
async function applyByName(el,name){const v=await venueByName(name);if(v)apply(el,v.id)}
function ensureStrip(host){if(!host||host.querySelector(':scope > .sbpVenueCoverStrip'))return host?.querySelector(':scope > .sbpVenueCoverStrip');const strip=document.createElement('div');strip.className='sbpVenueCoverStrip';strip.style.cssText='height:92px;margin:-1px -1px 12px;border-radius:15px 15px 10px 10px;background:linear-gradient(145deg,#07120f,#123a2a 52%,#1b5572);background-size:cover;background-position:center;';host.prepend(strip);return strip}
function scan(root=document){
 root.querySelectorAll?.('[data-sbp-cover-venue]').forEach(el=>apply(el,el.dataset.sbpCoverVenue));root.querySelectorAll?.('[data-sbp-current-venue-cover]').forEach(el=>apply(el,currentVenueId()));
 root.querySelectorAll?.('.sbpVenueCard[data-sbp-venue]').forEach(card=>apply(card.querySelector('.venueLargeImage'),card.dataset.sbpVenue));
 root.querySelectorAll?.('#home .homeFeature[data-sbp-venue]').forEach(card=>apply(card.querySelector('.homeFeatureVisual'),card.dataset.sbpVenue));
 root.querySelectorAll?.('#reviewNative .rnHero').forEach(el=>apply(el,currentVenueId()));
 root.querySelectorAll?.('.bkCard').forEach(card=>{const name=card.querySelector('.bkTop small')?.textContent;if(name)applyByName(card.querySelector('.bkHero'),name)});
 if(location.pathname.endsWith('/payment.html')){const host=document.querySelector('.summary'),name=document.getElementById('venue')?.textContent;if(host&&name&&!/loading/i.test(name))applyByName(ensureStrip(host),name);else if(host)apply(ensureStrip(host),currentVenueId())}
 if(location.pathname.endsWith('/payment-success.html')){const host=document.querySelector('.card'),name=document.getElementById('venue')?.textContent;if(host&&name&&!/loading/i.test(name))applyByName(ensureStrip(host),name);else if(host)apply(ensureStrip(host),currentVenueId())}
 if(location.pathname.endsWith('/booking-detail.html')){const hero=document.querySelector('.hero'),name=document.querySelector('.titleRow h2')?.textContent;if(hero&&name)applyByName(hero,name)}
 if(location.pathname.endsWith('/digital-pass.html')){const host=document.querySelector('.passBody')||document.querySelector('.pass'),name=[...document.querySelectorAll('h1,h2,h3,small')].find(x=>/park|centre|complex|club|venue/i.test(x.textContent||''))?.textContent;if(host&&name)applyByName(ensureStrip(host),name)}
}
function schedule(){clearTimeout(scanTimer);scanTimer=setTimeout(()=>scan(),30)}
const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',scan):scan();window.addEventListener('pageshow',scan);window.addEventListener('sbp-venue-cover-refresh',()=>{venuesPromise=null;cache.clear();scan()});
window.SBPVenueCover={cover,apply,scan,currentVenueId,venueByName};
})();
