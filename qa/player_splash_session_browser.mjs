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

 // Inspect the logged-in splash without racing its deliberate redirect. Block only the
 // root navigation request triggered by location.replace('./'); auth-preview itself and
 // all of its assets still load normally.
 const loggedIn=await browser.newPage({viewport:{width:412,height:915}});
 await routeApi(loggedIn);
 await loggedIn.addInitScript(()=>{
  localStorage.setItem('sbpPadelAccessToken','qa-token');
  localStorage.setItem('sbpPadelUser',JSON.stringify({full_name:'Splash QA'}));
 });
 await loggedIn.route(`${base}/`,route=>route.abort());
 await loggedIn.goto(`${base}/auth-preview.html`,{waitUntil:'domcontentloaded'});
 await loggedIn.waitForFunction(()=>document.documentElement.classList.contains('sbp-session-splash'),null,{timeout:1500});
 const splashState=await loggedIn.evaluate(()=>{
  const actions=document.querySelector('.glassActions'),splash=document.querySelector('#splash');
  return {
   sessionMode:document.documentElement.classList.contains('sbp-session-splash'),
   actionDisplay:actions?getComputedStyle(actions).display:null,
   splashVisible:!!splash&&getComputedStyle(splash).display!=='none',
   token:localStorage.getItem('sbpPadelAccessToken')
  };
 });
 assert(splashState.sessionMode,'Logged-in splash did not enter session-aware mode before paint.');
 assert(splashState.actionDisplay==='none','Logged-in splash still rendered Sign In/Create Account actions.');
 assert(splashState.splashVisible,'Logged-in session skipped the branded splash entirely.');
 assert(splashState.token==='qa-token','Session-aware splash cleared a valid stored session.');
 await loggedIn.waitForTimeout(1200);
 assert(new URL(loggedIn.url()).pathname.endsWith('/auth-preview.html'),'Blocked session splash unexpectedly left the splash page.');
 console.log('Player session-aware splash browser QA passed.');
}finally{await browser.close()}
