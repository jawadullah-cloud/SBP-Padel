const apiBase = process.env.SBP_STAGING_API_BASE;
const email = process.env.SBP_STAGING_PLAYER_EMAIL;
const password = process.env.SBP_STAGING_PLAYER_PASSWORD;
if (!apiBase || !email || !password) throw new Error('Missing staging booking lifecycle variables.');

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, options);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} returned ${response.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  return body;
}

const login = await request('/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identifier: email, password }),
});
const auth = { Authorization: `Bearer ${login.access_token}` };
const venues = await request('/venues');
const venue = venues.find(item => item.name === 'Nishtar Park Sports Complex');
if (!venue) throw new Error('Staging reference venue is missing.');
const venueDetail = await request(`/venues/${venue.id}`);
const courts = venueDetail.courts || [];
if (!courts.length) throw new Error('Staging reference venue has no courts.');
const policy = await request('/policies/active');
if (!policy?.id) throw new Error('Active staging policy has no id.');

function localIso(daysAhead) {
  const now = new Date(Date.now() + 5 * 60 * 60 * 1000);
  now.setUTCDate(now.getUTCDate() + daysAhead);
  return now.toISOString().slice(0, 10);
}

let choice = null;
for (let days = 3; days <= 8 && !choice; days += 1) {
  const bookingDate = localIso(days);
  const availability = await request(`/venues/${venue.id}/availability?date=${bookingDate}`);
  for (const courtAvailability of availability.courts || []) {
    const slot = (courtAvailability.slots || []).find(item => item.available && item.hourly_rate != null);
    if (slot) {
      choice = { bookingDate, courtId: courtAvailability.court_id, startTime: slot.start_time };
      break;
    }
  }
}
if (!choice) throw new Error('No staging slot was available for controlled lifecycle smoke.');

const bookingPayload = {
  venue_id: venue.id,
  court_id: choice.courtId,
  booking_date: choice.bookingDate,
  slots: [{ start_time: choice.startTime }],
  policy_version_id: policy.id,
  policy_accepted: true,
};
const quote = await request('/bookings/quote', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bookingPayload),
});
if (!quote.total || Number(quote.total) <= 0) throw new Error('Live staging quote did not return a positive total.');
const booking = await request('/bookings', {
  method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(bookingPayload),
});
if (booking.status !== 'pending_payment') throw new Error(`Expected pending_payment, received ${booking.status}`);

async function selectedSlot() {
  const availability = await request(`/venues/${venue.id}/availability?date=${choice.bookingDate}`);
  const court = (availability.courts || []).find(item => item.court_id === choice.courtId);
  return (court?.slots || []).find(item => item.start_time === choice.startTime);
}
const held = await selectedSlot();
if (!held || held.available !== false) throw new Error('Created booking did not make its selected slot unavailable.');

const mine = await request('/bookings/me', { headers: auth });
if (!mine.some(item => item.id === booking.id && item.status === 'pending_payment')) throw new Error('Created booking did not appear in Player booking history.');
const cancelled = await request(`/bookings/${booking.id}/cancel`, {
  method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Automated staging lifecycle cleanup' }),
});
if (cancelled.status !== 'cancelled' || cancelled.refund_required !== false) throw new Error('Unpaid staging cancellation did not follow the expected no-refund path.');
const released = await selectedSlot();
if (!released || released.available !== true) throw new Error('Cancelled booking did not release its selected slot.');

console.log(`Live staging booking lifecycle passed for ${choice.bookingDate}: quote -> hold -> booking history -> cancellation -> slot release.`);
