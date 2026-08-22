(()=>{if(window.__sbpSlotPricing)return;window.__sbpSlotPricing=true;
const rates={
'5:00 PM – 6:00 PM':1800,
'6:00 PM – 7:00 PM':2000,
'7:00 PM – 8:00 PM':2200,
'8:00 PM – 9:00 PM':2200,
'9:00 PM – 10:00 PM':2000,
'10:00 PM – 11:00 PM':1800
};
const fmt=n=>`PKR ${Number(n||0).toLocaleString()}`;
const css=document.createElement('style');css.textContent=`
#time .slotRow>div{min-width:0;flex:1}#time .slotRow .slotRate{display:block!important;margin-top:4px!important;color:var(--text)!important;font-family:var(--sport)!important;font-size:9px!important;font-weight:800!important;letter-spacing:.015em!important}#time .slotRow.chosen .slotRate{color:var(--brand)!important}#time .slotRow.booked .slotRate{color:var(--muted)!important}.durationBox.priced{grid-template-columns:1fr auto!important;align-items:center}.durationPrice{text-align:right}.durationPrice small,.durationPrice b{display:block}.durationPrice small{font-size:7px;color:var(--muted);font-weight:700;letter-spacing:.08em}.durationPrice b{margin-top:3px;color:var(--brand);font-family:var(--sport);font-size:15px;font-weight:900}
`;document.head.appendChild(css);
function rows(){return [...document.querySelectorAll('#time .slotRow')]}
function slotText(row){return row.querySelector('b')?.textContent?.trim()||''}
function decorate(){rows().forEach(row=>{const txt=slotText(row),price=rates[txt]??2000;row.dataset.price=String(price);const info=row.querySelector('div');if(info&&!info.querySelector('.slotRate')){const rate=document.createElement('span');rate.className='slotRate';rate.textContent=`${fmt(price)} / hour`;info.appendChild(rate)}});const box=document.querySelector('#time .durationBox');if(box&&!box.querySelector('.durationPrice')){box.classList.add('priced');const p=document.createElement('div');p.className='durationPrice';p.innerHTML='<small>COURT TOTAL</small><b id="slotPriceTotal">PKR 0</b>';box.appendChild(p)};refresh()}
function refresh(){const chosen=rows().filter(r=>r.classList.contains('chosen'));const total=chosen.reduce((s,r)=>s+Number(r.dataset.price||0),0);const el=document.getElementById('slotPriceTotal');if(el)el.textContent=fmt(total);const detail=chosen.map(r=>({slot:slotText(r),price:Number(r.dataset.price||0)}));localStorage.setItem('sbpPadelSlotPricing',JSON.stringify({slots:detail,total,currency:'PKR'}))}
document.addEventListener('click',e=>{if(e.target.closest('#time .slotRow:not(.booked)'))setTimeout(refresh,0)},true);
const obs=new MutationObserver(()=>{if(document.querySelector('#time .slotRow'))decorate()});obs.observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate);else decorate();
})();