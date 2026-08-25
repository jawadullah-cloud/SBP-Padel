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
  from_date: '2026-08-01',
  to_date: '2026-08-26',
  currency: 'PKR',
  gross_paid: '0.00',
  refunded: '0.00',
  net_paid: '0.00',
  transactions: [],
};

function report(name: string) {
  return {
    venue_name: name,
    from_date: '2026-08-01',
    to_date: '2026-08-26',
    currency: 'PKR',
    total_bookings: 0,
    active_bookings: 0,
    cancelled_bookings: 0,
    booked_hours: 0,
    checkins: 0,
    gross_paid: '0.00',
    refunded: '0.00',
    net_paid: '0.00',
    available_court_hours: 0,
    occupancy_percent: 0,
  };
}

async function mockOperations(page: import('@playwright/test').Page) {
  await page.addInitScript(() => localStorage.setItem('sbp_padel_ops_token', 'ops-browser-qa-token'));
  await page.route('**/api/v1/operations/my-venues', route => route.fulfill({ json: venues }));
  await page.route('**/api/v1/operations/bookings?*', route => route.fulfill({ json: [] }));
  await page.route('**/api/v1/operations/blocks?*', route => route.fulfill({ json: [] }));
  await page.route('**/api/v1/operations/pricing-rules?*', route => route.fulfill({ json: [] }));
  await page.route('**/api/v1/operations/finance?*', route => route.fulfill({ json: emptyFinance }));
  await page.route('**/api/v1/operations/reports/summary?*', route => {
    const id = new URL(route.request().url()).searchParams.get('venue_id');
    route.fulfill({ json: report(id === venueB ? 'Multan Padel Centre' : 'Lahore Padel Centre') });
  });
  await page.route('**/api/v1/operations/courts?*', async route => {
    const id = new URL(route.request().url()).searchParams.get('venue_id');
    if (id === venueA) await new Promise(resolve => setTimeout(resolve, 450));
    await route.fulfill({
      json: id === venueB
        ? [{ id: courtB, code: '02', name: 'Multan Court', court_type: 'Panoramic', status: 'active', capacity: 4, is_indoor: false }]
        : [{ id: courtA, code: '01', name: 'Lahore Court', court_type: 'Panoramic', status: 'active', capacity: 4, is_indoor: false }],
    });
  });
  await page.route('**/api/v1/operations/players/search?*', route => route.fulfill({
    json: [{ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', full_name: 'QA Player', email: 'qa.player@example.com', phone: '03001234567' }],
  }));
  await page.route('**/api/v1/venues/*/availability?*', route => {
    const url = route.request().url();
    const isB = url.includes(venueB);
    route.fulfill({
      json: {
        courts: [{
          court_id: isB ? courtB : courtA,
          court_name: isB ? 'Multan Court' : 'Lahore Court',
          court_type: 'Panoramic',
          slots: [{ start_time: '18:00', end_time: '19:00', available: true, unavailable_reason: null, hourly_rate: '2000.00', currency: 'PKR' }],
        }],
      },
    });
  });
}

test('staff login does not expose development credentials', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByPlaceholder('Email')).toHaveValue('');
  await expect(page.getByPlaceholder('Password')).toHaveValue('');
});

test('venue switch rejects stale responses and applies per-venue role permissions', async ({ page }) => {
  await mockOperations(page);
  await page.goto('/');

  const venueSelect = page.getByLabel('Active venue');
  const header = page.locator('header.top');
  await expect(venueSelect).toHaveValue(venueA);
  await venueSelect.selectOption(venueB);
  await expect(header.getByText('Multan Padel Centre · Multan', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Courts', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Multan Court', exact: true })).toBeVisible();
  await page.waitForTimeout(650);
  await expect(page.getByRole('heading', { name: 'Lahore Court', exact: true })).toHaveCount(0);
  await expect(page.getByText('View only', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Bookable Hours & Pricing', exact: true }).click();
  await expect(page.getByText('Operator access can view bookable hours and pricing but cannot change them.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ADD BOOKABLE HOURS', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Closures & Maintenance', exact: true }).click();
  await expect(page.getByText('Operator access is view-only for closures.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'CREATE CLOSURE', exact: true })).toHaveCount(0);

  await expect(page.getByRole('button', { name: 'MY ACCOUNT', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'MY ACCOUNT', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Change Password', exact: true })).toBeVisible();
});

test('front-desk selections are cleared when staff changes venue', async ({ page }) => {
  await mockOperations(page);
  await page.goto('/');

  const venueSelect = page.getByLabel('Active venue');
  const header = page.locator('header.top');
  await expect(venueSelect).toHaveValue(venueA);
  await page.getByRole('button', { name: 'New Booking', exact: true }).click();

  await page.getByPlaceholder('Name, email or phone').fill('QA Player');
  await page.getByRole('button', { name: 'SEARCH', exact: true }).click();
  await page.locator('.playerResults').getByRole('button').filter({ hasText: 'QA Player' }).click();
  await expect(page.locator('.selectedPlayerCard')).toContainText('QA Player');

  const courtSelect = page.getByLabel('Court');
  await expect(courtSelect.locator(`option[value="${courtA}"]`)).toHaveText(/Lahore Court/);
  await courtSelect.selectOption(courtA);
  await expect(courtSelect).toHaveValue(courtA);

  await venueSelect.selectOption(venueB);
  await expect(header.getByText('Multan Padel Centre · Multan', { exact: true })).toBeVisible();
  await expect(page.locator('.selectedPlayerCard')).toHaveCount(0);
  await expect(page.getByPlaceholder('Name, email or phone')).toHaveValue('');
  await expect(courtSelect).toHaveValue('');
  await expect(page.getByText('Select a registered player from the search results.', { exact: true })).toBeVisible();
});
