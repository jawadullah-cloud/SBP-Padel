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
let availabilityCalls = 0;
let availabilityDelayMs = 0;
let raceMode = false;
let raceCall = 0;
let notifications = [{
  id: 'notification-1', kind: 'booking_confirmed', title: 'Booking confirmed',
  body: 'Your booking PDL-RUNTIME-QA has been confirmed.', read: false,
  created_at: new Date().toISOString()
}];

const cloneCourts = () => courts.map(c => ({ ...c, slots: c.slots.map(s => ({ ...s })) }));
const availabilityBody = date => {
  availabilityCalls += 1;
  const freshCourts = cloneCourts();
  if (availabilityCalls >= 3) {
    const slot = freshCourts[3].slots.find(s => s.start_time === '17:00');
    slot.available = false;
    slot.unavailable_reason = 'Unavailable';
  }
  return { venue_id: venue.id, date, timezone: venue.timezone, courts: freshCourts };
};
const allUnavailableBody = date => ({
  venue_id: venue.id, date, timezone: venue.timezone,
  courts: cloneCourts().map(c => ({ ...c, slots: c.slots.map(s => ({ ...s, available: false, unavailable_reason: 'Unavailable' })) }))
});

await page.route('http://127.0.0.1:8000/api/v1/**', async route => {
  const req = route.request();
  const url = new URL(req.url());
  const path = url.pathname.replace('/api/v1', '');
  let body;
  if (path === '/venues') body = [venue];
  else if (path === '/venues/venue-1') body = { ...venue, description: 'Five professional padel courts.', courts: courts.map(c => ({ id: c.id, name: c.court_name, court_type: c.court_type })) };
  else if (path === '/venues/venue-1/availability') {
    if (raceMode) {
      raceCall += 1;
      if (raceCall === 1) {
        await new Promise(r => setTimeout(r, 280));
        body = allUnavailableBody(url.searchParams.get('date'));
      } else {
        await new Promise(r => setTimeout(r, 20));
        body = availabilityBody(url.searchParams.get('date'));
      }
    } else {
      if (availabilityDelayMs) await new Promise(r => setTimeout(r, availabilityDelayMs));
      body = availabilityBody(url.searchParams.get('date'));
    }
  }
  else if (path === '/bookings/quote') body = { venue: { id: venue.id, name: venue.name }, court: { id: 'court-4', name: 'Court 04', court_type: 'Training' }, slots: [{ start_time: '19:00', end_time: '20:00', rate: 2100 }], court_fee: 2100, service_fee: 100, total: 2200 };
  else if (path === '/notifications/me' && req.method() === 'GET') body = notifications;
  else if (path === '/notifications/me/read-all') { notifications = notifications.map(n => ({ ...n, read: true })); body = { updated: notifications.length }; }
  else if (path.startsWith('/notifications/') && path.endsWith('/read')) { const id=path.split('/')[2]; notifications = notifications.map(n => n.id===id ? ({ ...n, read: true }) : n); body = { id, read: true }; }
  else if (path === '/bookings/me') body = [];
  else if (path === '/auth/me') body = { id: 'user-1', full_name: 'Runtime QA' };
  else body = {};
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});

await page.addInitScript(() => {
  localStorage.setItem('sbpPadelAccessToken', 'qa-token');
  localStorage.setItem('sbpPadelUser', JSON.stringify({ id: 'user-1', full_name: 'Runtime QA' }));
  localStorage.setItem('sbpPadelBookingDatePicker', '2099-12-31');
  localStorage.setItem('sbpPadelFavouriteNishtar', '0');
});

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const active = async id => page.locator(`#${id}`).evaluate(el => el.classList.contains('active'));
const navVisible = async () => page.locator('nav').evaluate(el => {
  const s=getComputedStyle(el); const r=el.getBoundingClientRect();
  return s.opacity !== '0' && s.pointerEvents !== 'none' && r.height > 0 && r.bottom > 0;
});

try {
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  const build = await page.evaluate(() => window.__SBP_DEV_BUILD__);
  assert(build && build !== 'unknown', 'Dev runtime build provenance is missing.');
  assert(await page.evaluate(() => localStorage.getItem('sbpPadelBookingDatePicker')) === null, 'Legacy MORE date state was not cleared.');

  await page.locator('nav [data-nav="profile"]').click();
  assert(await active('profile'), 'Profile did not open on first click.');
  const notificationsButton = page.locator('#profile .menu button').filter({ hasText: 'Notifications' });
  await notificationsButton.click();
  assert(await active('notifications'), 'Notifications did not open on first click.');
  await page.waitForSelector('#notifications .ntCard');
  let notificationText = await page.locator('#notifications').innerText();
  assert(notificationText.includes('PDL-RUNTIME-QA'), 'Live API notification was not rendered.');
  assert(!notificationText.includes('Your Championship Court booking at Nishtar Park is confirmed for 7:00 PM.'), 'Prototype notification leaked into live notifications.');
  await page.locator('header .brand[data-nav="home"]').click();
  assert(await active('home'), 'SBP Padel logo did not return Home from Notifications.');
  assert(!(await active('notifications')), 'Notifications remained active after navigating Home from the header logo.');

  await page.locator('nav [data-nav="profile"]').click();
  await notificationsButton.click();
  await page.locator('#notifications .ntCard').first().click();
  await page.locator('#notifications .ntBack').click();

  notifications.unshift({
    id:'notification-2', kind:'booking_confirmed', title:'Booking confirmed',
    body:'Your booking PDL-NEW-BOOKING has been confirmed.', read:false,
    created_at:new Date().toISOString()
  });
  await page.evaluate(async()=>{await window.SBPRefreshNotifications?.()});
  await notificationsButton.click();
  await page.waitForFunction(()=>document.querySelector('#notifications')?.innerText.includes('PDL-NEW-BOOKING'));
  notificationText = await page.locator('#notifications').innerText();
  assert(notificationText.includes('PDL-NEW-BOOKING'), 'A newly created live notification did not appear after refresh.');
  await page.locator('#notifications .ntBack').click();
  await page.locator('nav [data-nav="home"]').click();

  await page.locator('#home .primary[data-nav="venues"]').click();
  assert(await active('venues'), 'Home → Book a Court did not navigate on first click.');
  await page.locator('#venues .venueLarge').click();
  assert(await active('nishtar'), 'Venue card did not navigate on first click.');
  assert(await navVisible(), 'Bottom navigation is hidden on the venue booking journey.');

  const heart = page.locator('#nishtar .heartBtn');
  assert(await heart.textContent() === '♡', 'Venue heart did not start in the unfavourited state.');
  await heart.click();
  assert(await heart.textContent() === '♥', 'Venue heart did not toggle to favourite on first click.');
  assert(await page.evaluate(() => localStorage.getItem('sbpPadelFavouriteNishtar')) === '1', 'Favourite venue state was not persisted.');
  await page.locator('nav [data-nav="profile"]').click();
  const favouriteButton = page.locator('#profile .menu button').filter({ hasText: 'Favourite Venues' });
  await favouriteButton.click();
  assert(await active('favouriteVenues'), 'Favourite Venues did not open.');
  assert((await page.locator('#favouriteVenues').innerText()).includes('Nishtar Park Sports Complex'), 'Favourited venue did not appear in Favourite Venues.');
  await page.locator('#favouriteVenues [data-pm-back]').click();
  await page.locator('nav [data-nav="venues"]').click();
  await page.locator('#venues .venueLarge').click();
  assert(await heart.textContent() === '♥', 'Favourite heart did not remain persisted after navigation.');

  await page.locator('#nishtar [data-nav="select"]').click();
  assert(await active('select'), 'Venue → booking selection did not navigate on first click.');
  assert(await navVisible(), 'Bottom navigation is hidden on court/date selection.');

  await page.waitForSelector('#select .dateRail button[data-date]');
  const selectedCourtsAtStart = await page.locator('#select .courtOption.selected').count();
  assert(selectedCourtsAtStart === 0, `A new booking auto-selected ${selectedCourtsAtStart} court(s).`);
  const selectedDate = await page.locator('#select .dateRail button[data-date].selected').getAttribute('data-date');
  const sessionDate = await page.evaluate(() => JSON.parse(localStorage.getItem('sbpPadelBookingSessionV2') || '{}').date);
  assert(selectedDate === sessionDate, `Visible booking date ${selectedDate} disagrees with session date ${sessionDate}.`);

  await page.locator('#select .bookingBottom .primary').click();
  assert(await active('select'), 'Booking advanced to Time without an explicit court selection.');

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

  availabilityDelayMs = 300;
  const started = Date.now();
  await page.locator('#select .bookingBottom .primary').click();
  await page.waitForFunction(() => document.getElementById('time')?.classList.contains('active'));
  assert(Date.now() - started < 220, 'Booking Continue waited for network availability instead of navigating on the first click.');
  availabilityDelayMs = 0;
  assert(await navVisible(), 'Bottom navigation is hidden on time selection.');
  await page.waitForSelector('#time .slotRow');

  const newlyTaken = page.locator('#time .slotRow[data-start="17:00"]');
  assert(await newlyTaken.evaluate(el => el.classList.contains('booked')), 'A slot booked after selection was not refreshed before showing usable time choices.');
  assert((await newlyTaken.innerText()).toUpperCase().includes('UNAVAILABLE'), 'Freshly booked slot was not rendered unavailable immediately.');

  raceMode = true; raceCall = 0;
  const r1 = page.evaluate(() => window.SBPBookingFlowSync());
  await page.waitForTimeout(10);
  const r2 = page.evaluate(() => window.SBPBookingFlowSync());
  await Promise.all([r1, r2]);
  raceMode = false;
  const availableAfterRace = await page.locator('#time .slotRow:not(.booked)').count();
  assert(availableAfterRace > 0, 'A stale all-unavailable response overwrote the newer availability response.');

  const unavailable = page.locator('#time .slotRow.booked').first();
  const visibleText = (await unavailable.innerText()).toUpperCase();
  assert((visibleText.match(/UNAVAILABLE/g) || []).length === 1, `Unavailable status rendered more than once: ${visibleText}`);

  await page.locator('#time .slotRow:not(.booked)').first().click();
  await page.locator('#time .bookingBottom .primary').click();
  await page.waitForSelector('#sbpDeepLayer.on');
  const frameSrc = await page.locator('#sbpDeepFrame').getAttribute('src');
  assert(frameSrc && frameSrc.includes('review-booking.html'), `Continue did not route to review on first click: ${frameSrc}`);

  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sbpPadelBookingSessionV2') || '{}');
    s.status = 'confirmed'; s.slotStarts = ['18:00'];
    localStorage.setItem('sbpPadelBookingSessionV2', JSON.stringify(s));
  });
  await page.evaluate(async () => { await window.SBPBookingFlowSync?.(); });
  const staleToast = await page.locator('#flowV2Toast').count() ? await page.locator('#flowV2Toast').innerText() : '';
  assert(!staleToast.includes('previously selected slots'), 'Normal booking confirmation produced the stale-selection toast.');

  console.log(`Player runtime browser QA passed on build ${build}.`);
} finally {
  await browser.close();
}