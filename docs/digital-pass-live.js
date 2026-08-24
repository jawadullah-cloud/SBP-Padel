(()=>{
  'use strict';
  if(window.__SBPDigitalPassLive)return;
  window.__SBPDigitalPassLive=true;

  const API=(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  const token=()=>localStorage.getItem('sbpPadelAccessToken')||'';
  const bookingId=()=>localStorage.getItem('sbpPadelSelectedBookingId')||localStorage.getItem('sbpPadelBookingUuid')||'';
  const qr=document.querySelector('.qr');
  if(!qr)return;
  let objectUrl='';

  function fail(message){
    if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=''}
    qr.classList.add('qrError');
    qr.innerHTML=`<span>${message}</span>`;
  }

  async function load(attempt=0){
    const id=bookingId(),auth=token();
    if(!id||!auth){
      if(attempt<4){setTimeout(()=>load(attempt+1),180);return}
      fail('QR unavailable');return;
    }
    try{
      const res=await fetch(`${API}/bookings/pass/${encodeURIComponent(id)}/qr?_=${Date.now()}`,{
        headers:{Authorization:`Bearer ${auth}`,Accept:'image/svg+xml'},
        cache:'no-store',
      });
      const text=await res.text();
      if(!res.ok)throw new Error(`QR request failed (${res.status}): ${text.slice(0,120)}`);
      if(!/<svg[\s>]/i.test(text))throw new Error('QR endpoint did not return SVG');
      if(objectUrl)URL.revokeObjectURL(objectUrl);
      objectUrl=URL.createObjectURL(new Blob([text],{type:'image/svg+xml'}));
      qr.classList.remove('qrError');
      qr.innerHTML='';
      const img=document.createElement('img');
      img.src=objectUrl;
      img.alt=`QR code for booking ${localStorage.getItem('sbpPadelBookingId')||id}`;
      img.style.width='100%';img.style.height='100%';img.style.display='block';img.style.objectFit='contain';img.style.background='#fff';
      img.onload=()=>{qr.dataset.sbpQrReady='1'};
      img.onerror=()=>fail('QR image failed to render');
      qr.appendChild(img);
    }catch(err){
      console.error('SBP digital pass QR:',err);
      if(attempt<3){setTimeout(()=>load(attempt+1),300);return}
      fail('QR unavailable');
    }
  }

  window.addEventListener('pageshow',()=>load(0));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load(0)});
  load(0);
})();
