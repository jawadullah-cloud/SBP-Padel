import { chromium } from 'playwright';

const base=process.env.SBP_PLAYER_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:412,height:915}});
const venue={id:'venue-1',name:'Nishtar Park Sports Complex',city:'Lahore',latitude:31.511617,longitude:74.337527,opening_time:'06:00',closing_time:'23:00',timezone:'Asia/Karachi'};
const courts=[{id:'court-1',court_id:'court-1',court_name:'Court 01',court_type:'Training',slots:[{start_time:'18:00',end_time:'19:00',available:true,hourly_rate:2100,currency:'PKR'}]}];

await page.route('http://127.0.0.1:8000/api/v1/**',async route=>{
  const req=route.request();
  const url=new URL(req.url());
  const path=url.pathname.replace('/api/v1','');
  let body={};
  if(path==='/auth/me')body={id:'user-1',full_name:'Navigation QA'};
  else if(path==='/venues')body=[venue];
  else if(path==='/venues/venue-1')body={...venue,description:'QA venue',amenities:[],courts:courts.map(c=>({id:c.id,code:'01',name:c.court_name,court_type:c.court_type,status:'active'}))};
  else if(path==='/venues/venue-1/availability')body={venue_id:venue.id,date:url.searchParams.get('date'),timezone:venue.timezone,courts};
  else if(path==='/bookings/me')body=[];
  else if(path==='/notifications/me')body=[];
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
});

await page.addInitScript(()=>{
  localStorage.setItem('sbpPadelAccessToken','nav-qa-token');
  localStorage.setItem('sbpPadelUser',JSON.stringify({id:'user-1',full_name:'Navigation QA'}));
});

const assert=(condition,message)=>{if(!condition)throw new Error(message)};

try{
  await page.goto(`${base}/index.html`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>typeof window.SBPNavigate==='function'&&window.__SBPMainNavigationHardening===true);

  await page.locator('nav [data-nav="bookings"]').click();
  await page.waitForFunction(()=>document.getElementById('bookings')?.classList.contains('active'));
  await page.locator('nav [data-nav="home"]').click();
  await page.waitForFunction(()=>document.getElementById('home')?.classList.contains('active'));
  await page.locator('#home .primary[data-nav="venues"]').click();
  await page.waitForFunction(()=>document.getElementById('venues')?.classList.contains('active'));

  await page.evaluate(()=>{
    const home=document.getElementById('home');
    if(home){home.style.pointerEvents='none';home.style.touchAction='none'}
    const layer=document.getElementById('sbpDeepLayer');
    if(layer){
      layer.classList.add('leaving','sbp-preload-detail');
      layer.style.pointerEvents='auto';
    }
    window.SBPNavigate('home');
  });
  await page.waitForFunction(()=>document.getElementById('home')?.classList.contains('active'));

  const state=await page.evaluate(()=>{
    const home=document.getElementById('home');
    const layer=document.getElementById('sbpDeepLayer');
    return {
      homePointer:getComputedStyle(home).pointerEvents,
      homeTouch:home.style.touchAction,
      layerOn:!!layer?.classList.contains('on'),
      layerLeaving:!!layer?.classList.contains('leaving'),
      layerPointer:layer?getComputedStyle(layer).pointerEvents:'none',
    };
  });
  assert(state.homePointer!=='none','Home remained non-interactive after main navigation recovery.');
  assert(state.homeTouch!=='none','Home retained stale touch-action:none after recovery.');
  assert(!state.layerOn&&!state.layerLeaving,'Deep-route overlay remained active after returning Home.');
  assert(state.layerPointer==='none','Stale deep-route layer still intercepted Home interactions.');

  await page.locator('#home .primary[data-nav="venues"]').click();
  await page.waitForFunction(()=>document.getElementById('venues')?.classList.contains('active'));
  await page.locator('nav [data-nav="home"]').click();
  await page.waitForFunction(()=>document.getElementById('home')?.classList.contains('active'));
  await page.locator('#home .quick [data-nav="bookings"]').click();
  await page.waitForFunction(()=>document.getElementById('bookings')?.classList.contains('active'));

  console.log('Player navigation recovery QA passed: Home remains interactive after repeated main/deep-route state changes.');
}finally{
  await browser.close();
}
