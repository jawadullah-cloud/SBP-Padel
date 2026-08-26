import {expect,test} from '@playwright/test';

const adminToken='qa-hq-token';

test('HQ Staff opens canonical staff page with reset password controls',async({page})=>{
 await page.addInitScript(token=>localStorage.setItem('sbp_padel_hq_token',token),adminToken);
 await page.route('**/api/v1/admin/**',async route=>{
  const url=route.request().url();
  if(url.endsWith('/admin/dashboard'))return route.fulfill({json:{venues:1,courts:2,players:3,confirmed_bookings:1,paid_revenue:'1000.00',pending_refunds:0,currency:'PKR'}});
  if(url.endsWith('/admin/venues'))return route.fulfill({json:[]});
  if(url.endsWith('/admin/bookings'))return route.fulfill({json:[]});
  if(url.endsWith('/admin/staff'))return route.fulfill({json:[{id:'staff-1',full_name:'Venue Manager',email:'manager@example.test',role:'venue_manager',is_active:true}]});
  if(url.endsWith('/admin/policies'))return route.fulfill({json:[]});
  if(url.endsWith('/admin/refunds-detailed'))return route.fulfill({json:[]});
  if(url.endsWith('/admin/role-permissions'))return route.fulfill({json:[]});
  return route.fulfill({status:404,json:{detail:'QA route not mocked'}});
 });

 await page.goto('/hq');
 const staffButton=page.locator('.hqHomeSidebar .hqNavGroup button',{hasText:'Staff'});
 await expect(staffButton).toBeVisible();
 await staffButton.click();
 await expect(page).toHaveURL(/\/hq\/staff$/);
 await expect(page.getByRole('heading',{name:'Staff Accounts'})).toBeVisible();
 await expect(page.getByRole('button',{name:'RESET PASSWORD'})).toBeVisible();
});

test('legacy HQ staff query also redirects to canonical staff page',async({page})=>{
 await page.addInitScript(token=>localStorage.setItem('sbp_padel_hq_token',token),adminToken);
 await page.route('**/api/v1/admin/staff',route=>route.fulfill({json:[]}));
 await page.goto('/hq?tab=staff');
 await expect(page).toHaveURL(/\/hq\/staff$/);
 await expect(page.getByRole('heading',{name:'Staff Accounts'})).toBeVisible();
});
