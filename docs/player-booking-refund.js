(function(){
  if(!location.pathname.endsWith('booking-detail.html')||!window.SBPPadelAPI)return;
  const api=window.SBPPadelAPI.api;
  const toast=window.SBPPadelAPI.toast;
  const bookingId=new URLSearchParams(location.search).get('booking')||localStorage.getItem('sbpPadelSelectedBookingId');
  const confirm=document.getElementById('confirmCancel');
  if(!bookingId||!confirm)return;
  confirm.onclick=async()=>{
    confirm.disabled=true;
    confirm.textContent='CANCELLING…';
    try{
      let payment=null;
      try{payment=await api(`/payments/by-booking/${bookingId}`)}catch{}
      const cancelled=await api(`/bookings/${bookingId}/cancel`,{method:'POST',body:JSON.stringify({reason:'Cancelled by player'})});
      if(cancelled.refund_required&&payment?.id){
        await api(`/payments/${payment.id}/refund`,{method:'POST',body:JSON.stringify({reason:'Booking cancelled by player'})});
      }
      localStorage.setItem('sbpPadelCancelled','1');
      location.reload();
    }catch(err){
      toast(err.message||'Unable to cancel booking.',true);
      confirm.disabled=false;
      confirm.textContent='CANCEL & REQUEST REFUND';
    }
  };
})();