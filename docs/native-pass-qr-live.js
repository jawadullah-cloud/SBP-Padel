(()=>{
  'use strict';
  if(window.__SBPNativePassQrLive)return;window.__SBPNativePassQrLive=true;

  let inFlight=false,lastKey='';
  const currentApi=()=>(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  const isVisible=el=>!!(el&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
  const qrTarget=()=>{
    const active=document.querySelector('#pass.active .qr');
    if(active)return active;
    const native=[...document.querySelectorAll('#sbpNativePanel .npQr')].find(isVisible);
    if(native)return native;
    return document.querySelector('#pass .qr,#sbpNativePanel .npQr');
  };
  async function blobToDataUrl(blob){return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Could not read QR image'));r.readAsDataURL(blob)})}

  async function hydrate(force=false){
    const qr=qrTarget();
    if(!qr||inFlight)return;
    const bookingUuid=localStorage.getItem('sbpPadelSelectedBookingId')||localStorage.getItem('sbpPadelBookingUuid')||'';
    const token=localStorage.getItem('sbpPadelAccessToken')||'';
    const key=`${bookingUuid}|${token.slice(-8)}|${currentApi()}|${qr.closest('#pass')?'pass':'native'}`;
    if(!force&&qr.dataset.sbpQrReady==='1'&&lastKey===key)return;
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
      if(!blob.type.includes('png'))throw new Error(`QR endpoint returned ${blob.type||'unknown type'}`);
      const current=qrTarget();if(!current)return;
      const image=document.createElement('img');
      image.alt='Booking QR code';
      image.src=await blobToDataUrl(blob);
      image.style.cssText='display:block;width:100%;height:100%;object-fit:contain;image-rendering:pixelated;background:#fff';
      image.onload=()=>{current.dataset.sbpQrReady='1'};
      image.onerror=()=>{current.textContent='QR image failed to render';current.dataset.sbpQrReady='0'};
      current.replaceChildren(image);
    }catch(err){
      console.error('SBP native digital pass QR:',err);
      const current=qrTarget();if(current){current.textContent=`QR unavailable: ${err?.message||'unknown error'}`;current.dataset.sbpQrReady='0'}
    }finally{inFlight=false}
  }

  function scheduleHydrate(force=false){
    setTimeout(()=>hydrate(force),20);
    setTimeout(()=>hydrate(force),140);
    setTimeout(()=>hydrate(force),420);
  }

  // Remove the prototype glyph immediately so a fake QR can never be mistaken
  // for the real booking pass while hydration is pending.
  document.querySelectorAll('#pass .qr').forEach(q=>{q.textContent='Loading QR…';q.dataset.sbpQrReady='0'});

  document.addEventListener('click',e=>{
    const trigger=e.target.closest?.('[data-live-pass],#viewPass,[data-nav="pass"]');
    if(trigger)scheduleHydrate(true);
  },true);
  window.addEventListener('pageshow',()=>scheduleHydrate(true));
  window.addEventListener('popstate',()=>scheduleHydrate(true));

  const pass=document.getElementById('pass');
  if(pass){
    new MutationObserver(()=>{if(pass.classList.contains('active'))scheduleHydrate(true)})
      .observe(pass,{attributes:true,attributeFilter:['class']});
  }

  let probes=0;const probe=setInterval(()=>{probes+=1;if(document.querySelector('#pass.active .qr'))hydrate();if(probes>=24)clearInterval(probe)},250);
  window.SBPHydrateNativePassQR=()=>hydrate(true);
})();
