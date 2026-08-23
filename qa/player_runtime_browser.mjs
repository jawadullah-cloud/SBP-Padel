import { chromium } from 'playwright';

const base = process.env.SBP_PLAYER_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 412, height: 915 } });

const venue = {
  id: 'venue-1', name: 'Nishtar Park Sports Complex', latitude: 31.511617, longitude: 74.337527,
  opening_time: '06:00', closing_time: '23:00', timezone: 'Asia/Karachi'
};
const courts = Array.from({ length: 5 }, (_, i) => ({
  id: `court-${i + 1}`,
  court_id: `court-${i + 1}`,
  court_name: i === 0 ? 'Championship Court' : `Court 0${i + 1}`,
  court_type: i === 0 ? 'Championship' : 'Training',
  slots: [
    { start_time: '17:00', end_time: '18:00', available: true, hourly_rate: 2100 },
    { start_time: '18:00', end_time: '19:00', available: false, hourly_rate: 2100, unavailable_reason: 'Unavailable' },
    { start_time: '19:00', end_time: '20:00', available: true, hourly_rate: 2100 }
  ]
}));
let notifications = [{
  id: 'notification-1', kind: 'booking_confirmed', title: 'Booking confirmed',
  body: 'Your booking PDL-RUNTIME-QA has been confirmed.', read: false,
  created_at: new Date().toISOString()
}];

await page.route('http://127.0.0.1:8000/api/v1/**', async route => {
  const req = route.request();
  const url = new URL(req.url());
  const path = url.pathname.replace('/api/v1', '');
  let body;
  if (path === '/venues') body = [venue];
  else if (path === '/venues/venue-1') body = { ...venue, description: 'Five professional padel courts.', courts: courts.map(c => ({ id: c.id, name: c.court_name, court_type: c.court_type })) };
  else if (path === '/venues/venue-1/availability') body = { venue_id: venue.id, date: url.searchParams.get('date'), timezone: venue.timezone, courts };
  else if (path === '/bookings/quote') body = { venue: { id: venue.id, name: venue.name }, court: { id: 'court-4', name: 'Court 04', court_type: 'Training' }, slots: [{ start_time: '17:00', end_time: '18:00', rate: 2100 }], court_fee: 2100, service_fee: 100, total: 2200 };
  else if (path === '/notifications/me' && req.method() === 'GET') body = notifications;
  else if (path === '/notifications/me/read-all') { notifications = notifications.map(n => ({ ...n, read: true })); body = { updated: notifications.length }; }
  else if (path === '/notifications/notification-1/read') { notifications = notifications.map(n => ({ ...n, read: true })); body = { id: 'notification-1', read: true }; }
  else if (path === '/bookings/me') body = [];
  else if (path === '/auth/me') body = { id: 'user-1', full_name: 'Runtime QA' };
  else body = {};
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});

await page.addInitScript(() => {
  localStorage.setItem('sbpPadelAccessToken', 'qa-token');
  localStorage.setItem('sbpPadelUser', JSON.stringify({ id: 'user-1', full_name: 'Runtime QA' }));
});

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const active = async id => page.locator(`#${id}`).evaluate(el => el.classList.contains('active'));

try {
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  const build = await page.evaluate(() => window.__SBP_DEV_BUILD__);
  assert(build && build !== 'unknown', 'Dev runtime build provenance is missing.');

  await page.locator('nav [data-nav="profile"]').click();
  assert(await active('profile'), 'Profile did not open on first click.');
  const notificationsButton = page.locator('#profile .menu button').filter({ hasText: 'Notifications' });
  await notificationsButton.click();
  assert(await active('notifications'), 'Notifications did not open on first click.');
  await page.waitForSelector('#notifications .ntCard');
  const notificationText = await page.locator('#notifications').innerText();
  assert(notificationText.includes('PDL-RUNTIME-QA'), 'Live API notification was not rendered.');
  assert(!notificationText.includes('Your Championship Court booking at Nishtar Park is confirmed for 7:00 PM.'), 'Prototype notification leaked into live notifications.');
  await page.locator('#notifications .ntCard').click();
  assert((await page.locator('#notifications .ntCard').getAttribute('class'))?.includes('unread') === false, 'Notification did not mark read from the API.');
  await page.locator('#notifications .ntBack').click();
  await page.locator('nav [data-nav="home"]').click();

  await page.locator('#home .primary[data-nav="venues"]').click();
  assert(await active('venues'), 'Home → Book a Court did not navigate on first click.');

  await page.locator('#venues .venueLarge').click();
  assert(await active('nishtar'), 'Venue card did not navigate on first click.');

  await page.locator('#nishtar [data-nav="select"]').click();
  assert(await active('select'), 'Venue → booking selection did not navigate on first click.');

  await page.waitForSelector('#select .dateRail button[data-date]');
  const quickVisible = await page.locator('#select .dateRail button[data-date]:visible').count();
  const moreVisible = await page.locator('#select .dateRail .dateMoreButton:visible').count();
  assert(quickVisible === 6, `Expected 6 visible quick dates, got ${quickVisible}.`);
  assert(moreVisible === 1, `Expected one visible MORE control, got ${moreVisible}.`);

  await page.locator('#select .dateRail .dateMoreButton').click();
  await page.waitForSelector('#sbpDateSheet');
  const future = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 10); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
  await page.locator('#sbpDateSheet input[type="date"]').fill(future);
  await page.locator('#sbpDateSheet .apply').click();
  await page.waitForFunction(date => { try { return JSON.parse(localStorage.getItem('sbpPadelBookingSessionV2') || '{}').date === date; } catch { return false; } }, future);
  assert(await page.locator('#sbpDateSheet').count() === 0, 'MORE date sheet did not close after Apply.');

  const fourth = page.locator('#select .courtOption').filter({ hasText: 'Court 04' });
  await fourth.click();
  assert(await fourth.evaluate(el => el.classList.contains('selected')), 'Court 4 did not select on first click.');

  await page.locator('#select .bookingBottom .primary').click();
  assert(await active('time'), 'Booking Continue did not navigate to time selection on first click.');

  await page.waitForSelector('#time .slotRow');
  const unavailable = page.locator('#time .slotRow.booked').first();
  const visibleText = (await unavailable.innerText()).toUpperCase();
  assert((visibleText.match(/UNAVAILABLE/g) || []).length === 1, `Unavailable status rendered more than once: ${visibleText}`);

  await page.locator('#time .slotRow:not(.booked)').first().click();
  await page.locator('#time .bookingBottom .primary').click();
  await page.waitForSelector('#sbpDeepLayer.on');
  const frameSrc = await page.locator('#sbpDeepFrame').getAttribute('src');
  assert(frameSrc && frameSrc.includes('review-booking.html'), `Continue did not route to review on first click: ${frameSrc}`);

  console.log(`Player runtime browser QA passed on build ${build}.`);
} finally {
  await browser.close();
}
