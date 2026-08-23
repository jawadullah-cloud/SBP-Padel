import { chromium } from 'playwright';

const base=process.env.SBP_PLAYER_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:412,height:915}});
const payment={id:'pay-live',booking_id:'booking-live',booking_code:'PDL-ACCOUNT-LIVE',booking_date:'2026-08-29',payment_status:'paid',method:'card',provider_reference:'PAY-ACCOUNT-LIVE',amount:'2200.00',currency:'PKR',created_at:new Date().toISOString(),refund:{id:'refund-live',status:'requested',amount:'2200.00',currency:'PKR',provider_reference:null,reason:'QA refund',created_at:new Date().toISOString()}};

await page.route('http://127.0.0.1:8000/api/v1/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname.replace('/api/v1','');let body={};
  if(path==='/auth/me')body={id:'user-live',full_name:'Runtime Player',email:'runtime@example.com',phone:'+923001234567',role:'player'};
  else if(path==='/payments/me')body=[payment];
  else if(path==='/notifications/me')body=[];
  else if(path==='/bookings/me')body=[];
  else if(path==='/venues')body=[];
  else body={};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
});
await page.addInitScript(()=>{
  localStorage.setItem('sbpPadelAccessToken','qa-token');
  localStorage.setItem('sbpPadelUser',JSON.stringify({full_name:'Old Prototype Name'}));
  localStorage.removeItem('sbpPadelSavedPlayers');
  localStorage.removeItem('sbpPadelTheme');
});
const assert=(c,m)=>{if(!c)throw new Error(m)};
try{
  await page.goto(`${base}/index.html`,{waitUntil:'networkidle'});
  await page.locator('nav [data-nav="profile"]').click();
  await page.waitForFunction(()=>document.getElementById('profile')?.innerText.includes('Runtime Player'));
  const profileText=await page.locator('#profile').innerText();
  assert(profileText.includes('runtime@example.com'),'Profile did not hydrate live /auth/me contact data.');
  assert(!profileText.includes('Adeel Raza'),'Prototype profile identity leaked into live profile.');

  await page.locator('#profile .menu button').filter({hasText:'Saved Players'}).click();
  await page.waitForFunction(()=>document.getElementById('savedPlayers')?.classList.contains('active'));
  const savedText=await page.locator('#savedPlayers').innerText();
  assert(savedText.includes('0 saved'),'Saved Players did not start from the actual empty local state.');
  assert(!/Sara Khan|Hamza Ali|Mariam Shah/.test(savedText),'Prototype saved players were seeded.');
  await page.locator('#savedPlayers [data-pm-back]').click();

  const before=await page.evaluate(()=>document.documentElement.dataset.theme||'dark');
  await page.locator('#profile [data-profile-action="appearance"]').click();
  const after=await page.evaluate(()=>document.documentElement.dataset.theme);
  assert(before!==after,'Appearance control did not apply through the shared theme bridge.');

  await page.locator('#profile [data-profile-action="payments"]').click();
  await page.waitForSelector('#sbpDeepLayer.on');
  let frame=page.frameLocator('#sbpDeepFrame');
  await frame.locator('#list').filter({hasText:'PDL-ACCOUNT-LIVE'}).waitFor();
  const paymentText=await frame.locator('body').innerText();
  assert(paymentText.includes('PAY-ACCOUNT-LIVE'),'Payment History did not render the live transaction reference.');
  assert(!paymentText.includes('PDL-002381'),'Prototype payment-history booking leaked into runtime.');
  assert(paymentText.includes('REFUND REQUESTED'),'Live refund state was not rendered.');
  await frame.locator('.head .back').click();
  await page.waitForFunction(()=>document.getElementById('profile')?.classList.contains('active'));

  await page.locator('#profile [data-profile-action="wallet"]').click();
  await page.waitForSelector('#sbpDeepLayer.on');
  frame=page.frameLocator('#sbpDeepFrame');
  await frame.locator('#balance').filter({hasText:'NOT ENABLED'}).waitFor();
  const walletText=await frame.locator('body').innerText();
  assert(walletText.includes('PDL-ACCOUNT-LIVE'),'Wallet activity did not use live payment records.');
  assert(!walletText.includes('PKR 2,450'),'Prototype wallet balance leaked into runtime.');
  assert(!walletText.includes('Wallet top-up'),'Prototype wallet top-up leaked into runtime.');
  await frame.locator('.head .back').click();
  await page.waitForFunction(()=>document.getElementById('profile')?.classList.contains('active'));

  await page.locator('#profile [data-profile-action="logout"]').click();
  await page.waitForURL(/auth-preview\.html/);
  assert((await page.evaluate(()=>localStorage.getItem('sbpPadelAccessToken')))===null,'Logout did not clear access token.');
  console.log('Player account browser QA passed.');
}finally{await browser.close()}
