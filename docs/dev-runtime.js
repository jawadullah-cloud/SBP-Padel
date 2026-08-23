(()=>{
  'use strict';
  if(window.__SBPDevRuntime)return;
  window.__SBPDevRuntime=true;

  const localHosts=new Set(['localhost','127.0.0.1','0.0.0.0']);
  const isLocal=localHosts.has(location.hostname);
  window.SBP_LOCAL_DEV=isLocal;

  async function purgeLegacyBrowserState(){
    if(!isLocal)return;
    let hadController=Boolean(navigator.serviceWorker?.controller);
    try{
      if('serviceWorker'in navigator){
        const regs=await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r=>r.unregister()));
      }
    }catch(err){console.warn('SBP dev: service-worker cleanup failed',err)}
    try{
      if('caches'in window){
        const keys=await caches.keys();
        await Promise.all(keys.map(k=>caches.delete(k)));
      }
    }catch(err){console.warn('SBP dev: cache cleanup failed',err)}

    // A page already controlled by an old worker needs one clean reload after unregistering.
    const reloadKey='sbpPadelDevWorkerPurged';
    if(hadController&&!sessionStorage.getItem(reloadKey)){
      sessionStorage.setItem(reloadKey,'1');
      location.reload();
      return;
    }
    sessionStorage.removeItem(reloadKey);
  }

  purgeLegacyBrowserState();
})();
