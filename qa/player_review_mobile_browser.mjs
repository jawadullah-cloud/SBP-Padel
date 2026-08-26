import { chromium } from 'playwright';

const base=process.env.SBP_PLAYER_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:412,height:915}});
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

await page.addInitScript(()=>{
  localStorage.setItem('sbpPadelAccessToken','review-mobile-qa');
  localStorage.setItem('sbpPadelUser',JSON.stringify({id:'user-1',full_name:'Mobile QA'}));
  localStorage.setItem('sbpPadelReview',JSON.stringify({venue:'Nishtar Park Sports Complex',court:'Court 01',courtType:'Training',date:'Wednesday, 26 Aug 2026',slots:['6:00 PM – 7:00 PM','7:00 PM – 8:00 PM'],courtFee:4200,serviceFee:100,amount:4300}));
  localStorage.setItem('sbpPadelBookingSessionV2',JSON.stringify({version:2,venueId:'venue-1',venueName:'Nishtar Park Sports Complex',date:'2026-08-26',courtId:'court-1',courtName:'Court 01',courtType:'Training',slotStarts:['18:00','19:00'],quote:{court_fee:4200,service_fee:100,total:4300,slots:[{start_time:'18:00',end_time:'19:00'},{start_time:'19:00',end_time:'20:00'}]},policyAccepted:false,status:'selecting'}));
});

try{
  await page.goto(`${base}/index.html?api=http://127.0.0.1:8000/api/v1`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>typeof window.SBPDeepRoute==='function');
  await page.evaluate(()=>window.SBPDeepRoute('review-booking.html'));
  const frame=page.frameLocator('#sbpDeepFrame');
  await frame.locator('main.screen').waitFor({state:'visible'});

  const before=await frame.locator('main.screen').evaluate(el=>({top:el.scrollTop,max:el.scrollHeight-el.clientHeight,touch:getComputedStyle(el).touchAction,overflow:getComputedStyle(el).overflowY}));
  assert(before.max>100,'Review page is not long enough to exercise scrolling.');
  assert(before.overflow==='auto'||before.overflow==='scroll','Review page is not vertically scrollable.');
  assert(before.touch!=='none','Review page touch scrolling is disabled.');

  await frame.locator('.bookingCard').evaluate(el=>{
    const fire=(type,y)=>{const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:type==='touchend'?[]:[{clientY:y}]});el.dispatchEvent(e)};
    fire('touchstart',650);fire('touchmove',500);fire('touchmove',350);fire('touchend',350);
  });
  const after=await frame.locator('main.screen').evaluate(el=>el.scrollTop);
  assert(after>100,`Android-owned Review scrolling did not move the screen (${after}).`);

  await frame.locator('.back').click();
  await page.waitForFunction(()=>!document.getElementById('sbpDeepLayer')?.classList.contains('on'));
  await page.waitForTimeout(140);
  await page.locator('nav [data-nav="home"]').click();
  await page.waitForFunction(()=>document.getElementById('home')?.classList.contains('active'));
  await page.locator('#home .primary[data-nav="venues"]').click();
  await page.waitForFunction(()=>document.getElementById('venues')?.classList.contains('active'));

  console.log('Player Android Review QA passed: review scrolls by touch and exiting it does not poison subsequent clicks.');
}finally{
  await browser.close();
}
