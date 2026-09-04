import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const playerEntry = process.env.SBP_STAGING_PLAYER_ENTRY;
const adminBase = process.env.SBP_STAGING_ADMIN_BASE;
const apiBase = process.env.SBP_STAGING_API_BASE;
const playerEmail = process.env.SBP_STAGING_PLAYER_EMAIL;
const playerPassword = process.env.SBP_STAGING_PLAYER_PASSWORD;
const adminEmail = process.env.SBP_STAGING_ADMIN_EMAIL;
const adminPassword = process.env.SBP_STAGING_ADMIN_PASSWORD;
const diagnosticsDir = path.resolve('test-results');

for (const [name, value] of Object.entries({ playerEntry, adminBase, apiBase, playerEmail, playerPassword, adminEmail, adminPassword })) {
  if (!value) throw new Error(`Missing required staging browser variable: ${name}`);
}

await fs.mkdir(diagnosticsDir, { recursive: true });

async function dumpPage(page, name, events = []) {
  const safe = name.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  const state = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    bodyText: document.body?.innerText || '',
    apiBase: localStorage.getItem('sbpPadelApiBase'),
    hasPlayerToken: Boolean(localStorage.getItem('sbpPadelAccessToken')),
    hasOpsToken: Boolean(localStorage.getItem('sbp_padel_ops_token')),
    hasHqToken: Boolean(localStorage.getItem('sbp_padel_hq_token')),
    serviceWorkerController: Boolean(navigator.serviceWorker?.controller),
  }));
  await fs.writeFile(path.join(diagnosticsDir, `${safe}-state.json`), JSON.stringify({ state, events }, null, 2));
  await fs.writeFile(path.join(diagnosticsDir, `${safe}.html`), await page.content());
  await page.screenshot({ path: path.join(diagnosticsDir, `${safe}.png`), fullPage: true });
}

function observe(page, events) {
  page.on('pageerror', error => events.push({ type: 'pageerror', message: String(error) }));
  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'warning') events.push({ type: `console-${message.type()}`, message: message.text() });
  });
  page.on('requestfailed', request => events.push({ type: 'requestfailed', url: request.url(), method: request.method(), failure: request.failure()?.errorText || null }));
  page.on('response', response => {
    if (response.url().startsWith(apiBase)) events.push({ type: 'api-response', url: response.url(), status: response.status() });
  });
}

const browser = await chromium.launch({ headless: true });
try {
  const playerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const playerPage = await playerContext.newPage();
  const playerEvents = [];
  observe(playerPage, playerEvents);

  try {
    await playerPage.goto(playerEntry, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await playerPage.waitForURL(/auth-preview\.html/, { timeout: 15_000 });
    const configuredApi = await playerPage.evaluate(() => localStorage.getItem('sbpPadelApiBase'));
    if (configuredApi !== apiBase) throw new Error(`Player bootstrap API mismatch: ${configuredApi}`);
    await playerPage.locator('#splash [data-go="signin"]').click();
    const signIn = playerPage.locator('#signin');
    await signIn.locator('input').nth(0).fill(playerEmail);
    await signIn.locator('input').nth(1).fill(playerPassword);
    const loginResponsePromise = playerPage.waitForResponse(r => r.url() === `${apiBase}/auth/login`, { timeout: 20_000 });
    await signIn.locator('[data-go="done"]').click();
    const loginResponse = await loginResponsePromise;
    if (loginResponse.status() !== 200) throw new Error(`Player UI login returned HTTP ${loginResponse.status()}`);
    await playerPage.waitForURL(url => !url.pathname.endsWith('/auth-preview.html'), { timeout: 20_000 });
    await playerPage.waitForSelector('#home', { timeout: 20_000 });
    await playerPage.waitForFunction(() => document.body.innerText.includes('Nishtar Park Sports Complex'), null, { timeout: 20_000 });
    await playerPage.waitForFunction(() => document.body.innerText.includes('Court 05'), null, { timeout: 20_000 });
    const successfulVenueResponses = playerEvents.filter(event => event.type === 'api-response' && event.status === 200 && event.url.startsWith(`${apiBase}/venues`));
    if (!successfulVenueResponses.length) throw new Error('Player UI did not successfully hydrate venue data from the staging API.');
    const playerToken = await playerPage.evaluate(() => localStorage.getItem('sbpPadelAccessToken'));
    if (!playerToken) throw new Error('Player UI did not persist an authenticated access token.');
    const hardErrors = playerEvents.filter(event => event.type === 'pageerror' || event.type === 'console-error' || event.type === 'requestfailed');
    if (hardErrors.length) throw new Error(`Player browser errors: ${JSON.stringify(hardErrors)}`);
  } catch (error) {
    await dumpPage(playerPage, 'player-failure', playerEvents);
    throw error;
  } finally {
    await playerContext.close();
  }

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const adminPage = await adminContext.newPage();
  const adminEvents = [];
  observe(adminPage, adminEvents);

  try {
    // Next.js can paint the server-rendered sign-in form before client event handlers
    // are hydrated. networkidle prevents a synthetic click from racing those chunks.
    await adminPage.goto(adminBase, { waitUntil: 'networkidle', timeout: 30_000 });
    await adminPage.getByPlaceholder('Email').fill(adminEmail);
    await adminPage.getByPlaceholder('Password').fill(adminPassword);
    await adminPage.getByRole('button', { name: 'SIGN IN' }).click();
    await adminPage.waitForFunction(() => document.body.innerText.includes('Nishtar Park Sports Complex'), null, { timeout: 20_000 });
    const operationsToken = await adminPage.evaluate(() => localStorage.getItem('sbp_padel_ops_token'));
    if (!operationsToken) throw new Error('Admin operations UI did not persist an authenticated access token.');

    adminEvents.length = 0;
    await adminPage.goto(`${adminBase}/hq`, { waitUntil: 'networkidle', timeout: 30_000 });
    await adminPage.getByPlaceholder('Email').fill(adminEmail);
    await adminPage.getByPlaceholder('Password').fill(adminPassword);
    await adminPage.getByRole('button', { name: 'SIGN IN' }).click();
    await adminPage.waitForFunction(() => document.body.innerText.includes('Central Dashboard'), null, { timeout: 20_000 });
    await adminPage.waitForFunction(() => document.body.innerText.includes('5\nCourts'), null, { timeout: 20_000 });
    const hqToken = await adminPage.evaluate(() => localStorage.getItem('sbp_padel_hq_token'));
    if (!hqToken) throw new Error('HQ UI did not persist an authenticated access token.');
    const dashboardOk = adminEvents.some(event => event.type === 'api-response' && event.status === 200 && event.url === `${apiBase}/admin/dashboard`);
    if (!dashboardOk) throw new Error('HQ UI did not successfully load the staging admin dashboard API.');
    const hardErrors = adminEvents.filter(event => event.type === 'pageerror' || event.type === 'console-error' || event.type === 'requestfailed');
    if (hardErrors.length) throw new Error(`Admin browser errors: ${JSON.stringify(hardErrors)}`);
  } catch (error) {
    await dumpPage(adminPage, 'admin-failure', adminEvents);
    throw error;
  } finally {
    await adminContext.close();
  }

  console.log('Deployed Player, Admin operations and HQ browser smoke passed.');
} finally {
  await browser.close();
}
