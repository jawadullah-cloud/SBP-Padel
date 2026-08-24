(()=>{
  'use strict';
  if(window.__SBPDigitalPassLive)return;
  window.__SBPDigitalPassLive=true;

  const API=(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  const token=()=>localStorage.getItem('sbpPadelAccessToken')||'';
  const storedUuid=()=>localStorage.getItem('sbpPadelSelectedBookingId')||localStorage.getItem('sbpPadelBookingUuid')||'';
  const storedCode=()=>localStorage.getItem('sbpPadelBookingId')||'';
  const qr=document.querySelector('.qr');
  if(!qr)return;
  const uuidRe=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function fail(message){
    qr.classList.add('qrError');
    qr.dataset.sbpQrReady='0';
    qr.innerHTML=`<span>${String(message||'QR unavailable').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</span>`;
  }

  async function json(path,auth){
    const res=await fetch(`${API}${path}`,{headers:{Authorization:`Bearer ${auth}`,Accept:'application/json'},cache:'no-store'});
    let body=null;try{body=await res.json()}catch{}
    if(!res.ok)throw new Error(typeof body?.detail==='string'?body.detail:`Request failed (${res.status})`);
    return body;
  }

  async function resolveBookingUuid(auth){
    const direct=storedUuid();
    if(uuidRe.test(direct))return direct;
    const code=storedCode();
    if(!code)throw new Error('Booking identifier is missing');
    const rows=await json(`/bookings/me?_=${Date.now()}`,auth);
    const match=Array.isArray(rows)?rows.find(row=>row?.booking_code===code):null;
    if(!match?.id||!uuidRe.test(match.id))throw new Error(`Could not resolve booking ${code}`);
    localStorage.setItem('sbpPadelSelectedBookingId',match.id);
    return match.id;
  }

  async function load(attempt=0){
    const auth=token();
    if(!auth){
      if(attempt<3){setTimeout(()=>load(attempt+1),180);return}
      fail('QR unavailable: sign-in token missing');return;
    }
    qr.classList.remove('qrError');
    qr.innerHTML='<span>Loading QR…</span>';
    try{
      const id=await resolveBookingUuid(auth);
      const res=await fetch(`${API}/bookings/pass/${encodeURIComponent(id)}/qr?_=${Date.now()}`,{
        headers:{Authorization:`Bearer ${auth}`,Accept:'image/svg+xml'},cache:'no-store'
      });
      const text=await res.text();
      if(!res.ok)throw new Error(`QR request failed (${res.status})${text?`: ${text.slice(0,90)}`:''}`);
      if(!/<svg[\s>]/i.test(text))throw new Error('QR endpoint did not return SVG');

      // Data URLs are more reliable than blob: URLs across Android System WebView versions.
      const img=document.createElement('img');
      img.alt=`QR code for booking ${storedCode()||id}`;
      img.style.cssText='width:100%;height:100%;display:block;object-fit:contain;background:#fff';
      img.onload=()=>{qr.dataset.sbpQrReady='1'};
      img.onerror=()=>fail('QR image failed to render');
      img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(text);
      qr.innerHTML='';
      qr.appendChild(img);
    }catch(err){
      console.error('SBP digital pass QR:',err);
      if(attempt<2){setTimeout(()=>load(attempt+1),300);return}
      fail(`QR unavailable: ${err?.message||'unknown error'}`);
    }
  }

  window.addEventListener('pageshow',()=>load(0));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load(0)});
  load(0);
})();
