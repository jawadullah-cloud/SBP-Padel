import { expect, test } from '@playwright/test';

const venueId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const courtId='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const booking={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',booking_code:'PDL-OPS-CANCEL',date:'2026-09-18',status:'confirmed',court_id:courtId,court_code:'01',court_name:'Court 01',court_type:'Panoramic',player:{id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',full_name:'QA Player',email:'qa@example.com',phone:'03001234567'},slots:['18:00-19:00'],total:'2100.00',currency:'PKR',payment_status:'paid',payment_method:'cash',payment_reference:'QA-PAY',checked_in:false,checked_in_at:null};
const finance={from_date:'2026-08-01',to_date:'2026-08-26',currency:'PKR',gross_paid:'2100.00',refunded:'0.00',net_paid:'2100.00',transactions:[]};
const report={venue_name:'QA Venue',from_date:'2026-08-01',to_date:'2026-08-26',currency:'PKR',total_bookings:1,active_bookings:1,cancelled_bookings:0,booked_hours:1,checkins:0,gross_paid:'2100.00',refunded:'0.00',net_paid:'2100.00',available_court_hours:10,occupancy_percent:10};
const refund={id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',status:'requested',amount:'2100.00',currency:'PKR',reason:'Venue cancellation: operational closure',provider_reference:null,requested_at:'2026-08-26T12:00:00Z',booking:{id:booking.id,booking_code:booking.booking_code,date:booking.date,status:'venue_cancelled',cancelled_at:'2026-08-26T12:00:00Z',cancellation_reason:'Venue operational closure',slots:[{start:'18:00',end:'19:00'}],venue:'QA Venue',city:'Lahore',court:'Court 01',player_name:'QA Player',player_email:'qa@example.com',player_phone:'03001234567',checked_in:false,checked_in_at:null,first_start:'2026-09-18T18:00:00+05:00',hours_before_start:550,cutoff_hours:12},payment:{method:'cash',provider:'venue-front-desk',reference:'QA-PAY',amount:'2100.00',status:'paid'}};

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
 await page.route('**/api/v1/operations/refunds-detailed?*',r=>role==='manager'?r.fulfill({json:[refund]}):r.fulfill({status:403,json:{detail:'Manager access required'}}));
}

test('manager sees cancellation, refund management and one canonical utility sidebar',async({page})=>{
 await mock(page,'manager');
 let cancelled=false,processed=false;
 await page.route(`**/api/v1/operations/bookings/${booking.id}/cancel`,async r=>{cancelled=true;await r.fulfill({json:{id:booking.id,booking_code:booking.booking_code,status:'venue_cancelled',slots_released:true,refund_required:true,refund_status:'requested'}})});
 await page.route(`**/api/v1/operations/refunds/${refund.id}`,async r=>{processed=true;await r.fulfill({json:{id:refund.id,status:'processing'}})});
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
 const labels=['Court Schedule','Bookings','New Booking','Payments & Refunds','Bookable Hours & Pricing','Closures & Maintenance','Courts','Reports','Refund Management','Players','Scan Pass'];
 for(const label of labels)await expect(page.locator('.sidebar .nav button').filter({hasText:new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`)})).toBeVisible();
 await expect(page.locator('.sidebar .nav > a:visible')).toHaveCount(0);
 await expect(page.locator('.sidebar .nav button')).toHaveCount(11);
 await expect(page.locator('.sidebar .nav button.active')).toHaveText('Players');
 await expect(page.locator('.sidebar .sideFoot')).toContainText('MANAGER');
 await expect(page.getByRole('button',{name:'Sign out'})).toBeVisible();
 await expect(page.locator('.sidebar .sideFoot')).not.toContainText('PLAYER DIRECTORY');

 await page.locator('.sidebar .nav button').filter({hasText:/^Scan Pass$/}).click();
 await expect(page).toHaveURL(/\/scan-pass$/);
 await expect(page.locator('.sidebar .nav > a:visible')).toHaveCount(0);
 await expect(page.locator('.sidebar .nav button')).toHaveCount(11);
 await expect(page.locator('.sidebar .nav button.active')).toHaveText('Scan Pass');
 await expect(page.locator('.sidebar .sideFoot')).toContainText('MANAGER');
 await expect(page.locator('.sidebar .sideFoot')).not.toContainText('PASS VALIDATION');

 await page.locator('.sidebar .nav button').filter({hasText:/^Refund Management$/}).click();
 await expect(page).toHaveURL(/\/refunds$/);
 await expect(page.getByRole('heading',{name:'Refund Management'})).toBeVisible();
 await expect(page.locator('.sidebar .nav > a:visible')).toHaveCount(0);
 await expect(page.locator('.sidebar .nav button.active')).toHaveText('Refund Management');
 await expect(page.getByText(booking.booking_code)).toBeVisible();
 await page.locator('.refundManagerSummary').click();
 await expect(page.getByText('Venue operational closure')).toBeVisible();
 await expect(page.getByText(/12 hours/)).toBeVisible();
 await page.getByRole('button',{name:'APPROVE / PROCESS'}).click();
 await expect.poll(()=>processed).toBeTruthy();
});

test('operator cannot cancel or access refund management',async({page})=>{
 await mock(page,'operator');
 await page.goto('/');
 await page.locator('.nav button').filter({hasText:/^Bookings$/}).click();
 await page.locator('tbody tr').first().click();
 await expect(page.locator('.bookingDrawer')).toBeVisible();
 await expect(page.getByRole('button',{name:'CANCEL BOOKING'})).toHaveCount(0);
 await expect(page.locator('.sidebar .nav button').filter({hasText:/^Refund Management$/})).toHaveCount(0);
 await page.goto('/refunds');
 await expect(page.getByText('Refund Management is available to venue managers only.')).toBeVisible();
});
