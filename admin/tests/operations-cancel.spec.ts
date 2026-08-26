import { expect, test } from '@playwright/test';

const venueId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const courtId='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const booking={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',booking_code:'PDL-OPS-CANCEL',date:'2026-09-18',status:'confirmed',court_id:courtId,court_code:'01',court_name:'Court 01',court_type:'Panoramic',player:{id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',full_name:'QA Player',email:'qa@example.com',phone:'03001234567'},slots:['18:00-19:00'],total:'2100.00',currency:'PKR',payment_status:'paid',payment_method:'cash',payment_reference:'QA-PAY',checked_in:false,checked_in_at:null};
const finance={from_date:'2026-08-01',to_date:'2026-08-26',currency:'PKR',gross_paid:'2100.00',refunded:'0.00',net_paid:'2100.00',transactions:[]};
const report={venue_name:'QA Venue',from_date:'2026-08-01',to_date:'2026-08-26',currency:'PKR',total_bookings:1,active_bookings:1,cancelled_bookings:0,booked_hours:1,checkins:0,gross_paid:'2100.00',refunded:'0.00',net_paid:'2100.00',available_court_hours:10,occupancy_percent:10};

async function mock(page: import('@playwright/test').Page,role:'manager'|'operator'){
 await page.addInitScript(()=>localStorage.setItem('sbp_padel_ops_token','ops-cancel-token'));
 await page.route('**/api/v1/operations/my-venues',r=>r.fulfill({json:[{id:venueId,name:'QA Venue',city:'Lahore',role}]}));
 await page.route('**/api/v1/operations/bookings?*',r=>r.fulfill({json:[booking]}));
 await page.route('**/api/v1/operations/blocks?*',r=>r.fulfill({json:[]}));
 await page.route('**/api/v1/operations/pricing-rules?*',r=>r.fulfill({json:[]}));
 await page.route('**/api/v1/operations/finance?*',r=>r.fulfill({json:finance}));
 await page.route('**/api/v1/operations/reports/summary?*',r=>r.fulfill({json:report}));
 await page.route('**/api/v1/operations/courts?*',r=>r.fulfill({json:[{id:courtId,code:'01',name:'Court 01',court_type:'Panoramic',status:'active',capacity:4,is_indoor:false}]}));
 await page.route('**/api/v1/venues/*/availability?*',r=>r.fulfill({json:{courts:[]}}));
}

test('manager sees cancellation action and utility routes retain full operations sidebar',async({page})=>{
 await mock(page,'manager');
 let cancelled=false;
 await page.route(`**/api/v1/operations/bookings/${booking.id}/cancel`,async r=>{cancelled=true;await r.fulfill({json:{id:booking.id,booking_code:booking.booking_code,status:'venue_cancelled',slots_released:true,refund_required:true,refund_status:'requested'}})});
 await page.goto('/');
 await page.locator('.nav button').filter({hasText:/^Bookings$/}).click();
 await page.locator('tbody tr').first().click();
 await expect(page.locator('.bookingDrawer')).toBeVisible();
 await expect(page.getByRole('button',{name:'CANCEL BOOKING'})).toBeVisible();
 await page.getByRole('button',{name:'CANCEL BOOKING'}).click();
 await expect(page.getByRole('heading',{name:`Cancel ${booking.booking_code}`})).toBeVisible();
 await page.getByRole('button',{name:'CONFIRM CANCELLATION'}).click();
 await expect.poll(()=>cancelled).toBeTruthy();

 await page.locator('.nav button').filter({hasText:/^Players$/}).click();
 await expect(page).toHaveURL(/\/players$/);
 const labels=['Court Schedule','Bookings','New Booking','Payments & Refunds','Bookable Hours & Pricing','Closures & Maintenance','Courts','Reports','Players','Scan Pass'];
 for(const label of labels)await expect(page.locator('.sidebar .nav button').filter({hasText:new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`)})).toBeVisible();
 await expect(page.locator('.sidebar .nav button.active')).toHaveText('Players');
 await page.locator('.sidebar .nav button').filter({hasText:/^Scan Pass$/}).click();
 await expect(page).toHaveURL(/\/scan-pass$/);
 await expect(page.locator('.sidebar .nav button.active')).toHaveText('Scan Pass');
 await expect(page.locator('.sidebar .nav button').filter({hasText:/^Payments & Refunds$/})).toBeVisible();
});

test('operator cannot cancel bookings',async({page})=>{
 await mock(page,'operator');
 await page.goto('/');
 await page.locator('.nav button').filter({hasText:/^Bookings$/}).click();
 await page.locator('tbody tr').first().click();
 await expect(page.locator('.bookingDrawer')).toBeVisible();
 await expect(page.getByRole('button',{name:'CANCEL BOOKING'})).toHaveCount(0);
});
