(()=>{
  'use strict';
  if(window.__SBPContiguousSlots)return;window.__SBPContiguousSlots=true;
  const KEY='sbpPadelBookingSessionV2';
  const minutes=t=>{const[h,m]=String(t||'0:0').split(':').map(Number);return h*60+(m||0)};
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}}
  function toast(message){let el=document.getElementById('sbpContiguousToast');if(!el){el=document.createElement('div');el.id='sbpContiguousToast';Object.assign(el.style,{position:'fixed',left:'50%',bottom:'82px',transform:'translateX(-50%)',zIndex:'2147483000',maxWidth:'330px',padding:'10px 13px',borderRadius:'12px',background:'#3a1717',color:'#ffb6b6',border:'1px solid #783838',font:'700 10px Inter,sans-serif',boxShadow:'0 14px 40px #0008',pointerEvents:'none'});document.body.appendChild(el)}el.textContent=message;el.style.opacity='1';clearTimeout(el._t);el._t=setTimeout(()=>el.style.opacity='0',2600)}
  function invalidToggle(start){
    const s=load(),selected=[...(s.slotStarts||[])].sort((a,b)=>minutes(a)-minutes(b));
    if(!selected.length)return false;
    const idx=selected.indexOf(start);
    if(idx>=0){
      if(selected.length<=2||idx===0||idx===selected.length-1)return false;
      toast('Keep the booking as one continuous session. Remove an end slot first.');return true;
    }
    const value=minutes(start),first=minutes(selected[0]),last=minutes(selected[selected.length-1]);
    if(value===first-60||value===last+60)return false;
    toast('Multiple slots must be consecutive. Choose the slot immediately before or after your current session.');return true;
  }
  window.addEventListener('click',e=>{
    const row=e.target.closest?.('#time .slotRow:not(.booked)');if(!row)return;
    const start=row.dataset.start;if(!start||!invalidToggle(start))return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  },true);
  function normalize(){const s=load(),selected=[...(s.slotStarts||[])].sort((a,b)=>minutes(a)-minutes(b));if(selected.length<2)return;let keep=[selected[0]];for(let i=1;i<selected.length;i++){if(minutes(selected[i])-minutes(keep[keep.length-1])!==60)break;keep.push(selected[i])}if(keep.length===selected.length)return;s.slotStarts=keep;s.quote=null;s.policyAccepted=false;s.bookingUuid=null;s.bookingCode=null;s.paymentUuid=null;s.paymentStatus=null;s.status='selecting';s.updatedAt=Date.now();localStorage.setItem(KEY,JSON.stringify(s));setTimeout(()=>window.SBPBookingFlowSync?.(),0)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',normalize,{once:true});else normalize();
})();