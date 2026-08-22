(function(){
  function openReview(){
    const chosen=[...document.querySelectorAll('#time .slotRow.chosen')];
    const slots=chosen.map(r=>r.querySelector('b')?.textContent?.trim()).filter(Boolean);
    const court=document.querySelector('#select .courtOption.selected h4')?.textContent?.trim()||'Court 01';
    const courtType=document.querySelector('#select .courtOption.selected p')?.textContent?.trim()||'Championship Court';
    const data={venue:'Nishtar Park Sports Complex',date:'Saturday, 22 Aug 2026',court,courtType,slots:slots.length?slots:['7:00 PM – 8:00 PM']};
    localStorage.setItem('sbpPadelReview',JSON.stringify(data));
    window.location.assign('review-booking.html?v=20260823-review2');
  }
  function wire(){
    const btn=document.querySelector('#time .bookingBottom .primary, #time button.primary.full[data-nav="confirm"]');
    if(!btn)return false;
    btn.removeAttribute('data-nav');
    btn.onclick=function(e){e.preventDefault();e.stopPropagation();openReview()};
    return true;
  }
  if(!wire()){
    const obs=new MutationObserver(()=>{if(wire())obs.disconnect()});
    obs.observe(document.body,{childList:true,subtree:true});
  }
})();
