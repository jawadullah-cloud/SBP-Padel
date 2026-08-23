(async function(){
  if(!location.pathname.endsWith('payment-success.html')||!window.SBPPadelAPI)return;
  const api=window.SBPPadelAPI.api;
  const money=window.SBPPadelAPI.money;
  const fmtDate=window.SBPPadelAPI.fmtDate;
  const fmtTime=window.SBPPadelAPI.fmtTime;
  const bookingUuid=localStorage.getItem('sbpPadelBookingUuid');
  if(!bookingUuid)return;
  try{
    const d=await api(`/bookings/${bookingUuid}`);
    const venue=await api(`/venues/${d.venue_id}`);
    const court=venue.courts.find(c=>c.id===d.court_id);
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
    set('venue',venue.name);
    set('court',court?.name||'Court');
    set('date',fmtDate(d.date));
    set('time',(d.slots||[]).map(s=>`${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}`).join(', '));
    set('amount',money(d.total));
    set('bookingId',d.booking_code);
    localStorage.setItem('sbpPadelBookingId',d.booking_code);
    const p=JSON.parse(localStorage.getItem('sbpPadelPayment')||'{}');
    localStorage.setItem('sbpPadelPayment',JSON.stringify({...p,venue:venue.name,court:court?.name||p.court,courtType:court?.court_type||p.courtType,date:fmtDate(d.date),slots:(d.slots||[]).map(s=>`${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}`),amount:Number(d.total)}));
  }catch(err){window.SBPPadelAPI.toast(err.message||'Unable to refresh booking confirmation.',true)}
})();