const BUILD='20260823-polish1';
const INJECT_TAG=`<script src="native-transitions.js?v=${BUILD}"></script><script src="saved-players-bridge.js?v=${BUILD}"></script>`;
self.addEventListener('install',event=>{self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.mode!=='navigate'||new URL(req.url).origin!==location.origin)return;
  event.respondWith((async()=>{
    try{
      const res=await fetch(req,{cache:'no-store'});
      const type=res.headers.get('content-type')||'';
      if(!type.includes('text/html'))return res;
      let html=await res.text();
      if(!html.includes('native-transitions.js'))html=html.replace('</body>',INJECT_TAG+'</body>');
      const headers=new Headers(res.headers);headers.delete('content-length');headers.set('x-sbp-build',BUILD);
      return new Response(html,{status:res.status,statusText:res.statusText,headers});
    }catch(err){return fetch(req)}
  })());
});