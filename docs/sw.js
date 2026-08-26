const BUILD='20260826-production-runtime-v2';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});

const COMMON_SCRIPTS=[
  'auth-session-splash-guard.js',
  'runtime-api.js',
  'venue-cover-runtime.js',
  'booking-participants-live.js',
  'theme-bridge.js',
  'native-transitions.js',
  'navigation-fix.js',
  'deep-route-smooth.js',
  'review-entry.js',
  'booking-contiguous-slots.js',
  'review-native.js',
  'saved-players-sync.js',
  'pass-route-live.js',
  'android-back.js',
  'back-icons.js',
  'app-branding.js',
];

const PAGE_SCRIPTS={
  'index.html':['player-venues-live.js','player-discovery-live.js','favourites-migration.js','player-profile-live.js','profile-modules.js','notifications-live.js','booking-date-more.js','player-bookings-live.js','discovery-tools.js','bookings-search.js','visual-live.js','player-stability.js','native-pass-qr-live.js'],
  'review-booking.html':['review-players-live.js'],
  'payment.html':['payment-methods-live.js'],
  'payment-success.html':['booking-success-live.js'],
  'payment-history.html':['player-payment-history-live.js'],
  'wallet.html':['player-wallet-live.js'],
  'digital-pass.html':['digital-pass-live.js'],
  'auth-preview.html':['player-live.js','auth-enhancements.js','google-auth-disabled.js'],
  'booking-detail.html':['booking-detail-polish.js','player-booking-detail-live.js','player-booking-integrity.js'],
};

function scrubPrototypeFallback(page,html){
  if(page==='review-booking.html'){
    html=html.replaceAll('Adeel Raza','Player').replaceAll('>AR<','>P<');
    html=html.replace('Prototype pricing','Loading live quote');
    html=html.replace('Prototype policy only. Final operational, cancellation and refund rules will be approved by Sports Board Punjab before launch.','Loading the current Sports Board Punjab booking policy…');
    html=html.replace('Cancellation is intended to be allowed without charge up to 6 hours before the session.','Loading the current cancellation window…');
  }
  if(page==='payment-success.html'||page==='digital-pass.html'){
    html=html.replaceAll('PDL-002381','—').replaceAll('Saturday, 22 Aug 2026','Loading…').replaceAll('7:00 PM – 8:00 PM','Loading…').replaceAll('Nishtar Park Sports Complex','Loading booking…').replaceAll('Court 01','Loading…');
  }
  return html;
}

function versionLocalAssets(html){
  return html.replace(
    /((?:src|href)=["'])(?!https?:|\/\/|data:|#)([^"'?#]+\.(?:js|css))(?:\?[^"']*)?(["'])/gi,
    (_match,prefix,path,quote)=>`${prefix}${path}?v=${BUILD}${quote}`,
  );
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  const url=new URL(req.url);
  if(req.mode!=='navigate'||url.origin!==location.origin)return;
  event.respondWith((async()=>{
    try{
      const res=await fetch(req,{cache:'no-store'});
      const type=res.headers.get('content-type')||'';
      if(!type.includes('text/html'))return res;
      const page=url.pathname.split('/').pop()||'index.html';
      let html=versionLocalAssets(scrubPrototypeFallback(page,await res.text()));
      const scripts=[];
      const add=name=>{if(!html.includes(name)&&!scripts.includes(name))scripts.push(name)};
      for(const name of COMMON_SCRIPTS)add(name);
      for(const name of PAGE_SCRIPTS[page]||[])add(name);
      if(['index.html','review-booking.html','payment.html','payment-success.html'].includes(page))add('booking-router-bridge.js');
      if(scripts.length){
        const inject=scripts.map(name=>`<script src="${name}?v=${BUILD}"></script>`).join('');
        html=html.replace('</body>',inject+'</body>');
      }
      const headers=new Headers(res.headers);
      headers.delete('content-length');
      headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
      headers.set('x-sbp-build',BUILD);
      return new Response(html,{status:res.status,statusText:res.statusText,headers});
    }catch(err){
      return fetch(req,{cache:'no-store'});
    }
  })());
});
