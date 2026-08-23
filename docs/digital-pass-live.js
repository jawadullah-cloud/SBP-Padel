(()=>{
  'use strict';
  if(window.__SBPDigitalPassLive)return;
  window.__SBPDigitalPassLive=true;

  const API=(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  const token=localStorage.getItem('sbpPadelAccessToken')||'';
  const bookingId=localStorage.getItem('sbpPadelSelectedBookingId')||localStorage.getItem('sbpPadelBookingUuid')||'';
  const qr=document.querySelector('.qr');
  if(!qr)return;

  async function load(){
    if(!bookingId||!token){
      qr.textContent='QR unavailable';
      qr.style.font='700 10px Inter,sans-serif';
      return;
    }
    try{
      const res=await fetch(`${API}/bookings/pass/${encodeURIComponent(bookingId)}/qr?_=${Date.now()}`,{
        headers:{Authorization:`Bearer ${token}`},
        cache:'no-store',
      });
      if(!res.ok)throw new Error(`QR request failed (${res.status})`);
      const blob=await res.blob();
      const url=URL.createObjectURL(blob);
      qr.innerHTML='';
      qr.style.background='#fff';
      qr.style.padding='4px';
      qr.style.border='8px solid #07110d';
      const img=document.createElement('img');
      img.src=url;
      img.alt=`QR code for booking ${localStorage.getItem('sbpPadelBookingId')||''}`;
      img.style.width='100%';
      img.style.height='100%';
      img.style.display='block';
      qr.appendChild(img);
      window.addEventListener('pagehide',()=>URL.revokeObjectURL(url),{once:true});
    }catch(err){
      console.error('SBP digital pass QR:',err);
      qr.textContent='QR unavailable';
      qr.style.background='#fff';
      qr.style.color='#07110d';
      qr.style.font='700 9px Inter,sans-serif';
      qr.style.textAlign='center';
    }
  }
  load();
})();
