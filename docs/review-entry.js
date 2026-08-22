document.addEventListener('click',function(e){
  const btn=e.target.closest('#time .bookingBottom .primary');
  if(!btn)return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  const chosen=[...document.querySelectorAll('#time .slotRow.chosen')];
  const slots=chosen.map(r=>r.querySelector('b')?.textContent?.trim()).filter(Boolean);
  const court=document.querySelector('#select .courtOption.selected h4')?.textContent?.trim()||'Court 01';
  const courtType=document.querySelector('#select .courtOption.selected p')?.textContent?.trim()||'Championship Court';
  const data={venue:'Nishtar Park Sports Complex',date:'Saturday, 22 Aug 2026',court,courtType,slots:slots.length?slots:['7:00 PM – 8:00 PM']};
  localStorage.setItem('sbpPadelReview',JSON.stringify(data));
  location.href='review-booking.html';
},true);
