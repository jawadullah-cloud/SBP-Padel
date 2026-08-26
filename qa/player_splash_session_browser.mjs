import { chromium } from 'playwright';

const base=process.env.SBP_PLAYER_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true});
const assert=(c,m)=>{if(!c)throw new Error(m)};
const routeApi=async page=>{
 await page.route('http://127.0.0.1:8000/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname.replace('/api/v1','');
  let body={};
  if(path==='/auth/me')body={id:'splash-user',full_name:'Splash QA',role:'player'};
  else if(path==='/venues')body=[];
  else if(path==='/notifications/me')body=[];
  else if(path==='/bookings/me')body=[];
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
};
try{
 const loggedOut=await browser.newPage({viewport:{width:412,height:915}});
 await routeApi(loggedOut);
 await loggedOut.goto(`${base}/auth-preview.html`,{waitUntil:'domcontentloaded'});
 assert(await loggedOut.locator('.glassActions').isVisible(),'Logged-out splash did not show Sign In/Create Account actions.');
 await loggedOut.close();

 // Seed the session before the document is created. This is the real app-start condition
 // that the pre-paint session splash bootstrap is designed to detect.
 const loggedIn=await browser.newPage({viewport:{width:412,height:915}});
 await routeApi(loggedIn);
 await loggedIn.addInitScript(()=>{
  localStorage.setItem('sbpPadelAccessToken','qa-token');
  localStorage.setItem('sbpPadelUser',JSON.stringify({full_name:'Splash QA'}));
 });
 await loggedIn.goto(`${base}/auth-preview.html`,{waitUntil:'commit'});
 await loggedIn.waitForFunction(()=>document.documentElement.classList.contains('sbp-session-splash'),null,{timeout:1500});
 const display=await loggedIn.locator('.glassActions').evaluate(el=>getComputedStyle(el).display);
 assert(display==='none','Logged-in splash still rendered Sign In/Create Account actions.');
 assert(await loggedIn.locator('#splash').isVisible(),'Logged-in session skipped the branded splash entirely.');
 await loggedIn.waitForURL(url=>!url.pathname.endsWith('/auth-preview.html'),{timeout:4000});
 assert((await loggedIn.evaluate(()=>localStorage.getItem('sbpPadelAccessToken')))==='qa-token','Session-aware splash cleared a valid stored session.');
 console.log('Player session-aware splash browser QA passed.');
}finally{await browser.close()}
