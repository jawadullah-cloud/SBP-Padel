(()=>{
'use strict';
if(window.__SBPBookingDetailPolish)return;window.__SBPBookingDetailPolish=true;if(!location.pathname.endsWith('booking-detail.html'))return;
const style=document.createElement('style');style.id='sbpBookingDetailPolish';style.textContent=`
#rescheduleModal .rescheduleCourts button.on{background:var(--brand)!important;color:#071006!important;border-color:var(--brand)!important;box-shadow:0 0 0 1px color-mix(in srgb,var(--brand) 42%,transparent)!important}
#rescheduleModal .slotPick{display:grid!important;place-items:center!important;line-height:1!important;text-align:center!important}
#rescheduleModal .slotRow.on .slotPick{display:grid!important;place-items:center!important;padding:0!important;line-height:1!important}
#rescheduleModal .slotRow.on .slotPick:after{display:block;line-height:1!important;transform:none!important;margin:0!important;padding:0!important}
`;
document.head.appendChild(style);
})();
