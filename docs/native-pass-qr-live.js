(()=>{
  'use strict';
  if(window.__SBPNativePassQrLive)return;window.__SBPNativePassQrLive=true;

  let inFlight=false,lastKey='';
  const qrTarget=()=>document.querySelector('#sbpNativePanel .npQr,#pass .qr');
  const currentApi=()=>(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');

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
      const res=await fetch(`${currentApi()}/bookings/pass/${encodeURIComponent(bookingUuid)}/qr?_=${Date.now()}`,{
        headers:{Authorization:`Bearer ${token}`},cache:'no-store'
      });
      const svg=await res.text();
      if(!res.ok)throw new Error(`QR request failed (${res.status}): ${svg.slice(0,120)}`);
      if(!/<svg[\s>]/i.test(svg))throw new Error('QR endpoint did not return SVG');
      const current=qrTarget();
      if(!current)return;

      // Android System WebView is more reliable rendering the returned SVG as
      // an image than adopting remote SVG markup into the live document.
      const encoded=btoa(unescape(encodeURIComponent(svg)));
      const image=document.createElement('img');
      image.alt='Booking QR code';
      image.src=`data:image/svg+xml;base64,${encoded}`;
      image.style.cssText='display:block;width:100%;height:100%;object-fit:contain;background:#fff';
      current.replaceChildren(image);
      current.dataset.sbpQrReady='1';
    }catch(err){
      console.error('SBP native digital pass QR:',err);
      const current=qrTarget();
      if(current){current.textContent='QR unavailable';current.dataset.sbpQrReady='0'}
    }finally{inFlight=false}
  }

  function scheduleHydrate(){
    setTimeout(hydrate,40);
    setTimeout(hydrate,180);
    setTimeout(hydrate,500);
  }

  document.addEventListener('click',e=>{
    const trigger=e.target.closest?.('[data-live-pass],#viewPass,[data-nav="pass"]');
    if(trigger)scheduleHydrate();
  },true);
  window.addEventListener('pageshow',scheduleHydrate);
  window.addEventListener('popstate',scheduleHydrate);

  // Navigation/rendering in the player can replace the pass panel without a
  // full page navigation. A short bounded probe catches that Android path
  // without leaving a permanent DOM observer running.
  let probes=0;
  const probe=setInterval(()=>{
    probes+=1;
    if(qrTarget())hydrate();
    if(probes>=20)clearInterval(probe);
  },250);

  window.SBPHydrateNativePassQR=hydrate;
})();
