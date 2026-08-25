(()=>{
  'use strict';
  if(window.__SBPDigitalPassLive)return;window.__SBPDigitalPassLive=true;
  const token=()=>localStorage.getItem('sbpPadelAccessToken')||'';
  const apiBase=()=>window.SBPApiBase?.()||(localStorage.getItem('sbpPadelApiBase')||'').replace(/\/$/,'');
  const storedUuid=()=>localStorage.getItem('sbpPadelSelectedBookingId')||localStorage.getItem('sbpPadelBookingUuid')||'';
  const qr=document.querySelector('.qr');if(!qr)return;
  let activePromise=null,lastBooking='';
  const fmtTime=t=>{const [h,m]=String(t||'00:00').split(':').map(Number);return new Date(2000,0,1,h,m||0).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})};
  const fmtDate=iso=>new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short',year:'numeric'}).toUpperCase();
  const set=(id,val)=>{const el=document.getElementById(id);if(el&&val!=null)el.textContent=val};
  async function json(path){const res=await fetch(`${apiBase()}${path}`,{headers:{Authorization:`Bearer ${token()}`,Accept:'application/json'},cache:'no-store'});let body=null;try{body=await res.json()}catch{}if(!res.ok)throw new Error(body?.detail||`Request failed (${res.status})`);return body}
  async function blobToDataUrl(blob){return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Could not read QR image'));r.readAsDataURL(blob)})}
  function showError(message){qr.dataset.sbpQrReady='0';qr.classList.add('qrError');qr.replaceChildren(Object.assign(document.createElement('span'),{textContent:message}))}
  async function hydrate(force=false){
    const id=storedUuid(),auth=token();if(!id||!auth){showError('QR unavailable');return}
    if(!force&&id===lastBooking&&qr.dataset.sbpQrReady==='1')return;
    if(activePromise)return activePromise;
    lastBooking=id;qr.classList.remove('qrError');qr.dataset.sbpQrReady='0';qr.innerHTML='<span>Loading pass…</span>';
    activePromise=(async()=>{
      try{
        const [b,participants,venues]=await Promise.all([json(`/bookings/${encodeURIComponent(id)}?_=${Date.now()}`),json(`/bookings/${encodeURIComponent(id)}/participants?_=${Date.now()}`),json('/venues')]);
        const venue=(venues||[]).find(v=>v.id===b.venue_id);const vd=venue?await json(`/venues/${venue.id}`):null;const court=vd?.courts?.find(c=>c.id===b.court_id);
        set('venue',(venue?.name||vd?.name||'SBP Padel').toUpperCase());set('court',(court?.name||'Court').toUpperCase());set('date',fmtDate(b.date));
        if(b.slots?.length)set('time',`${fmtTime(b.slots[0].start_time)} – ${fmtTime(b.slots[b.slots.length-1].end_time)}`);set('bookingId',b.booking_code);
        const count=Number(participants?.player_count||1);set('players',`${count} registered player${count===1?'':'s'}`);localStorage.setItem('sbpPadelBookingId',b.booking_code||'');
        const res=await fetch(`${apiBase()}/bookings/pass/${encodeURIComponent(id)}/qr?format=png&_=${Date.now()}`,{headers:{Authorization:`Bearer ${auth}`,Accept:'image/png'},cache:'no-store'});if(!res.ok)throw new Error(`QR request failed (${res.status})`);const blob=await res.blob();if(!blob.type.includes('png'))throw new Error('QR endpoint did not return an image');
        const img=document.createElement('img');img.alt=`QR code for booking ${b.booking_code}`;img.style.cssText='width:100%;height:100%;display:block;object-fit:contain;image-rendering:pixelated;background:#fff';img.src=await blobToDataUrl(blob);img.onload=()=>{qr.dataset.sbpQrReady='1'};img.onerror=()=>showError('QR image failed to render');qr.replaceChildren(img);
      }catch(err){console.error('SBP digital pass:',err);showError(err?.message||'Pass unavailable')}finally{activePromise=null}
    })();return activePromise;
  }
  const go=url=>location.replace(url);
  const back=document.querySelector('.head .back');if(back)back.onclick=e=>{e.preventDefault();go('index.html?open=bookings')};
  document.querySelector('.actions .home')?.addEventListener('click',e=>{e.preventDefault();go('index.html?open=home')},true);
  document.querySelector('.actions .bookings')?.addEventListener('click',e=>{e.preventDefault();go('index.html?open=bookings')},true);
  hydrate();window.addEventListener('pageshow',()=>hydrate(false));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')hydrate(false)});
})();
