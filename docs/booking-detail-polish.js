(()=>{
'use strict';
if(window.__SBPBookingDetailPolish)return;window.__SBPBookingDetailPolish=true;if(!location.pathname.endsWith('booking-detail.html'))return;
const style=document.createElement('style');style.id='sbpBookingDetailPolish';style.textContent=`
#tools:not(.sbpToolsReady){visibility:hidden!important}
#rescheduleModal .rescheduleCourts button.on{background:var(--brand)!important;color:#071006!important;border-color:var(--brand)!important;box-shadow:0 0 0 1px color-mix(in srgb,var(--brand) 42%,transparent)!important}
#rescheduleModal .slotPick{display:grid!important;place-items:center!important;line-height:1!important;text-align:center!important}
#rescheduleModal .slotRow.on .slotPick{display:grid!important;place-items:center!important;padding:0!important;line-height:1!important}
#rescheduleModal .slotRow.on .slotPick:after{display:block;line-height:1!important;transform:none!important;margin:0!important;padding:0!important}
`;
document.head.appendChild(style);
const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,'_');
function scrub(){
 const tools=document.getElementById('tools'),code=document.getElementById('id'),status=document.getElementById('statusPill'),date=document.getElementById('date');
 if(!tools||!code||!status||!date)return;
 const bookingCode=code.textContent.trim();
 if(!bookingCode||bookingCode==='PDL-002381'||bookingCode==='—')return;
 const state=norm(status.textContent),parsed=new Date(date.textContent.trim()),today=new Date();today.setHours(0,0,0,0);
 const past=!Number.isNaN(parsed.getTime())&&parsed<today;
 const active=['confirmed','rescheduled'].includes(state)&&!past,pending=state==='pending_payment'&&!past;
 if(!active){tools.querySelector('#passBtn')?.remove();tools.querySelector('#rescheduleBtn')?.remove()}
 if(!active&&!pending)tools.querySelector('#cancelBtn')?.remove();
 tools.classList.add('sbpToolsReady');
}
const observer=new MutationObserver(scrub);observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
document.addEventListener('DOMContentLoaded',scrub);queueMicrotask(scrub);
})();
