import { chromium } from 'playwright';

const base=process.env.SBP_PLAYER_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:412,height:650}});
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url());
  let body={};
  if(url.pathname.endsWith('/auth/me'))body={id:'locked-user',full_name:'Locked Flow QA'};
  else if(url.pathname.endsWith('/bookings/me'))body=[];
  else if(url.pathname.endsWith('/notifications/me')||url.pathname.endsWith('/venues'))body=[];
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
});
await page.addInitScript(()=>{
  localStorage.setItem('sbpPadelAccessToken','locked-flow-token');
  localStorage.setItem('sbpPadelUser',JSON.stringify({id:'locked-user',full_name:'Locked Flow QA'}));
});

const swipe=async locator=>locator.evaluate(el=>{
  const fire=(type,y)=>{
    const e=new Event(type,{bubbles:true,cancelable:true});
    Object.defineProperty(e,'touches',{value:type==='touchend'?[]:[{clientY:y}]});
    el.dispatchEvent(e);
  };
  fire('touchstart',520);fire('touchmove',410);fire('touchmove',300);fire('touchend',300);
});
const exerciseScroll=async id=>{
  await page.evaluate(screen=>{
    window.SBPNavigate(screen);
    const root=document.getElementById(screen);
    if(root&&!root.querySelector('[data-locked-scroll-filler]')){
      const filler=document.createElement('div');
      filler.dataset.lockedScrollFiller='1';
      filler.style.cssText='display:block;flex:0 0 900px;width:1px;height:900px;min-height:900px;pointer-events:auto';
      root.appendChild(filler);
    }
    if(root)root.scrollTop=0;
  },id);
  await page.waitForFunction(screen=>document.getElementById(screen)?.classList.contains('active'),id);
  const root=page.locator(`#${id}`);
  const metrics=await root.evaluate(el=>({max:el.scrollHeight-el.clientHeight,touch:getComputedStyle(el).touchAction,overflow:getComputedStyle(el).overflowY}));
  assert(metrics.max>200,`${id} is not scrollable enough for the Android regression test.`);
  assert(metrics.touch!=='none',`${id} has touch scrolling disabled.`);
  assert(metrics.overflow==='auto'||metrics.overflow==='scroll',`${id} is not vertically scrollable.`);
  await swipe(root.locator('[data-locked-scroll-filler]'));
  assert((await root.evaluate(el=>el.scrollTop))>100,`${id} Android touch scrolling did not move the screen.`);
};

try{
  await page.goto(`${base}/index.html?api=http://127.0.0.1:8000/api/v1`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>typeof window.SBPNavigate==='function');

  await exerciseScroll('select');
  await exerciseScroll('time');

  await page.evaluate(()=>window.SBPNavigate('profile'));
  await page.waitForFunction(()=>document.getElementById('profile')?.classList.contains('active'));
  await page.locator('#profile .menu button').filter({hasText:'My Bookings'}).click();
  await page.waitForFunction(()=>document.getElementById('bookings')?.classList.contains('active'));
  await page.waitForFunction(()=>!document.getElementById('bookings')?.innerText.includes('Loading your bookings'));
  const bookingsText=await page.locator('#bookings').innerText();
  assert(bookingsText.includes('No upcoming bookings.'),'Profile → My Bookings did not hydrate the live booking list.');

  console.log('Locked player regressions passed: Date/Court and Time scroll on Android, and Profile → My Bookings hydrates immediately.');
}finally{
  await browser.close();
}
