(()=>{
  'use strict';
  if(window.__SBPNativePassQrLive)return;window.__SBPNativePassQrLive=true;

  const API=(localStorage.getItem('sbpPadelApiBase')||'http://127.0.0.1:8000/api/v1').replace(/\/$/,'');
  const panel=()=>document.getElementById('sbpNativePanel');
  let activeKey='';

  async function hydrate(){
    const root=panel(),qr=root?.querySelector('.npQr');
    if(!qr)return;
    const bookingUuid=localStorage.getItem('sbpPadelSelectedBookingId')||localStorage.getItem('sbpPadelBookingUuid')||'';
    const token=localStorage.getItem('sbpPadelAccessToken')||'';
    const key=`${bookingUuid}|${token.slice(-8)}`;
    if(qr.dataset.sbpQrReady==='1'&&activeKey===key)return;
    activeKey=key;
    qr.dataset.sbpQrReady='0';
    qr.textContent='Loading QR…';
    qr.style.font='700 9px Inter,sans-serif';
    qr.style.color='#07110d';
    qr.style.background='#fff';
    qr.style.padding='6px';
    qr.style.overflow='hidden';
    if(!bookingUuid||!token){qr.textContent='QR unavailable';return}
    try{
      const res=await fetch(`${API}/bookings/pass/${encodeURIComponent(bookingUuid)}/qr?_=${Date.now()}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
      const svg=await res.text();
      if(!res.ok)throw new Error(`QR request failed (${res.status}): ${svg.slice(0,120)}`);
      if(!/<svg[\s>]/i.test(svg))throw new Error('QR endpoint did not return SVG');
      qr.innerHTML=svg;
      const el=qr.querySelector('svg');
      if(el){el.setAttribute('width','100%');el.setAttribute('height','100%');el.style.display='block';el.style.background='#fff'}
      qr.dataset.sbpQrReady='1';
    }catch(err){
      console.error('SBP native digital pass QR:',err);
      qr.textContent='QR unavailable';
      qr.dataset.sbpQrReady='0';
    }
  }

  const observe=()=>{
    const root=panel();if(!root)return false;
    new MutationObserver(()=>hydrate()).observe(root,{childList:true,subtree:true});
    hydrate();return true;
  };
  if(!observe()){
    const outer=new MutationObserver(()=>{if(observe())outer.disconnect()});
    outer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();
