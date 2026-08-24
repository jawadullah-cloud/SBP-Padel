(()=>{
  'use strict';
  if(window.__SBPAppBranding)return;window.__SBPAppBranding=true;
  const logo='/assets/sbp-padel-logo.jpg';
  const style=document.createElement('style');
  style.textContent=`
    .sbpAppLogo{width:30px;height:30px;border-radius:9px;object-fit:cover;display:block;border:1px solid color-mix(in srgb,var(--brand) 55%,transparent);box-shadow:none}
    .directionsLink{-webkit-appearance:none!important;appearance:none!important;border:1px solid var(--line)!important;outline:0!important;box-shadow:none!important;background:var(--surface2)!important;color:var(--brand)!important;border-radius:10px!important;padding:7px 10px!important;margin:0!important;font:800 8px var(--sport)!important;letter-spacing:.04em!important;line-height:1!important;white-space:nowrap!important;cursor:pointer}
    .directionsLink:focus,.directionsLink:active{outline:0!important;box-shadow:none!important;border-color:var(--brand)!important}
  `;
  document.head.appendChild(style);
  function setImage(img){if(!img)return;img.src=logo;img.alt='SBP Padel';img.style.background='transparent';img.style.padding='0';img.style.objectFit='cover'}
  function apply(){
    document.querySelectorAll('header .brand .brandball').forEach(el=>{
      if(el.tagName==='IMG'){setImage(el);el.classList.add('sbpAppLogo');return}
      const img=document.createElement('img');img.className='brandball sbpAppLogo';setImage(img);el.replaceWith(img);
    });
    document.querySelectorAll('.splashBrand img.logo,.authTop img.logo').forEach(setImage);
  }
  apply();
  document.addEventListener('DOMContentLoaded',apply,{once:true});
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();
