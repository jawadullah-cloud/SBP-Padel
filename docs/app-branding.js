(()=>{
  'use strict';
  if(window.__SBPAppBranding)return;window.__SBPAppBranding=true;
  const logo='/assets/sbp-padel-logo.jpg?v=20260825-brand2';
  const style=document.createElement('style');
  style.textContent=`
    .sbpAppLogo{width:28px;height:28px;border-radius:8px;object-fit:cover;display:block;border:1px solid color-mix(in srgb,var(--brand) 55%,transparent);box-shadow:0 0 0 1px #0002}
    .splashBrand .logo,.authTop .logo{background:transparent!important;padding:0!important;object-fit:cover!important}
    .directionsLink{-webkit-appearance:none!important;appearance:none!important;height:34px!important;min-width:92px!important;padding:0 11px!important;border:1px solid var(--line)!important;border-radius:9px!important;outline:0!important;box-shadow:none!important;background:var(--surface2)!important;color:var(--brand)!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;white-space:nowrap!important;font:800 8px var(--ui)!important;letter-spacing:.02em!important;cursor:pointer!important}
    .directionsLink:focus,.directionsLink:active{outline:0!important;box-shadow:none!important;border:1px solid var(--line)!important;background:var(--surface2)!important}
  `;
  document.head.appendChild(style);
  function apply(){
    document.querySelectorAll('header .brand .brandball').forEach(el=>{
      if(el.tagName==='IMG'){el.src=logo;el.classList.add('sbpAppLogo');return}
      const img=document.createElement('img');img.src=logo;img.alt='SBP Padel';img.className='brandball sbpAppLogo';el.replaceWith(img);
    });
    document.querySelectorAll('.splashBrand img.logo,.authTop img.logo').forEach(img=>{img.src=logo;img.style.background='transparent';img.style.padding='0';img.style.objectFit='cover'});
  }
  apply();
  document.addEventListener('DOMContentLoaded',apply,{once:true});
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();
