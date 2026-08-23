(()=>{
  'use strict';
  if(window.__SBPBookingDateMore)return;
  window.__SBPBookingDateMore=true;

  const style=document.createElement('style');
  style.id='sbpBookingDateMoreStyle';
  style.textContent=`
    #select .dateRail>.dateMore{display:none!important}
    #select .dateRail>.dateMoreButton{min-width:0!important;width:100%!important;height:53px!important;border:1px solid var(--line);border-radius:11px;background:var(--surface);color:var(--text);padding:5px 2px;display:grid!important;place-items:center;align-content:center;cursor:pointer;position:relative;z-index:2}
    #select .dateRail>.dateMoreButton small{font-size:7px;color:var(--muted);margin-bottom:3px}#select .dateRail>.dateMoreButton b{font-size:14px;color:var(--brand)}
    #sbpDateSheet{position:absolute;inset:0;z-index:500;background:#0008;display:flex;align-items:flex-end;padding:12px;backdrop-filter:blur(3px)}
    #sbpDateSheet .sheet{width:100%;background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:16px;box-shadow:0 -16px 40px #0006}
    #sbpDateSheet h3{margin:0 0 4px;font-size:16px}#sbpDateSheet p{margin:0 0 14px;color:var(--muted);font-size:9px;line-height:1.45}
    #sbpDateSheet input[type=date]{width:100%;height:48px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--text);padding:0 12px;font:700 12px var(--ui);color-scheme:dark}
    body[data-theme=light] #sbpDateSheet input[type=date]{color-scheme:light}
    #sbpDateSheet .actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}#sbpDateSheet .actions button{height:44px;border-radius:12px;font:800 10px var(--sport)}
    #sbpDateSheet .cancel{border:1px solid var(--line);background:var(--surface2);color:var(--text)}#sbpDateSheet .apply{border:0;background:var(--brand);color:#071006}
  `;
  document.head.appendChild(style);

  const SESSION='sbpPadelBookingSessionV2';
  const todayISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  function sessionDate(){try{const value=JSON.parse(localStorage.getItem(SESSION)||'{}')?.date;return value&&value>=todayISO()?value:todayISO()}catch{return todayISO()}}
  function currentDate(){return document.querySelector('#select .dateRail button[data-date].selected')?.dataset.date||sessionDate()}
  function closeSheet(){document.getElementById('sbpDateSheet')?.remove()}
  function choose(iso){
    if(!iso||iso<todayISO())return;
    const rail=document.querySelector('#select .dateRail');if(!rail)return;
    const proxy=document.createElement('button');proxy.type='button';proxy.dataset.date=iso;proxy.hidden=true;rail.appendChild(proxy);proxy.click();
  }
  function openSheet(){
    closeSheet();
    const host=document.querySelector('.phone')||document.body;
    if(host!==document.body&&getComputedStyle(host).position==='static')host.style.position='relative';
    const sheet=document.createElement('div');sheet.id='sbpDateSheet';sheet.innerHTML=`<div class="sheet"><h3>Choose another date</h3><p>Select any future booking date, then tap Apply.</p><input type="date" min="${todayISO()}" value="${currentDate()}"><div class="actions"><button type="button" class="cancel">CANCEL</button><button type="button" class="apply">APPLY</button></div></div>`;host.appendChild(sheet);
    const input=sheet.querySelector('input');sheet.querySelector('.cancel').onclick=closeSheet;sheet.querySelector('.apply').onclick=()=>{const iso=input.value;closeSheet();choose(iso)};sheet.addEventListener('click',e=>{if(e.target===sheet)closeSheet()});setTimeout(()=>input.focus(),0)
  }
  function install(){
    const rail=document.querySelector('#select .dateRail');if(!rail||rail.querySelector('.dateMoreButton'))return;
    const more=document.createElement('button');more.type='button';more.className='dateMoreButton';more.innerHTML='<small>MORE</small><b>＋</b>';more.setAttribute('aria-label','Choose another date');more.onclick=e=>{e.preventDefault();e.stopPropagation();openSheet()};rail.appendChild(more)
  }
  localStorage.removeItem('sbpPadelBookingDatePicker');
  const rail=document.querySelector('#select .dateRail');if(!rail)return;
  const observer=new MutationObserver(install);observer.observe(rail,{childList:true});install();
})();