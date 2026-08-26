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
  if(url.pathname.endsWith('/bookings/me')||url.pathname.endsWith('/notifications/me')||url.pathname.endsWith('/venues')){
    await route.fulfill({status:200,contentType:'application/json',body:'[]'});
    return;
  }
  await route.fulfill({status:200,contentType:'application/json',body:'{}'});
});

await page.addInitScript(()=>{
  localStorage.setItem('sbpPadelAccessToken','review-mobile-qa');
  localStorage.setItem('sbpPadelUser',JSON.stringify({id:'user-1',full_name:'Mobile QA'}));
  localStorage.removeItem('sbpPadelSavedPlayers');
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

  await page.evaluate(()=>window.SBPNavigate('home'));
  await page.waitForFunction(()=>document.getElementById('home')?.classList.contains('active'));
  const escaped=await page.evaluate(()=>{
    const review=document.getElementById('reviewNative');
    return {reviewActive:!!review?.classList.contains('active'),reviewPointer:review?getComputedStyle(review).pointerEvents:'none'};
  });
  assert(!escaped.reviewActive,'Review remained active after abandoning the booking flow.');
  assert(escaped.reviewPointer==='none','Invisible Review still intercepted clicks after abandoning the booking flow.');

  for(const target of ['bookings','venues','profile','home']){
    await page.locator(`nav [data-nav="${target}"]`).click();
    await page.waitForFunction(id=>document.getElementById(id)?.classList.contains('active'),target);
    const blocker=await page.evaluate(()=>getComputedStyle(document.getElementById('reviewNative')).pointerEvents);
    assert(blocker==='none',`Review intercepted ${target} after booking-flow escape.`);
  }

  await openAndAssertCanonical();
  await review.evaluate(el=>{el.scrollTop=0});
  await swipe(page.locator('#reviewNative .rnCard').first());
  assert((await review.evaluate(el=>el.scrollTop))>100,'Canonical Review stopped scrolling after re-entry.');

  // A partner explicitly added during booking must become a real profile-level
  // Saved Player, not merely remain in the current checkout participant list.
  await page.locator('#rnAdd').click();
  await page.locator('#rnName').fill('Saved Partner QA');
  await page.locator('#rnAddGo').click();
  await page.waitForFunction(()=>{
    try{return JSON.parse(localStorage.getItem('sbpPadelSavedPlayers')||'[]').includes('Saved Partner QA')}catch{return false}
  });
  await page.evaluate(()=>window.SBPNavigate('profile'));
  await page.waitForFunction(()=>document.getElementById('profile')?.classList.contains('active'));
  await page.locator('#profile .menu button').filter({hasText:'Saved Players'}).click();
  await page.waitForFunction(()=>document.getElementById('savedPlayers')?.classList.contains('active'));
  assert((await page.locator('#savedPlayers').innerText()).includes('Saved Partner QA'),'Partner added during booking did not appear in Profile → Saved Players.');
  await page.locator('#savedPlayers [data-pm-back]').click();

  await openAndAssertCanonical();
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
  await page.evaluate(()=>window.SBPNavigate('home'));
  await page.waitForFunction(()=>document.getElementById('home')?.classList.contains('active'));
  await page.locator('#home .primary[data-nav="venues"]').click();
  await page.waitForFunction(()=>document.getElementById('venues')?.classList.contains('active'));

  console.log('Player canonical Review QA passed: canonical Review, Android scrolling, safe escape, Saved Players persistence, Payment and repeat entry all work.');
}finally{
  await browser.close();
}
