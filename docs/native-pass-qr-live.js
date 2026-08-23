(()=>{
  'use strict';
  if(window.__SBPNativePassQrLive)return;window.__SBPNativePassQrLive=true;

  const API=(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  let inFlight=false,lastKey='';

  async function hydrate(){
    const qr=document.querySelector('#sbpNativePanel .npQr');
    if(!qr||inFlight)return;
    const bookingUuid=localStorage.getItem('sbpPadelSelectedBookingId')||localStorage.getItem('sbpPadelBookingUuid')||'';
    const token=localStorage.getItem('sbpPadelAccessToken')||'';
    const key=`${bookingUuid}|${token.slice(-8)}`;
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
      const res=await fetch(`${API}/bookings/pass/${encodeURIComponent(bookingUuid)}/qr?_=${Date.now()}`,{
        headers:{Authorization:`Bearer ${token}`},cache:'no-store'
      });
      const svg=await res.text();
      if(!res.ok)throw new Error(`QR request failed (${res.status}): ${svg.slice(0,120)}`);
      if(!/<svg[\s>]/i.test(svg))throw new Error('QR endpoint did not return SVG');
      const current=document.querySelector('#sbpNativePanel .npQr');
      if(!current)return;
      current.innerHTML=svg;
      const el=current.querySelector('svg');
      if(el){el.setAttribute('width','100%');el.setAttribute('height','100%');el.style.display='block';el.style.background='#fff'}
      current.dataset.sbpQrReady='1';
    }catch(err){
      console.error('SBP native digital pass QR:',err);
      const current=document.querySelector('#sbpNativePanel .npQr');
      if(current){current.textContent='QR unavailable';current.dataset.sbpQrReady='0'}
    }finally{inFlight=false}
  }

  // The deep router renders the native pass synchronously from the click that
  // opens PASS. Schedule exactly one hydration after that render; do not watch
  // DOM mutations because the QR renderer itself changes the DOM.
  document.addEventListener('click',e=>{
    const trigger=e.target.closest?.('[data-live-pass],#viewPass');
    if(!trigger)return;
    setTimeout(hydrate,40);
  },true);

  window.SBPHydrateNativePassQR=hydrate;
})();
