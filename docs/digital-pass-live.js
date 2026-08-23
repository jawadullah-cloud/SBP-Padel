(()=>{
  'use strict';
  if(window.__SBPDigitalPassLive)return;
  window.__SBPDigitalPassLive=true;

  const API=(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  const token=localStorage.getItem('sbpPadelAccessToken')||'';
  const bookingId=localStorage.getItem('sbpPadelSelectedBookingId')||localStorage.getItem('sbpPadelBookingUuid')||'';
  const qr=document.querySelector('.qr');
  if(!qr)return;

  function fail(message){
    qr.classList.add('qrError');
    qr.innerHTML=`<span>${message}</span>`;
  }

  async function load(){
    if(!bookingId||!token){fail('QR unavailable');return}
    try{
      const res=await fetch(`${API}/bookings/pass/${encodeURIComponent(bookingId)}/qr?_=${Date.now()}`,{
        headers:{Authorization:`Bearer ${token}`,Accept:'image/svg+xml'},
        cache:'no-store',
      });
      const text=await res.text();
      if(!res.ok)throw new Error(`QR request failed (${res.status}): ${text.slice(0,120)}`);
      if(!/<svg[\s>]/i.test(text))throw new Error('QR endpoint did not return SVG');
      qr.classList.remove('qrError');
      qr.innerHTML=text;
      const svg=qr.querySelector('svg');
      if(svg){
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.style.width='100%';
        svg.style.height='100%';
        svg.style.display='block';
        svg.setAttribute('aria-label',`QR code for booking ${localStorage.getItem('sbpPadelBookingId')||bookingId}`);
        svg.setAttribute('role','img');
      }
    }catch(err){
      console.error('SBP digital pass QR:',err);
      fail('QR unavailable');
    }
  }
  load();
})();
