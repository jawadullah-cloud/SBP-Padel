(()=>{
  'use strict';
  if(window.__SBPAppBranding)return;window.__SBPAppBranding=true;
  const logo='assets/sbp-padel-logo.jpg';
  const style=document.createElement('style');
  style.textContent=`
    .sbpAppLogo{width:28px;height:28px;border-radius:8px;object-fit:cover;display:block;border:1px solid color-mix(in srgb,var(--brand) 55%,transparent);box-shadow:0 0 0 1px #0002}
    .directionsLink{-webkit-appearance:none!important;appearance:none!important;border:0!important;outline:0!important;box-shadow:none!important;background:transparent!important;margin:0!important;font:inherit;color:var(--brand);cursor:pointer}
    .directionsLink:focus,.directionsLink:active{outline:0!important;box-shadow:none!important;border:0!important}
  `;
  document.head.appendChild(style);
  function apply(){
    document.querySelectorAll('header .brand .brandball').forEach(el=>{
      if(el.tagName==='IMG')return;
      const img=document.createElement('img');img.src=logo;img.alt='SBP Padel';img.className='brandball sbpAppLogo';el.replaceWith(img);
    });
    document.querySelectorAll('.splashBrand img.logo,.authTop img.logo').forEach(img=>{img.src=logo;img.style.background='transparent';img.style.padding='0';img.style.objectFit='cover'});
  }
  apply();
  document.addEventListener('DOMContentLoaded',apply,{once:true});
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();
