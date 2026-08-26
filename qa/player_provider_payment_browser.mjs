import { chromium } from 'playwright';

const base=process.env.SBP_PLAYER_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:800}});
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
let paid=false;
let simulateCalled=false;
let initiateCalls=0;
let bookingCreateCalls=0;
let participantSyncCalls=0;
const apiRequests=[];
const pageErrors=[];
page.on('pageerror',error=>pageErrors.push(error.message));

await page.route('**/api/v1/**',async route=>{
  const request=route.request();
  const url=new URL(request.url());
  const path=url.pathname;
  apiRequests.push(`${request.method()} ${path}`);
  const json=body=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  if(path.endsWith('/bookings/quote'))return json({venue:{id:'venue-1',name:'Provider QA Venue'},court:{id:'court-1',name:'Court 01',court_type:'Standard'},date:'2026-09-30',slots:[{start_time:'18:00',end_time:'19:00',rate:'2000.00',currency:'PKR'}],court_fee:'2000.00',service_fee:'100.00',total:'2100.00',currency:'PKR'});
  if(path.endsWith('/bookings/booking-provider-1/participants')&&request.method()==='PUT'){participantSyncCalls+=1;return json({booking_id:'booking-provider-1',players:[]})}
  if(path.endsWith('/bookings')&&request.method()==='POST'){bookingCreateCalls+=1;return json({id:'booking-provider-1',booking_code:'PDL-PROVIDER-QA',status:'pending_payment',amount_due:'2100.00',currency:'PKR',hold_minutes:10,atomic_lock:false})}
  if(path.endsWith('/payments/initiate')){initiateCalls+=1;return json({payment_id:'payment-provider-1',booking_id:'booking-provider-1',booking_code:'PDL-PROVIDER-QA',status:'pending',amount:'2100.00',currency:'PKR',method:'bank',provider:'fake-payzen',provider_reference:'PSID-2026-000123',redirect_url:'https://payments.example/PSID-2026-000123',client_payload:{psid:'PSID-2026-000123'},requires_provider_integration:false})}
  if(path.includes('/simulate-success')){simulateCalled=true;return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({detail:'Configured provider must not call simulator'})})}
  if(path.endsWith('/payments/payment-provider-1'))return json({id:'payment-provider-1',booking_id:'booking-provider-1',booking_code:'PDL-PROVIDER-QA',status:paid?'paid':'pending',amount:'2100.00',currency:'PKR',method:'bank',provider:'fake-payzen',provider_reference:'PSID-2026-000123',redirect_url:'https://payments.example/PSID-2026-000123',client_payload:{psid:'PSID-2026-000123'},requires_provider_integration:false});
  if(path.endsWith('/bookings/booking-provider-1'))return json({id:'booking-provider-1',booking_code:'PDL-PROVIDER-QA',date:'2026-09-30',status:paid?'confirmed':'pending_payment',venue_id:'venue-1',court_id:'court-1',slots:[{start_time:'18:00',end_time:'19:00',rate:'2000.00'}],court_fee:'2000.00',service_fee:'100.00',total:'2100.00',currency:'PKR'});
  return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({detail:`Unmocked provider QA request: ${request.method()} ${path}`})});
});

await page.addInitScript(()=>{
  localStorage.setItem('sbpPadelAccessToken','provider-payment-qa');
  if(!localStorage.getItem('sbpPadelBookingSessionV2'))localStorage.setItem('sbpPadelBookingSessionV2',JSON.stringify({version:2,venueId:'venue-1',venueName:'Provider QA Venue',date:'2026-09-30',courtId:'court-1',courtName:'Court 01',courtType:'Standard',slotStarts:['18:00'],quote:{venue:{id:'venue-1',name:'Provider QA Venue'},court:{id:'court-1',name:'Court 01',court_type:'Standard'},date:'2026-09-30',slots:[{start_time:'18:00',end_time:'19:00',rate:'2000.00'}],court_fee:'2000.00',service_fee:'100.00',total:'2100.00',currency:'PKR'},policyId:'policy-1',policyAccepted:true,paymentMethod:'bank',status:'reviewed'}));
});

try{
  await page.goto(`${base}/payment.html`,{waitUntil:'networkidle'});
  await page.locator('#payButton').waitFor({state:'visible'});
  await page.waitForTimeout(100);
  const runtime=await page.evaluate(()=>({live:!!window.__SBPPaymentMethodsLive,capture:!!window.__SBPProviderCheckoutCapture,scripts:[...document.scripts].map(s=>s.src).filter(Boolean)}));
  assert(runtime.live,`payment-methods-live.js did not execute. scripts=${runtime.scripts.join(' | ')}; pageErrors=${pageErrors.join(' | ')}`);
  assert(runtime.capture,`Provider checkout owner was not installed. scripts=${runtime.scripts.join(' | ')}; pageErrors=${pageErrors.join(' | ')}`);
  await page.locator('#payButton').click();
  await page.waitForTimeout(1200);
  const providerVisible=await page.locator('#providerAwaiting').isVisible().catch(()=>false);
  assert(providerVisible,`Provider awaiting panel did not appear. requests=${apiRequests.join(' | ')}; simulateCalled=${simulateCalled}; pageErrors=${pageErrors.join(' | ')}; scripts=${runtime.scripts.join(' | ')}`);
  assert(bookingCreateCalls===1,`Expected one booking creation, got ${bookingCreateCalls}. requests=${apiRequests.join(' | ')}`);
  assert(participantSyncCalls===1,`Expected established participant sync after booking creation, got ${participantSyncCalls}. requests=${apiRequests.join(' | ')}`);
  assert(initiateCalls===1,`Expected one provider initiation, got ${initiateCalls}. requests=${apiRequests.join(' | ')}`);
  assert(!simulateCalled,'Configured provider checkout called the development simulator.');
  assert((await page.locator('#providerAwaiting').innerText()).includes('PSID-2026-000123'),'Provider PSID/reference was not shown to the player.');
  assert(await page.locator('#copyProviderReference').isVisible(),'Provider reference Copy control is missing.');
  assert(await page.locator('#checkProviderPayment').isVisible(),'Provider Check Status control is missing.');
  assert((await page.locator('#providerPaymentStatus').innerText()).toLowerCase().includes('waiting'),'Provider payment page did not remain in an awaiting-confirmation state.');
  let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sbpPadelBookingSessionV2')||'{}'));
  assert(saved.status!=='confirmed','Configured provider redirect/reference was treated as proof of payment before backend verification.');

  paid=true;
  await page.locator('#checkProviderPayment').evaluate(async el=>{if(typeof el.onclick==='function')await el.onclick(new MouseEvent('click',{bubbles:true,cancelable:true}));else el.click()});
  saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sbpPadelBookingSessionV2')||'{}'));
  if(saved.status!=='confirmed'){
    await page.waitForTimeout(1200);
    saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sbpPadelBookingSessionV2')||'{}'));
  }
  assert(saved.status==='confirmed',`Verified provider payment did not confirm player state. status=${saved.status}; requests=${apiRequests.join(' | ')}; pageErrors=${pageErrors.join(' | ')}`);
  assert(!simulateCalled,'Configured provider checkout called the simulator while confirming verified payment.');
  assert(saved.paymentProvider==='fake-payzen','Configured provider name was not preserved in booking state.');
  assert(saved.paymentReference==='PSID-2026-000123','Configured provider reference was not preserved in booking state.');
  assert(saved.paymentStatus==='paid','Verified provider payment did not update player payment state.');

  await page.goto(`${base}/payment.html`,{waitUntil:'networkidle'});
  await page.locator('#payButton').waitFor({state:'visible'});
  await page.waitForTimeout(100);
  await page.locator('#payButton').click();
  await page.waitForTimeout(400);
  const recovered=await page.evaluate(()=>JSON.parse(localStorage.getItem('sbpPadelBookingSessionV2')||'{}'));
  assert(recovered.status==='confirmed',`Already-confirmed booking recovery lost confirmed state. status=${recovered.status}`);
  assert(bookingCreateCalls===1,`Already-confirmed booking recovery created a duplicate booking. creates=${bookingCreateCalls}; requests=${apiRequests.join(' | ')}`);
  assert(initiateCalls===1,`Already-confirmed booking recovery initiated another payment. initiations=${initiateCalls}; requests=${apiRequests.join(' | ')}`);
  assert(!simulateCalled,'Already-confirmed booking recovery called the development simulator.');

  console.log('Player configured-provider payment QA passed: participant sync, PSID display, no simulator, verified polling confirmation and duplicate-booking recovery work.');
}finally{
  await browser.close();
}
