(()=>{
  'use strict';
  if(window.__SBPNativePassQrLive)return;window.__SBPNativePassQrLive=true;

  let inFlight=false,lastKey='';
  const qrTarget=()=>document.querySelector('#sbpNativePanel .npQr,#pass .qr');
  const currentApi=()=>(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  async function blobToDataUrl(blob){return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Could not read QR image'));r.readAsDataURL(blob)})}

  async function hydrate(){
    const qr=qrTarget();
    if(!qr||inFlight)return;
    const bookingUuid=localStorage.getItem('sbpPadelSelectedBookingId')||localStorage.getItem('sbpPadelBookingUuid')||'';
    const token=localStorage.getItem('sbpPadelAccessToken')||'';
    const key=`${bookingUuid}|${token.slice(-8)}|${currentApi()}`;
    if(qr.dataset.sbpQrReady==='1'&&lastKey===key)return;
    lastKey=key;
    qr.dataset.sbpQrReady='0';
    qr.textContent='Loading QR…';
    qr.style.font='700 9px Inter,sans-serif';
    qr.style.color='#07110d';
    qr.style.background='#fff';
    qr.style.padding='6px';
    qr.style.overflow='hidden';
    if(!bookingUuid||!token){qr.textContent='QR unavailable';return}
    inFlight=true;
    try{
      const res=await fetch(`${currentApi()}/bookings/pass/${encodeURIComponent(bookingUuid)}/qr?format=png&_=${Date.now()}`,{
        headers:{Authorization:`Bearer ${token}`,Accept:'image/png'},cache:'no-store'
      });
      if(!res.ok){const text=await res.text();throw new Error(`QR request failed (${res.status}): ${text.slice(0,120)}`)}
      const blob=await res.blob();
      if(!blob.type.includes('png'))throw new Error('QR endpoint did not return PNG');
      const current=qrTarget();if(!current)return;
      const image=document.createElement('img');
      image.alt='Booking QR code';
      image.src=await blobToDataUrl(blob);
      image.style.cssText='display:block;width:100%;height:100%;object-fit:contain;image-rendering:pixelated;background:#fff';
      current.replaceChildren(image);
      current.dataset.sbpQrReady='1';
    }catch(err){
      console.error('SBP native digital pass QR:',err);
      const current=qrTarget();if(current){current.textContent='QR unavailable';current.dataset.sbpQrReady='0'}
    }finally{inFlight=false}
  }

  function scheduleHydrate(){setTimeout(hydrate,40);setTimeout(hydrate,180);setTimeout(hydrate,500)}
  document.addEventListener('click',e=>{const trigger=e.target.closest?.('[data-live-pass],#viewPass,[data-nav="pass"]');if(trigger)scheduleHydrate()},true);
  window.addEventListener('pageshow',scheduleHydrate);
  window.addEventListener('popstate',scheduleHydrate);
  let probes=0;const probe=setInterval(()=>{probes+=1;if(qrTarget())hydrate();if(probes>=20)clearInterval(probe)},250);
  window.SBPHydrateNativePassQR=hydrate;
})();
