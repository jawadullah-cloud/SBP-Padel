import { chromium } from 'playwright';

const base=process.env.SBP_PLAYER_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:412,height:915}});
const payment={id:'pay-theme',booking_id:'booking-theme',booking_code:'PDL-THEME',booking_date:'2026-08-29',payment_status:'paid',method:'card',provider_reference:'PAY-THEME',amount:'2100.00',currency:'PKR',created_at:new Date().toISOString(),refund:null};
await page.route('http://127.0.0.1:8000/api/v1/**',async route=>{const u=new URL(route.request().url()),p=u.pathname.replace('/api/v1','');let body={};if(p==='/auth/me')body={id:'theme-user',full_name:'Theme Player',email:'theme@example.com',phone:null,role:'player',avatar_data_url:null};else if(p==='/payments/me')body=[payment];else if(p==='/notifications/me'||p==='/bookings/me'||p==='/venues')body=[];await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})});
await page.addInitScript(()=>{localStorage.setItem('sbpPadelAccessToken','theme-token');localStorage.setItem('sbpPadelTheme','dark')});
const assert=(c,m)=>{if(!c)throw new Error(m)};
try{
  await page.goto(`${base}/index.html`,{waitUntil:'networkidle'});
  assert(await page.evaluate(()=>document.documentElement.dataset.theme)==='dark','Player did not start in stored dark theme.');
  await page.locator('#themeToggle').click();
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  assert(await page.evaluate(()=>localStorage.getItem('sbpPadelTheme'))==='light','Header theme toggle did not persist light theme.');
  const shell=await page.evaluate(()=>({stage:getComputedStyle(document.querySelector('.stage')).backgroundColor,phone:getComputedStyle(document.querySelector('.phone')).backgroundColor,nav:getComputedStyle(document.querySelector('nav')).backgroundColor}));
  assert(shell.phone!=='rgb(6, 16, 18)','Light theme left the phone on the dark runtime background.');

  await page.locator('nav [data-nav="profile"]').click();
  await page.waitForFunction(()=>document.getElementById('profile')?.innerText.includes('Theme Player'));
  assert((await page.locator('#profile [data-profile-action="appearance"] .profileTail').innerText())==='LIGHT','Profile appearance state disagrees with shared theme.');

  await page.locator('#profile [data-profile-action="wallet"]').click();
  await page.waitForSelector('#sbpDeepLayer.on');
  let frame=page.frameLocator('#sbpDeepFrame');
  await frame.locator('#balance').waitFor();
  assert(await frame.locator('html').getAttribute('data-theme')==='light','Wallet deep route did not inherit light theme.');
  const walletBg=await frame.locator('.phone').evaluate(el=>getComputedStyle(el).backgroundColor);
  assert(walletBg!=='rgb(6, 16, 18)','Wallet retained dark phone background in light theme.');
  await frame.locator('.head .back').click();
  await page.waitForFunction(()=>document.getElementById('profile')?.classList.contains('active'));

  await page.locator('#profile [data-profile-action="appearance"]').click();
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  assert((await page.locator('#profile [data-profile-action="appearance"] .profileTail').innerText())==='DARK','Profile appearance label did not follow shared dark theme.');
  await page.locator('#profile [data-profile-action="payments"]').click();
  await page.waitForSelector('#sbpDeepLayer.on');frame=page.frameLocator('#sbpDeepFrame');await frame.locator('#list').waitFor();
  assert(await frame.locator('html').getAttribute('data-theme')==='dark','Payment History deep route did not inherit dark theme.');
  console.log('Player theme browser QA passed.');
}finally{await browser.close()}
