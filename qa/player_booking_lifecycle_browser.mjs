import { chromium } from 'playwright';

const base = process.env.SBP_PLAYER_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 412, height: 915 } });

const venue = {
  id: 'venue-1', name: 'Nishtar Park Sports Complex', city: 'Lahore', latitude: 31.511617, longitude: 74.337527,
  opening_time: '06:00', closing_time: '23:00', timezone: 'Asia/Karachi', description: 'Five professional padel courts.'
};
const courts = Array.from({ length: 5 }, (_, i) => ({ id: `court-${i + 1}`, code: `C0${i + 1}`, name: i === 0 ? 'Championship Court' : `Court 0${i + 1}`, court_type: i === 0 ? 'Championship' : 'Training', capacity: 4, is_indoor: false, status: 'active' }));
let booking = {
  id: 'booking-live-1', booking_code: 'PDL-LIFECYCLE', date: '2026-12-20', status: 'confirmed',
  venue_id: venue.id, court_id: 'court-4', court_fee: '2100.00', service_fee: '100.00', total: '2200.00', currency: 'PKR',
  slots: [{ start_time: '14:00', end_time: '15:00', rate: '2100.00' }]
};
let payment = { id: 'payment-live-1', booking_id: booking.id, status: 'paid', method: 'wallet', provider: 'development-simulator', provider_reference: 'PAY-LIFECYCLE', amount: '2200.00', currency: 'PKR' };
let refund = null;
let notifications = [];

const availability = date => ({
  venue_id: venue.id, venue_name: venue.name, date, timezone: venue.timezone,
  courts: courts.map(c => ({
    court_id: c.id, court_code: c.code, court_name: c.name, court_type: c.court_type,
    slots: ['13:00','14:00','15:00','16:00'].map(start => {
      const h = Number(start.slice(0,2));
      const booked = date === booking.date && c.id === booking.court_id && booking.slots.some(s => s.start_time === start) && !['cancelled','venue_cancelled'].includes(booking.status);
      return { start_time: start, end_time: `${String(h+1).padStart(2,'0')}:00`, available: !booked, hourly_rate: '2100.00', currency: 'PKR', unavailable_reason: booked ? 'Booked' : null };
    })
  }))
});

await page.route('http://127.0.0.1:8000/api/v1/**', async route => {
  const req = route.request();
  const url = new URL(req.url());
  const path = url.pathname.replace('/api/v1', '');
  let body = {};
  if (path === '/auth/me') body = { id: 'user-1', full_name: 'Runtime QA' };
  else if (path === '/venues') body = [venue];
  else if (path === `/venues/${venue.id}`) body = { ...venue, address: 'Lahore', amenities: ['Parking'], courts };
  else if (path === `/venues/${venue.id}/availability`) body = availability(url.searchParams.get('date'));
  else if (path === '/bookings/me') body = [{ id: booking.id, booking_code: booking.booking_code, date: booking.date, status: booking.status, court_id: booking.court_id, venue_id: booking.venue_id, total: booking.total, currency: booking.currency }];
  else if (path === `/bookings/${booking.id}` && req.method() === 'GET') body = booking;
  else if (path === `/payments/by-booking/${booking.id}`) body = payment;
  else if (path === '/payments/me') body = [{ ...payment, booking_code: booking.booking_code, booking_date: booking.date, payment_status: payment.status, created_at: new Date().toISOString(), refund }];
  else if (path === '/notifications/me') body = notifications;
  else if (path === `/bookings/${booking.id}/reschedule` && req.method() === 'POST') {
    const payload = req.postDataJSON();
    booking = { ...booking, date: payload.booking_date, status: 'rescheduled', slots: payload.slots.map(s => ({ start_time: s.start_time, end_time: `${String(Number(s.start_time.slice(0,2))+1).padStart(2,'0')}:00`, rate: '2100.00' })) };
    notifications.unshift({ id: 'n-reschedule', kind: 'booking_rescheduled', title: 'Booking rescheduled', body: `Booking ${booking.booking_code} has been moved.`, payload: { booking_id: booking.id }, read: false, created_at: new Date().toISOString() });
    body = booking;
  }
  else if (path === `/bookings/${booking.id}/cancel` && req.method() === 'POST') {
    booking = { ...booking, status: 'cancelled' };
    notifications.unshift({ id: 'n-cancel', kind: 'booking_cancelled', title: 'Booking cancelled', body: `Booking ${booking.booking_code} has been cancelled.`, payload: { booking_id: booking.id }, read: false, created_at: new Date().toISOString() });
    body = { id: booking.id, booking_code: booking.booking_code, status: 'cancelled', slots_released: true, refund_required: true, refund_status: 'awaiting_payment_provider' };
  }
  else if (path === `/payments/${payment.id}/refund` && req.method() === 'POST') {
    refund = { id: 'refund-live-1', status: 'requested', amount: payment.amount, currency: 'PKR', provider_reference: null, reason: 'Booking cancelled by player', created_at: new Date().toISOString() };
    notifications.unshift({ id: 'n-refund', kind: 'refund_requested', title: 'Refund requested', body: `Refund processing has started for booking ${booking.booking_code}.`, payload: { booking_id: booking.id }, read: false, created_at: new Date().toISOString() });
    body = { refund_id: refund.id, booking_id: booking.id, payment_id: payment.id, status: refund.status, amount: refund.amount, currency: refund.currency };
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});

await page.addInitScript(() => {
  localStorage.setItem('sbpPadelAccessToken', 'qa-token');
  localStorage.setItem('sbpPadelUser', JSON.stringify({ id: 'user-1', full_name: 'Runtime QA' }));
});

const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('nav [data-nav="bookings"]').click();
  await page.waitForFunction(() => document.getElementById('bookings')?.innerText.includes('PDL-LIFECYCLE'));
  assert((await page.locator('#bookings').innerText()).includes('CONFIRMED'), 'My Bookings did not render live confirmed status.');

  await page.locator('#bookings [data-live-manage="booking-live-1"]').click();
  await page.waitForSelector('#sbpDeepLayer.on');
  const frame = page.frameLocator('#sbpDeepFrame');
  await frame.locator('#id').waitFor();
  await frame.locator('#id').filter({ hasText: 'PDL-LIFECYCLE' }).waitFor();
  assert((await frame.locator('#statusPill').innerText()) === 'CONFIRMED', 'Booking detail did not hydrate the live status.');
  assert((await frame.locator('#transactionId').innerText()) === 'PAY-LIFECYCLE', 'Booking detail did not hydrate the real payment reference.');

  await frame.locator('#rescheduleBtn').click();
  await frame.locator('#rescheduleModal.show').waitFor();
  const dateButtons = frame.locator('#rescheduleModal .dates button');
  assert(await dateButtons.count() === 6, 'Reschedule did not offer six live date choices.');
  await dateButtons.nth(1).click();
  await frame.locator('#rescheduleModal .slots button').first().waitFor();
  await frame.locator('#rescheduleModal .slots button').first().click();
  await frame.locator('#confirmReschedule').click();
  await frame.locator('#rescheduleModal:not(.show)').waitFor();
  assert((await frame.locator('#statusPill').innerText()) === 'RESCHEDULED', 'Reschedule did not update booking status in the live detail UI.');
  assert((await frame.locator('#date').innerText()) !== 'Sunday, 20 Dec 2026', 'Reschedule did not update the booking date.');

  await frame.locator('#cancelBtn').click();
  await frame.locator('#cancelModal.show').waitFor();
  await frame.locator('#confirmCancel').click();
  await frame.locator('#cancelModal:not(.show)').waitFor();
  assert((await frame.locator('#statusPill').innerText()) === 'CANCELLED', 'Cancellation did not update the live booking detail.');
  await frame.locator('#refundState').waitFor();
  assert((await frame.locator('#refundState').innerText()).includes('REFUND REQUESTED'), 'Refund state was not tied to the live refund API result.');

  await frame.locator('.head .back').click();
  await page.waitForFunction(() => document.getElementById('bookings')?.classList.contains('active'));
  await page.waitForFunction(() => document.getElementById('bookings')?.innerText.includes('Cancelled (1)'));
  console.log('Player booking lifecycle browser QA passed.');
} finally {
  await browser.close();
}
