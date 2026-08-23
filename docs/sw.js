const BUILD='20260824-nav1';
const BASE_INJECT=`<script src="native-transitions.js?v=${BUILD}"></script><script src="saved-players-bridge.js?v=${BUILD}"></script><script src="navigation-fix.js?v=${BUILD}"></script>`;
self.addEventListener('install',event=>{self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
self.addEventListener('fetch',event=>{
  const req=event.request;
  const url=new URL(req.url);
  if(req.mode!=='navigate'||url.origin!==location.origin)return;
  event.respondWith((async()=>{
    try{
      const res=await fetch(req,{cache:'no-store'});
      const type=res.headers.get('content-type')||'';
      if(!type.includes('text/html'))return res;
      let html=await res.text();
      let inject=BASE_INJECT;
      if(!html.includes('player-live.js'))inject+=`<script src="player-live.js?v=${BUILD}"></script>`;
      if(url.pathname.endsWith('/booking-detail.html'))inject+=`<script src="player-booking-refund.js?v=${BUILD}"></script>`;
      if(url.pathname.endsWith('/payment-success.html'))inject+=`<script src="player-success.js?v=${BUILD}"></script>`;
      if(!html.includes('native-transitions.js'))html=html.replace('</body>',inject+'</body>');
      else {
        let extras=inject.replace(`<script src="native-transitions.js?v=${BUILD}"></script>`,'').replace(`<script src="saved-players-bridge.js?v=${BUILD}"></script>`,'');
        if(html.includes('navigation-fix.js'))extras=extras.replace(`<script src="navigation-fix.js?v=${BUILD}"></script>`,'');
        if(extras)html=html.replace('</body>',extras+'</body>');
      }
      const headers=new Headers(res.headers);headers.delete('content-length');headers.set('x-sbp-build',BUILD);
      return new Response(html,{status:res.status,statusText:res.statusText,headers});
    }catch(err){return fetch(req)}
  })());
});