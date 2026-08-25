import { expect, test } from '@playwright/test';

const venues = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Padel Tennis Complex Multan',
    city: 'Multan',
    address: 'Multan Sports Complex',
    latitude: '30.1575',
    longitude: '71.5249',
    description: 'Multan venue',
    amenities: ['Parking'],
    opening_time: '06:00',
    closing_time: '23:00',
    is_active: true,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Padel Tennis Complex Rawalpindi',
    city: 'Rawalpindi',
    address: 'Rawalpindi Sports Complex',
    latitude: '33.5651',
    longitude: '73.0169',
    description: 'Rawalpindi venue',
    amenities: ['Floodlights'],
    opening_time: '07:00',
    closing_time: '22:00',
    is_active: true,
  },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sbp_padel_hq_token', 'hq-route-test-token'));
  await page.route('**/api/v1/admin/venues', route => route.fulfill({ json: venues }));
  await page.route('**/api/v1/admin/venues/*/courts', route => route.fulfill({ json: [] }));
  await page.route('**/api/v1/admin/staff', route => route.fulfill({ json: [] }));
  await page.route('**/api/v1/admin/staff-assignments', route => route.fulfill({ json: [] }));
  await page.route('**/api/v1/admin/pricing-rules?*', route => route.fulfill({ json: [] }));
});

for (const venue of venues) {
  test(`preserves ${venue.city} venue context from directory to profile and back`, async ({ page }) => {
    await page.goto('/hq/provisioning');
    const tile = page.locator('.hqVenueTile').filter({ hasText: venue.name });
    await expect(tile).toBeVisible();

    const manageFromDirectory = tile.getByRole('link', { name: 'MANAGE VENUE' });
    const editFromDirectory = tile.getByRole('link', { name: 'EDIT PROFILE & AMENITIES' });
    await expect(manageFromDirectory).toHaveAttribute('href', `/hq/provisioning/manage?venue=${venue.id}`);
    await expect(editFromDirectory).toHaveAttribute('href', `/hq/provisioning/profile?venue=${venue.id}`);

    await editFromDirectory.click();
    await expect(page).toHaveURL(new RegExp(`/hq/provisioning/profile\\?venue=${venue.id}$`));
    await expect(page.getByPlaceholder('Venue name')).toHaveValue(venue.name);

    const backToManage = page.getByRole('link', { name: /VENUE MANAGEMENT/ });
    await expect(backToManage).toHaveAttribute('href', `/hq/provisioning/manage?venue=${venue.id}`);
    await expect(page.getByRole('link', { name: 'ALL VENUES' })).toHaveAttribute('href', '/hq/provisioning');

    await backToManage.click();
    await expect(page).toHaveURL(new RegExp(`/hq/provisioning/manage\\?venue=${venue.id}$`));
    await expect(page.getByRole('heading', { name: venue.name, exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'FACILITY PHOTOS' })).toHaveAttribute('href', `/hq/provisioning/gallery?venue=${venue.id}`);
  });
}
