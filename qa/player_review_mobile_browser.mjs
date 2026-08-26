import { chromium } from 'playwright';

const base=process.env.SBP_PLAYER_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:412,height:650}});
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.endsWith('/policies/active')){
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'policy-1',title:'Booking, Cancellation & Refund Policy',version:'1',body:'Bookings may be rescheduled or cancelled according to the active venue policy. '.repeat(8)})});
    return;
  }
  if(url.pathname.endsWith('/auth/me')){
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'user-1',full_name:'Mobile QA'})});
    return;
  }
  await route.fulfill({status:200,contentType:'application/json',body:'{}'});
});

await page.addInitScript(()=>{
  localStorage.setItem('sbpPadelAccessToken','review-mobile-qa');
  localStorage.setItem('sbpPadelUser',JSON.stringify({id:'user-1',full_name:'Mobile QA'}));
  localStorage.setItem('sbpPadelBookingSessionV2',JSON.stringify({version:2,venueId:'venue-1',venueName:'Nishtar Park Sports Complex',date:'2026-08-27',courtId:'court-1',courtName:'Court 01',courtType:'Training',slotStarts:['18:00','19:00'],quote:{court_fee:4200,service_fee:100,total:4300,slots:[{start_time:'18:00',end_time:'19:00'},{start_time:'19:00',end_time:'20:00'}]},policyAccepted:false,status:'selecting'}));
});

const swipe=async locator=>locator.evaluate(el=>{
  const fire=(type,y)=>{
    const e=new Event(type,{bubbles:true,cancelable:true});
    Object.defineProperty(e,'touches',{value:type==='touchend'?[]:[{clientY:y}]});
    el.dispatchEvent(e);
  };
  fire('touchstart',520);fire('touchmove',410);fire('touchmove',300);fire('touchend',300);
});

try{
  await page.goto(`${base}/index.html?api=http://127.0.0.1:8000/api/v1`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>typeof window.SBPDeepRoute==='function'&&typeof window.SBPReviewNativeOpen==='function');

  const openAndAssertCanonical=async()=>{
    await page.evaluate(()=>window.SBPDeepRoute('review-booking.html'));
    await page.locator('#reviewNative.active').waitFor({state:'visible'});
    assert(await page.locator('#reviewNative .rnSteps b').count()===5,'Canonical Review must show all five booking steps.');
    assert((await page.locator('#reviewNative').innerText()).includes('STEP 5 · REVIEW'),'Canonical Step-5 Review did not open.');
    const legacySrc=await page.locator('#sbpDeepFrame').getAttribute('src');
    assert(!String(legacySrc||'').includes('review-booking.html'),'Legacy iframe Review was reached instead of canonical Step-5 Review.');
  };

  await openAndAssertCanonical();
  const review=page.locator('#reviewNative');
  const before=await review.evaluate(el=>({max:el.scrollHeight-el.clientHeight,touch:getComputedStyle(el).touchAction,overflow:getComputedStyle(el).overflowY}));
  assert(before.max>100,`Canonical Review is not long enough to exercise scrolling (${before.max}).`);
  assert(before.overflow==='auto'||before.overflow==='scroll','Canonical Review is not vertically scrollable.');
  assert(before.touch!=='none','Canonical Review touch scrolling is disabled.');

  await swipe(page.locator('#reviewNative .rnCard').first());
  const after=await review.evaluate(el=>el.scrollTop);
  assert(after>100,`Android-owned canonical Review scrolling did not move the screen (${after}).`);

  await page.locator('#rnAccept').scrollIntoViewIfNeeded();
  await page.locator('#rnAccept').check();
  assert(!(await page.locator('#rnPay').isDisabled()),'Continue to Payment did not enable after policy acceptance.');
  await page.locator('#rnPay').click();
  await page.waitForFunction(()=>{
    const src=document.getElementById('sbpDeepFrame')?.getAttribute('src')||'';
    return src.includes('payment.html');
  });
  const paymentFrame=page.frameLocator('#sbpDeepFrame');
  await paymentFrame.locator('#payButton').waitFor({state:'visible'});

  await page.evaluate(()=>window.SBPDeepClose(false));
  await page.waitForTimeout(180);
  await openAndAssertCanonical();
  await review.evaluate(el=>{el.scrollTop=0});
  await swipe(page.locator('#reviewNative .rnCard').first());
  assert((await review.evaluate(el=>el.scrollTop))>100,'Canonical Review stopped scrolling after returning from Payment.');

  await page.locator('#rnBack').click();
  await page.waitForFunction(()=>document.getElementById('time')?.classList.contains('active'));
  await page.locator('nav [data-nav="home"]').click();
  await page.waitForFunction(()=>document.getElementById('home')?.classList.contains('active'));
  await page.locator('#home .primary[data-nav="venues"]').click();
  await page.waitForFunction(()=>document.getElementById('venues')?.classList.contains('active'));

  console.log('Player canonical Review QA passed: one Step-5 implementation, Android touch scrolling, Payment transition, repeat entry and post-Review navigation all work.');
}finally{
  await browser.close();
}
