import { chromium } from 'playwright';

const base=process.env.SBP_PLAYER_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:412,height:915}});
const assert=(c,m)=>{if(!c)throw new Error(m)};
await page.route('http://127.0.0.1:8000/api/v1/**',async route=>{
 const path=new URL(route.request().url()).pathname.replace('/api/v1','');
 let body={};
 if(path==='/auth/me')body={id:'splash-user',full_name:'Splash QA',role:'player'};
 else if(path==='/venues')body=[];
 else if(path==='/notifications/me')body=[];
 else if(path==='/bookings/me')body=[];
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
});
try{
 await page.goto(`${base}/auth-preview.html`,{waitUntil:'domcontentloaded'});
 assert(await page.locator('.glassActions').isVisible(),'Logged-out splash did not show Sign In/Create Account actions.');
 await page.evaluate(()=>{localStorage.setItem('sbpPadelAccessToken','qa-token');localStorage.setItem('sbpPadelUser',JSON.stringify({full_name:'Splash QA'}))});
 await page.reload({waitUntil:'domcontentloaded'});
 assert(await page.evaluate(()=>document.documentElement.classList.contains('sbp-session-splash')),'Logged-in splash did not enter session-aware mode before paint.');
 const display=await page.locator('.glassActions').evaluate(el=>getComputedStyle(el).display);
 assert(display==='none','Logged-in splash still rendered Sign In/Create Account actions.');
 assert(await page.locator('#splash').isVisible(),'Logged-in session skipped the branded splash entirely.');
 await page.waitForURL(url=>!url.pathname.endsWith('/auth-preview.html'),{timeout:3000});
 assert((await page.evaluate(()=>localStorage.getItem('sbpPadelAccessToken')))==='qa-token','Session-aware splash cleared a valid stored session.');
 console.log('Player session-aware splash browser QA passed.');
}finally{await browser.close()}
