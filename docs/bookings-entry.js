(()=>{
  'use strict';
  // Compatibility stub retained because older cached/prototype HTML may still reference this file.
  // All My Bookings rendering and interactions are owned by player-bookings-live.js.
  window.__SBPBookingsNavigationRetired=true;

  // This file is loaded directly by index.html, so use it as the stable bootstrap for
  // main-screen interaction recovery even before a service worker controls the page.
  if(!window.__SBPMainNavigationHardeningLoader){
    window.__SBPMainNavigationHardeningLoader=true;
    const script=document.createElement('script');
    script.src='main-navigation-hardening.js?v=20260826-nav1';
    script.async=false;
    document.head.appendChild(script);
  }
})();