import { chromium } from 'playwright';

const base = process.env.SBP_PLAYER_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 412, height: 915 } });

const today = new Date();
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const future = new Date(today); future.setDate(today.getDate()+4);
const later = new Date(today); later.setDate(today.getDate()+5);
let bookingDate = iso(future);
let bookingStatus = 'confirmed';
let bookingListDelayMs = 0;
const venue = { id:'venue-life', name:'Nishtar Park Sports Complex', city:'Lahore', address:'National Stadium', latitude:31.5, longitude:74.3, opening_time:'06:00', closing_time:'23:00', timezone:'Asia/Karachi' };
const court = { id:'court-life', name:'Court 01', court_type:'Championship', is_indoor:false };
const booking = () => ({ id:'booking-live-1', booking_code:'PDL-LIFECYCLE', venue_id:venue.id, court_id:court.id, date:bookingDate, total:2200, status:bookingStatus, payment_status:'paid' });
const detail = () => ({ ...booking(), slots:[{start_time:'15:00',end_time:'16:00'}], payment:{transaction_id:'PAY-LIFECYCLE'} });
const availability = date => ({ venue_id:venue.id, date, timezone:venue.timezone, courts:[{ court_id:court.id, court_name:court.name, court_type:court.court_type, slots:[{start_time:'13:00',end_time:'14:00',available:true,hourly_rate:2500},{start_time:'15:00',end_time:'16:00',available:true,hourly_rate:2100}] }] });
let refundRequested=false;

await page.route('http://127.0.0.1:8000/api/v1/**', async route => {
  const req=route.request(), url=new URL(req.url()), path=url.pathname.replace('/api/v1','');
  let body={};
  if(path==='/bookings/me'){if(bookingListDelayMs)await new Promise(r=>setTimeout(r,bookingListDelayMs));body=[booking()]}
  else if(path==='/venues')body=[venue];
  else if(path===`/venues/${venue.id}`)body={...venue,courts:[court]};
  else if(path===`/venues/${venue.id}/availability`)body=availability(url.searchParams.get('date'));
  else if(path===`/bookings/${booking().id}`)body=detail();
  else if(path===`/bookings/${booking().id}/reschedule`&&req.method()==='POST'){const payload=req.postDataJSON();bookingDate=payload.booking_date;bookingStatus='rescheduled';body=detail()}
  else if(path===`/bookings/${booking().id}/cancel`&&req.method()==='POST'){bookingStatus='cancelled';body=detail()}
  else if(path===`/bookings/${booking().id}/refund`&&req.method()==='POST'){refundRequested=true;body={status:'requested',amount:2200}}
  else if(path===`/bookings/${booking().id}/refund`)body={status:refundRequested?'requested':'none',amount:refundRequested?2200:0};
  else if(path==='/auth/me')body={id:'user-life',full_name:'Lifecycle QA'};
  else if(path==='/notifications/me')body=[];
  else if(path==='/payments/me')body=[];
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
});

await page.addInitScript(()=>{
  localStorage.setItem('sbpPadelAccessToken','qa-token');
  localStorage.setItem('sbpPadelUser',JSON.stringify({id:'user-life',full_name:'Lifecycle QA'}));
});

const assert=(condition,message)=>{if(!condition)throw new Error(message)};

try{
  await page.goto(`${base}/index.html?open=bookings`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.getElementById('bookings')?.innerText.includes('PDL-LIFECYCLE'));
  assert((await page.locator('#bookings').innerText()).includes('PDL-LIFECYCLE'),'Live booking did not appear.');

  bookingListDelayMs=250;
  const manageRefresh=page.evaluate(()=>window.SBPRefreshBookings());
  await page.waitForTimeout(20);
  await page.locator('#bookings [data-live-manage="booking-live-1"]').click();
  await page.waitForSelector('#sbpDeepLayer.on');
  await manageRefresh;
  bookingListDelayMs=0;
  assert(await page.locator('#sbpDeepLayer').evaluate(el=>el.classList.contains('on')),'A background bookings refresh cancelled the first Manage Booking navigation.');

  const frame=page.frameLocator('#sbpDeepFrame');
  await frame.locator('#id').waitFor();
  await frame.locator('#id').filter({hasText:'PDL-LIFECYCLE'}).waitFor();
  assert((await frame.locator('#statusPill').innerText())==='CONFIRMED','Booking detail did not hydrate the live status.');
  assert((await frame.locator('#transactionId').innerText())==='PAY-LIFECYCLE','Booking detail did not hydrate the real payment reference.');

  await frame.locator('#rescheduleBtn').click();
  await frame.locator('#rescheduleModal.show').waitFor();
  const dateButtons=frame.locator('#rescheduleModal .dates button');
  assert(await dateButtons.count()===6,'Reschedule did not offer six live date choices.');
  await dateButtons.nth(1).click();
  await frame.locator('#rescheduleModal .slots button').first().waitFor();

  const expensive=frame.locator('#rescheduleModal .slots button[data-start="13:00"]');
  await expensive.click();
  assert(await frame.locator('#confirmReschedule').isDisabled(),'Price-mismatched reschedule remained actionable.');
  assert((await frame.locator('#confirmReschedule').innerText()).includes('PRICE MUST MATCH'),'Price mismatch was not explained on the action button.');

  const matching=frame.locator('#rescheduleModal .slots button[data-start="15:00"]');
  await matching.click();
  assert(!(await frame.locator('#confirmReschedule').isDisabled()),'Valid same-price selection did not recover the reschedule action.');
  assert((await frame.locator('#confirmReschedule').innerText())==='CONFIRM RESCHEDULE','Reschedule action label did not recover after a price mismatch.');
  await frame.locator('#confirmReschedule').click();
  await frame.locator('#rescheduleModal').waitFor({state:'hidden'});
  assert((await frame.locator('#statusPill').innerText())==='RESCHEDULED','Reschedule did not update booking status in the live detail UI.');
  assert((await frame.locator('#date').innerText())!=='Sunday, 20 Dec 2026','Reschedule did not update the booking date.');

  await frame.locator('#cancelBtn').click();
  await frame.locator('#cancelModal.show').waitFor();
  await frame.locator('#confirmCancel').click();
  await frame.locator('#cancelModal').waitFor({state:'hidden'});
  assert((await frame.locator('#statusPill').innerText())==='CANCELLED','Cancellation did not update the live booking detail.');
  await frame.locator('#refundState').waitFor();
  assert((await frame.locator('#refundState').innerText()).includes('REFUND REQUESTED'),'Refund state was not tied to the live refund API result.');

  await frame.locator('.head .back').click();
  await page.waitForFunction(()=>document.getElementById('bookings')?.classList.contains('active'));
  await page.waitForFunction(()=>document.getElementById('bookings')?.innerText.includes('Cancelled (1)'));
  console.log('Player booking lifecycle browser QA passed.');
} finally {
  await browser.close();
}
