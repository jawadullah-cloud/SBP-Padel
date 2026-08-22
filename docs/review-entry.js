(function(){
  function openReview(){
    const chosen=[...document.querySelectorAll('#time .slotRow.chosen')];
    const slots=chosen.map(r=>r.querySelector('b')?.textContent?.trim()).filter(Boolean);
    const court=document.querySelector('#select .courtOption.selected h4')?.textContent?.trim()||'Court 01';
    const courtType=document.querySelector('#select .courtOption.selected p')?.textContent?.trim()||'Championship Court';
    const data={venue:'Nishtar Park Sports Complex',date:'Saturday, 22 Aug 2026',court,courtType,slots:slots.length?slots:['7:00 PM – 8:00 PM']};
    localStorage.setItem('sbpPadelReview',JSON.stringify(data));
    if(window.SBPDeepRoute)window.SBPDeepRoute('review-booking.html?v=20260823-review2');
    else window.location.assign('review-booking.html?v=20260823-review2');
  }
  function wire(){
    const btn=document.querySelector('#time .bookingBottom .primary, #time button.primary.full[data-nav="confirm"]');
    if(!btn)return false;
    btn.removeAttribute('data-nav');
    btn.onclick=function(e){e.preventDefault();e.stopPropagation();openReview()};
    return true;
  }
  function hydratePass(){
    const p=JSON.parse(localStorage.getItem('sbpPadelPayment')||'{}');
    const id=localStorage.getItem('sbpPadelBookingId')||'PDL-002381';
    const pass=document.querySelector('#pass .passBody');
    if(!pass)return;
    const venue=pass.querySelector(':scope > small');
    const court=pass.querySelector('h1');
    const grid=pass.querySelector('.passGrid');
    const booking=pass.querySelector('h3');
    if(venue&&p.venue)venue.textContent=p.venue.toUpperCase();
    if(court&&p.court)court.textContent=p.court.toUpperCase();
    if(grid){
      const cells=grid.querySelectorAll('div');
      if(cells[0]&&p.date)cells[0].querySelector('b').textContent=p.date.replace(',','').toUpperCase();
      if(cells[1]&&Array.isArray(p.slots)&&p.slots.length)cells[1].querySelector('b').textContent=p.slots.join(', ');
    }
    if(booking)booking.textContent=id;
  }
  function openRequestedScreen(){
    const wanted=new URLSearchParams(location.search).get('open');
    if(wanted!=='pass')return;
    hydratePass();
    setTimeout(()=>{
      const target=document.querySelector('[data-nav="pass"]');
      if(target)target.click();
    },30);
  }
  if(!wire()){
    const obs=new MutationObserver(()=>{if(wire())obs.disconnect()});
    obs.observe(document.body,{childList:true,subtree:true});
  }
  hydratePass();
  openRequestedScreen();
})();
