(()=>{
  'use strict';
  if(window.__SBPPlayerUiFixes)return;window.__SBPPlayerUiFixes=true;

  const style=document.createElement('style');
  style.id='sbpPlayerUiFixesStyle';
  style.textContent=`
    #select .dateRail{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;gap:4px!important;overflow:visible!important}
    #select .dateRail>button{min-width:0!important;width:100%!important}
    #select .dateRail .dateMoreFixed{height:53px;border:1px solid var(--line);border-radius:11px;background:var(--surface);color:var(--text);padding:5px 2px;display:grid;place-items:center;align-content:center;cursor:pointer}
    #select .dateRail .dateMoreFixed small{font-size:7px;color:var(--muted);margin-bottom:3px}
    #select .dateRail .dateMoreFixed b{font-size:14px;color:var(--brand)}
    #select .dateRail .datePickerProxy{position:fixed!important;left:-10000px!important;top:-10000px!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}
    #select .courtList{position:relative!important;z-index:1!important;padding-bottom:0!important}
    #select .bookingBottom{position:relative!important;bottom:auto!important;z-index:2!important;margin-top:12px!important;padding-top:10px!important;background:var(--bg)!important;box-shadow:none!important}
    #select .courtOption{position:relative!important;z-index:1!important;pointer-events:auto!important}
    body[data-theme="light"] #time .slotRow{background:var(--surface)!important;border-color:var(--line)!important}
    body[data-theme="light"] #time .slotRow b{color:#17201d!important}
    body[data-theme="light"] #time .slotRow small{color:var(--brand)!important}
    body[data-theme="light"] #time .slotRow.booked{background:#eef1ef!important;border-color:#d2d8d5!important}
    body[data-theme="light"] #time .slotRow.booked b{color:#5e6964!important}
    body[data-theme="light"] #time .slotRow.booked small{color:#7a8580!important}
    body[data-theme="light"] #time .slotRow.booked .slotBook{color:#7a8580!important}
  `;
  document.head.appendChild(style);

  const todayISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  let observer=null,patching=false;
  function patchDateRail(){
    if(patching)return;
    const rail=document.querySelector('#select .dateRail');if(!rail)return;
    patching=true;observer?.disconnect();
    rail.querySelectorAll('.dateMore,.dateMoreFixed,.datePickerProxy').forEach(x=>x.remove());
    const quick=[...rail.querySelectorAll('button[data-date]')];
    quick.slice(6).forEach(x=>x.remove());
    const more=document.createElement('button');more.type='button';more.className='dateMoreFixed';more.innerHTML='<small>MORE</small><b>＋</b>';more.setAttribute('aria-label','Choose another date');
    const input=document.createElement('input');input.type='date';input.className='datePickerProxy';input.min=todayISO();input.value=localStorage.getItem('sbpPadelBookingDatePicker')||todayISO();
    more.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();try{if(typeof input.showPicker==='function')input.showPicker();else input.click()}catch{input.click()}});
    input.addEventListener('change',()=>{
      const iso=input.value;if(!iso||iso<todayISO())return;
      localStorage.setItem('sbpPadelBookingDatePicker',iso);
      more.dataset.date=iso;
      more.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
      delete more.dataset.date;
    });
    rail.append(more,input);
    observer?.observe(rail,{childList:true});patching=false;
  }
  function watchDates(){const rail=document.querySelector('#select .dateRail');if(!rail)return;observer=new MutationObserver(()=>queueMicrotask(patchDateRail));observer.observe(rail,{childList:true});patchDateRail()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(watchDates,150),{once:true});else setTimeout(watchDates,150);
  window.addEventListener('pageshow',()=>setTimeout(patchDateRail,80));
})();