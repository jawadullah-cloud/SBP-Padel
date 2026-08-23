const BUILD='20260824-live3';
const BASE_INJECT=`<script src="native-transitions.js?v=${BUILD}"></script><script src="saved-players-bridge.js?v=${BUILD}"></script>`;
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
      if(!html.includes('native-transitions.js'))html=html.replace('</body>',inject+'</body>');
      else if(inject.includes('player-live.js'))html=html.replace('</body>',`<script src="player-live.js?v=${BUILD}"></script></body>`);
      const headers=new Headers(res.headers);headers.delete('content-length');headers.set('x-sbp-build',BUILD);
      return new Response(html,{status:res.status,statusText:res.statusText,headers});
    }catch(err){return fetch(req)}
  })());
});