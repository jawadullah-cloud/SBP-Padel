import { expect, test } from '@playwright/test';

const venueA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const venueB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const courtA = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const courtB = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';

const venues = [
  { id: venueA, name: 'Lahore Padel Centre', city: 'Lahore', role: 'manager' },
  { id: venueB, name: 'Multan Padel Centre', city: 'Multan', role: 'operator' },
];

const emptyFinance = {
  from_date: '2026-08-01', to_date: '2026-08-26', currency: 'PKR',
  gross_paid: '0.00', refunded: '0.00', net_paid: '0.00', transactions: [],
};
const report = (name: string) => ({
  venue_name: name, from_date: '2026-08-01', to_date: '2026-08-26', currency: 'PKR',
  total_bookings: 0, active_bookings: 0, cancelled_bookings: 0, booked_hours: 0,
  checkins: 0, gross_paid: '0.00', refunded: '0.00', net_paid: '0.00',
  available_court_hours: 0, occupancy_percent: 0,
});

async function mockOperations(page: import('@playwright/test').Page) {
  await page.addInitScript(() => localStorage.setItem('sbp_padel_ops_token', 'ops-browser-qa-token'));
  await page.route('**/api/v1/operations/my-venues', r => r.fulfill({ json: venues }));
  await page.route('**/api/v1/operations/bookings?*', r => r.fulfill({ json: [] }));
  await page.route('**/api/v1/operations/blocks?*', r => r.fulfill({ json: [] }));
  await page.route('**/api/v1/operations/pricing-rules?*', r => r.fulfill({ json: [] }));
  await page.route('**/api/v1/operations/finance?*', r => r.fulfill({ json: emptyFinance }));
  await page.route('**/api/v1/operations/reports/summary?*', r => {
    const id = new URL(r.request().url()).searchParams.get('venue_id');
    return r.fulfill({ json: report(id === venueB ? 'Multan Padel Centre' : 'Lahore Padel Centre') });
  });
  await page.route('**/api/v1/operations/courts?*', async r => {
    const id = new URL(r.request().url()).searchParams.get('venue_id');
    if (id === venueA) await new Promise(resolve => setTimeout(resolve, 500));
    return r.fulfill({ json: id === venueB
      ? [{ id: courtB, code: '02', name: 'Multan Court', court_type: 'Panoramic', status: 'active', capacity: 4, is_indoor: false }]
      : [{ id: courtA, code: '01', name: 'Lahore Court', court_type: 'Panoramic', status: 'active', capacity: 4, is_indoor: false }]
    });
  });
  await page.route('**/api/v1/operations/players/search?*', r => r.fulfill({ json: [
    { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', full_name: 'QA Player', email: 'qa.player@example.com', phone: '03001234567' },
  ] }));
  await page.route('**/api/v1/venues/*/availability?*', r => {
    const isB = r.request().url().includes(venueB);
    return r.fulfill({ json: { courts: [{
      court_id: isB ? courtB : courtA, court_name: isB ? 'Multan Court' : 'Lahore Court',
      court_type: 'Panoramic', slots: [{ start_time: '18:00', end_time: '19:00', available: true,
        unavailable_reason: null, hourly_rate: '2000.00', currency: 'PKR' }],
    }] } });
  });
}

test('staff login has no embedded development credentials', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.loginCard input').nth(0)).toHaveValue('');
  await expect(page.locator('.loginCard input').nth(1)).toHaveValue('');
});

test('selected venue wins over stale responses and operator controls stay read-only', async ({ page }) => {
  await mockOperations(page);
  await page.goto('/');
  const venueSelect = page.locator('header.top select[aria-label="Active venue"]');
  await expect(venueSelect).toHaveValue(venueA);
  await venueSelect.selectOption(venueB);
  await expect(page.locator('header.top p')).toHaveText('Multan Padel Centre · Multan');

  await page.locator('.nav button').filter({ hasText: /^Courts$/ }).click();
  await expect(page.locator('.courtCard h3')).toHaveText('Multan Court');
  await page.waitForTimeout(700);
  await expect(page.locator('.courtCard h3')).toHaveText('Multan Court');
  await expect(page.locator('.courtCard .readOnly')).toHaveText('View only');

  await page.locator('.nav button').filter({ hasText: /^Bookable Hours & Pricing$/ }).click();
  await expect(page.locator('.priceForm .readOnly')).toContainText('Operator access can view');
  await expect(page.locator('.priceForm button').filter({ hasText: 'ADD BOOKABLE HOURS' })).toHaveCount(0);

  await page.locator('.nav button').filter({ hasText: /^Closures & Maintenance$/ }).click();
  await expect(page.locator('.closureForm .readOnly')).toContainText('Operator access is view-only');
  await expect(page.locator('.closureForm button').filter({ hasText: 'CREATE CLOSURE' })).toHaveCount(0);

  await expect(page.locator('.staffAccountLauncher')).toBeVisible();
  await page.locator('.staffAccountLauncher').click();
  await expect(page.locator('.accountCard h2')).toHaveText('Change Password');
});

test('venue switch clears front-desk player selection', async ({ page }) => {
  await mockOperations(page);
  await page.goto('/');
  const venueSelect = page.locator('header.top select[aria-label="Active venue"]');
  await expect(venueSelect).toHaveValue(venueA);
  await page.locator('.nav button').filter({ hasText: /^New Booking$/ }).click();

  await page.locator('input[placeholder="Name, email or phone"]').fill('QA Player');
  await page.locator('.inlineField button').click();
  await expect(page.locator('.playerResults button')).toHaveCount(1);
  await page.locator('.playerResults button').click();
  await expect(page.locator('.selectedPlayerCard')).toContainText('QA Player');

  await venueSelect.selectOption(venueB);
  await expect(page.locator('header.top p')).toHaveText('Multan Padel Centre · Multan');
  await expect(page.locator('.selectedPlayerCard')).toHaveCount(0);
  await expect(page.locator('input[placeholder="Name, email or phone"]')).toHaveValue('');
  await expect(page.locator('.formGrid select').first()).toHaveValue('');
  await expect(page.locator('.sectionNote').filter({ hasText: 'Select a registered player from the search results.' })).toBeVisible();
});

test('Players and Scan Pass keep the complete operations navigation and return without login flash', async ({ page }) => {
  await mockOperations(page);
  await page.goto('/');
  await expect(page.locator('header.top h1')).toHaveText('Court Schedule');
  await page.locator('.nav button').filter({ hasText: /^Players$/ }).click();
  await expect(page).toHaveURL(/\/players$/);

  for (const label of ['Court Schedule','Bookings','New Booking','Payments & Refunds','Bookable Hours & Pricing','Closures & Maintenance','Courts','Reports','Scan Pass']) {
    await expect(page.locator('.nav button').filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`) })).toBeVisible();
  }

  await page.locator('.nav button').filter({ hasText: /^Payments & Refunds$/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.loginCard')).toHaveCount(0);
  await expect(page.locator('header.top h1')).toHaveText('Payments & Refunds');

  await page.locator('.nav button').filter({ hasText: /^Scan Pass$/ }).click();
  await expect(page).toHaveURL(/\/scan-pass$/);
  for (const label of ['Court Schedule','Bookings','New Booking','Payments & Refunds','Bookable Hours & Pricing','Closures & Maintenance','Courts','Reports']) {
    await expect(page.locator('.nav button').filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`) })).toBeVisible();
  }

  await page.getByRole('link', { name: /Back to Operations/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.loginCard')).toHaveCount(0);
  await expect(page.locator('header.top h1')).toBeVisible();
});
