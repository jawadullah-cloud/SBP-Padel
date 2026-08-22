(function(){
  if(window.SBPDeepRoute)return;
  const host=document.querySelector('.phone');
  if(!host)return;
  const layer=document.createElement('div');
  layer.id='sbpDeepLayer';
  layer.innerHTML='<iframe id="sbpDeepFrame" title="SBP Padel screen" allow="clipboard-write"></iframe>';
  const style=document.createElement('style');
  style.textContent=`
    #sbpDeepLayer{position:absolute;inset:0;z-index:120;background:var(--bg,#061012);opacity:0;transform:translateX(18px);pointer-events:none;transition:opacity .28s ease,transform .34s cubic-bezier(.2,.8,.2,1);overflow:hidden;border-radius:inherit}
    #sbpDeepLayer.on{opacity:1;transform:none;pointer-events:auto}
    #sbpDeepLayer.leaving{opacity:0;transform:translateX(18px)}
    #sbpDeepFrame{width:100%;height:100%;border:0;background:#061012;display:block;opacity:1;transform:none;transition:opacity .18s ease,transform .24s cubic-bezier(.2,.8,.2,1)}
    #sbpDeepLayer.swapping #sbpDeepFrame{opacity:.18;transform:translateX(10px)}
    #sbpDeepLayer.backing #sbpDeepFrame{opacity:.18;transform:translateX(-10px)}
  `;
  document.head.appendChild(style);
  host.style.position='relative';
  host.appendChild(layer);
  const frame=layer.querySelector('iframe');
  let stack=[];
  let current='';
  const localPages=new Set(['review-booking.html','payment.html','payment-success.html','digital-pass.html','booking-detail.html','booking-history-detail.html','wallet.html','payment-history.html']);

  function clean(url){try{const u=new URL(url,location.href);return u.pathname.split('/').pop()+u.search}catch{return url}}
  function isIndex(url){const c=clean(url);return c==='index.html'||c.startsWith('index.html?')||c===''||c.startsWith('?')}
  function openMain(url){
    let target='home';
    try{const u=new URL(url,location.href);target=u.searchParams.get('open')||'home'}catch{}
    close(false);
    setTimeout(()=>{
      const button=document.querySelector(`[data-nav="${CSS.escape(target)}"]`);
      if(button)button.click();
      else if(target==='home')document.querySelector('[data-nav="home"]')?.click();
    },120);
  }
  function route(url,push=true,back=false){
    if(!url)return;
    if(/^https?:/i.test(url)){
      const u=new URL(url,location.href);
      if(u.origin!==location.origin){location.href=url;return}
    }
    if(isIndex(url)){openMain(url);return}
    const c=clean(url); const page=c.split('?')[0];
    if(!localPages.has(page)){location.href=url;return}
    if(push){if(!stack.length&&current)stack.push(current);stack.push(c)}
    current=c;
    layer.classList.remove('backing');
    layer.classList.add(back?'backing':'swapping');
    layer.classList.add('on');
    requestAnimationFrame(()=>{frame.src=c});
  }
  function back(){
    if(stack.length>1){stack.pop();const prev=stack[stack.length-1];route(prev,false,true);return}
    close(true);
  }
  function close(toBookings=true){
    layer.classList.add('leaving');
    layer.classList.remove('on');
    setTimeout(()=>{layer.classList.remove('leaving','swapping','backing');frame.src='about:blank';stack=[];current='';if(toBookings)document.querySelector('[data-nav="bookings"]')?.click()},280);
  }
  function targetFromElement(el,doc){
    if(!el)return null;
    const href=el.getAttribute?.('href');
    if(href&&href!=='#'&&!href.startsWith('javascript:'))return href;
    const oc=el.getAttribute?.('onclick')||'';
    const m=oc.match(/(?:location\.href|location\.assign\(|window\.location(?:\.href)?\s*=)\s*['"]([^'"]+)/);
    if(m)return m[1];
    if(/history\.back\s*\(/.test(oc))return '__BACK__';
    const id=el.id;
    if(id==='toPayment')return 'payment.html';
    if(id==='payButton')return 'payment-success.html';
    if(id==='viewPass')return 'digital-pass.html';
    if(id==='backHome')return 'index.html';
    const dOpen=el.closest?.('[data-open]');if(dOpen)return 'booking-detail.html';
    const hist=el.closest?.('[data-history]');if(hist)return `booking-history-detail.html?type=${hist.hasAttribute('data-cancelled')?'cancelled':'past'}&id=${hist.dataset.history}`;
    if(el.matches?.('.back')&&doc!==document)return '__BACK__';
    return null;
  }
  function intercept(doc,e){
    const el=e.target.closest?.('a,button,[onclick],[data-open],[data-history]');
    if(!el)return;
    if(el.tagName==='A'&&(el.target==='_blank'||el.hasAttribute('download')))return;
    const target=targetFromElement(el,doc);
    if(!target)return;
    if(target==='__BACK__'){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();back();return;
    }
    const c=clean(target),page=c.split('?')[0];
    if(isIndex(target)||localPages.has(page)){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      route(target,true,false);
    }
  }
  frame.addEventListener('load',()=>{
    layer.classList.remove('swapping','backing');
    try{
      const doc=frame.contentDocument;if(!doc||frame.src==='about:blank')return;
      const s=doc.createElement('style');
      s.textContent=`html,body{width:100%!important;height:100%!important;min-height:0!important;margin:0!important;overflow:hidden!important;background:#061012!important}body{display:block!important}.phone{width:100%!important;height:100%!important;min-height:0!important;max-width:none!important;max-height:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;margin:0!important}.screen{scrollbar-width:none!important}.screen::-webkit-scrollbar{display:none!important}`;
      doc.head.appendChild(s);
      doc.addEventListener('click',e=>intercept(doc,e),true);
    }catch(err){console.warn('SBP deep route frame hook',err)}
  });
  document.addEventListener('click',e=>{
    const el=e.target.closest?.('a,button,[onclick],[data-open],[data-history]');if(!el)return;
    let target=targetFromElement(el,document);
    if(!target){
      const label=el.querySelector?.('span')?.textContent?.trim();
      if(label==='My Wallet')target='wallet.html';
      if(label==='Payment History')target='payment-history.html';
    }
    if(!target)return;
    if(target==='__BACK__')return;
    const c=clean(target),page=c.split('?')[0];
    if(localPages.has(page)){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();route(target,true,false);
    }
  },true);
  window.SBPDeepRoute=route;
  window.SBPDeepBack=back;
  window.SBPDeepClose=close;
})();