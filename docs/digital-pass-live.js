(()=>{
  'use strict';
  if(window.__SBPDigitalPassLive)return;window.__SBPDigitalPassLive=true;
  const token=()=>localStorage.getItem('sbpPadelAccessToken')||'';
  const apiBase=()=>window.SBPApiBase?.()||(localStorage.getItem('sbpPadelApiBase')||'').replace(/\/$/,'');
  const queryBooking=()=>new URLSearchParams(location.search).get('booking')||'';
  const storedUuid=()=>queryBooking()||localStorage.getItem('sbpPadelSelectedBookingId')||localStorage.getItem('sbpPadelBookingUuid')||'';
  const qr=document.querySelector('.qr');if(!qr)return;
  let activePromise=null,lastBooking='';
  const fmtTime=t=>{const[h,m]=String(t||'00:00').split(':').map(Number);return new Date(2000,0,1,h,m||0).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})};
  const fmtDate=iso=>new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short',year:'numeric'}).toUpperCase();
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val??'—'};
  async function json(path){const res=await fetch(`${apiBase()}${path}`,{headers:{Authorization:`Bearer ${token()}`,Accept:'application/json'},cache:'no-store'});let body=null;try{body=await res.json()}catch{}if(!res.ok)throw new Error(body?.detail||`Request failed (${res.status})`);return body}
  async function blobToDataUrl(blob){return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Could not read QR image'));r.readAsDataURL(blob)})}
  function showError(message){qr.dataset.sbpQrReady='0';qr.classList.add('qrError');qr.replaceChildren(Object.assign(document.createElement('span'),{textContent:message}))}
  function markInvalid(status){const badge=document.querySelector('.pass .top > small');if(badge){badge.textContent=`${String(status||'INVALID').replaceAll('_',' ').toUpperCase()} · PASS INVALID`;badge.style.color='#7a1717'}const top=document.querySelector('.pass .top');if(top)top.style.background='linear-gradient(135deg,#d8b1b1,#f3d4d4)';document.querySelector('.hint')?.replaceChildren(document.createTextNode('This booking cannot be used for court entry.'));document.querySelector('.checkinNote')?.replaceChildren(document.createTextNode('No check-in is permitted for this booking status.'))}
  function sessionMeta(slots){const rows=Array.isArray(slots)?slots:[];if(!rows.length)return{label:'—',hours:0,count:0};return{label:`${fmtTime(rows[0].start_time)} – ${fmtTime(rows[rows.length-1].end_time)}`,hours:rows.length,count:rows.length}}
  function routeMain(open){const url=`index.html?open=${encodeURIComponent(open)}`;if(window.parent&&window.parent!==window&&typeof window.parent.SBPDeepRoute==='function'){window.parent.SBPDeepRoute(url);return}location.replace(url)}
  async function hydrate(force=false){
    const id=storedUuid(),auth=token();if(!id||!auth){showError('QR unavailable');return}
    localStorage.setItem('sbpPadelSelectedBookingId',id);
    if(!force&&id===lastBooking&&qr.dataset.sbpQrReady==='1')return;if(activePromise)return activePromise;
    lastBooking=id;qr.classList.remove('qrError');qr.dataset.sbpQrReady='0';qr.innerHTML='<span>Loading pass…</span>';
    activePromise=(async()=>{try{
      const b=await json(`/bookings/${encodeURIComponent(id)}?_=${Date.now()}`);
      if(!['confirmed','rescheduled'].includes(b.status)){set('bookingId',b.booking_code);set('date',fmtDate(b.date));markInvalid(b.status);showError('PASS INVALID');return}
      const [participants,venues]=await Promise.all([json(`/bookings/${encodeURIComponent(id)}/participants?_=${Date.now()}`),json(`/venues?_=${Date.now()}`)]);
      const venue=(venues||[]).find(v=>v.id===b.venue_id);const vd=venue?await json(`/venues/${venue.id}?_=${Date.now()}`):null;const court=vd?.courts?.find(c=>c.id===b.court_id),session=sessionMeta(b.slots);
      set('venue',(venue?.name||vd?.name||'SBP Padel').toUpperCase());set('court',(court?.name||'Court').toUpperCase());set('date',fmtDate(b.date));set('time',session.label);set('duration',`${session.hours} hour${session.hours===1?'':'s'}`);set('slotCount',`${session.count} slot${session.count===1?'':'s'}`);set('bookingId',b.booking_code);
      const count=Number(participants?.player_count||1);set('players',`${count} registered player${count===1?'':'s'}`);localStorage.setItem('sbpPadelBookingId',b.booking_code||'');localStorage.setItem('sbpPadelCheckoutPlayers',JSON.stringify(participants?.players||[]));
      const res=await fetch(`${apiBase()}/bookings/pass/${encodeURIComponent(id)}/qr?format=png&_=${Date.now()}`,{headers:{Authorization:`Bearer ${auth}`,Accept:'image/png'},cache:'no-store'});if(!res.ok){let msg=`QR request failed (${res.status})`;try{const body=await res.json();msg=body.detail||msg}catch{}throw new Error(msg)}const blob=await res.blob();if(!blob.type.includes('png'))throw new Error('QR endpoint did not return an image');
      const img=document.createElement('img');img.alt=`QR code for booking ${b.booking_code}`;img.style.cssText='width:100%;height:100%;display:block;object-fit:contain;image-rendering:pixelated;background:#fff';img.src=await blobToDataUrl(blob);img.onload=()=>{qr.dataset.sbpQrReady='1'};img.onerror=()=>showError('QR image failed to render');qr.replaceChildren(img);
    }catch(err){console.error('SBP digital pass:',err);showError(err?.message||'Pass unavailable')}finally{activePromise=null}})();return activePromise
  }
  document.addEventListener('click',e=>{const el=e.target.closest?.('.head .back,.actions .home,.actions .bookings');if(!el)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(el.matches('.home'))routeMain('home');else routeMain('bookings')},true);
  hydrate();window.addEventListener('pageshow',()=>hydrate(false));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')hydrate(false)});
})();
