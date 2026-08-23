const BUILD='20260824-flow-v2';
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
      const scripts=[];
      const add=name=>{if(!html.includes(name)&&!scripts.includes(name))scripts.push(name)};

      // Navigation helpers remain presentation-only. Booking state/business flow is owned solely by review-entry.js.
      add('native-transitions.js');
      add('navigation-fix.js');
      add('review-entry.js');

      const page=url.pathname.split('/').pop()||'index.html';
      if(page==='auth-preview.html')add('player-live.js');
      if(page==='booking-detail.html'){
        add('player-live.js');
        add('player-booking-refund.js');
      }
      if(page==='index.html'||page===''){
        // index.html already loads player-live.js directly; do not add another copy.
      }

      if(scripts.length){
        const inject=scripts.map(name=>`<script src="${name}?v=${BUILD}"></script>`).join('');
        html=html.replace('</body>',inject+'</body>');
      }
      const headers=new Headers(res.headers);headers.delete('content-length');headers.set('x-sbp-build',BUILD);
      return new Response(html,{status:res.status,statusText:res.statusText,headers});
    }catch(err){return fetch(req)}
  })());
});
