import { chromium } from 'playwright';

const playerEntry = process.env.SBP_STAGING_PLAYER_ENTRY;
const adminBase = process.env.SBP_STAGING_ADMIN_BASE;
const apiBase = process.env.SBP_STAGING_API_BASE;
const playerEmail = process.env.SBP_STAGING_PLAYER_EMAIL;
const playerPassword = process.env.SBP_STAGING_PLAYER_PASSWORD;
const adminEmail = process.env.SBP_STAGING_ADMIN_EMAIL;
const adminPassword = process.env.SBP_STAGING_ADMIN_PASSWORD;

for (const [name, value] of Object.entries({
  playerEntry,
  adminBase,
  apiBase,
  playerEmail,
  playerPassword,
  adminEmail,
  adminPassword,
})) {
  if (!value) throw new Error(`Missing required staging browser variable: ${name}`);
}

const browser = await chromium.launch({ headless: true });
try {
  const playerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const playerPage = await playerContext.newPage();
  const playerErrors = [];
  playerPage.on('pageerror', error => playerErrors.push(String(error)));
  playerPage.on('console', message => {
    if (message.type() === 'error') playerErrors.push(message.text());
  });

  await playerPage.goto(playerEntry, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await playerPage.waitForURL(/auth-preview\.html/, { timeout: 15_000 });
  const configuredApi = await playerPage.evaluate(() => localStorage.getItem('sbpPadelApiBase'));
  if (configuredApi !== apiBase) {
    throw new Error(`Player bootstrap API mismatch: ${configuredApi}`);
  }

  await playerPage.locator('#splash [data-go="signin"]').click();
  const signIn = playerPage.locator('#signin');
  await signIn.locator('input').nth(0).fill(playerEmail);
  await signIn.locator('input').nth(1).fill(playerPassword);
  await signIn.locator('[data-go="done"]').click();
  await playerPage.waitForURL(url => !url.pathname.endsWith('/auth-preview.html'), { timeout: 20_000 });
  await playerPage.waitForSelector('#home', { timeout: 20_000 });
  await playerPage.waitForFunction(() => document.body.innerText.includes('Nishtar Park Sports Complex'), null, { timeout: 20_000 });
  await playerPage.waitForFunction(() => document.body.innerText.includes('5 COURTS LIVE'), null, { timeout: 20_000 });
  const playerToken = await playerPage.evaluate(() => localStorage.getItem('sbpPadelAccessToken'));
  if (!playerToken) throw new Error('Player UI did not persist an authenticated access token.');
  if (playerErrors.length) throw new Error(`Player browser errors: ${playerErrors.join(' | ')}`);
  await playerContext.close();

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const adminPage = await adminContext.newPage();
  const adminErrors = [];
  adminPage.on('pageerror', error => adminErrors.push(String(error)));
  adminPage.on('console', message => {
    if (message.type() === 'error') adminErrors.push(message.text());
  });

  await adminPage.goto(adminBase, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await adminPage.getByPlaceholder('Email').fill(adminEmail);
  await adminPage.getByPlaceholder('Password').fill(adminPassword);
  await adminPage.getByRole('button', { name: 'SIGN IN' }).click();
  await adminPage.waitForFunction(() => document.body.innerText.includes('Nishtar Park Sports Complex'), null, { timeout: 20_000 });
  const operationsToken = await adminPage.evaluate(() => localStorage.getItem('sbp_padel_ops_token'));
  if (!operationsToken) throw new Error('Admin operations UI did not persist an authenticated access token.');

  await adminPage.goto(`${adminBase}/hq`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await adminPage.getByPlaceholder('Email').fill(adminEmail);
  await adminPage.getByPlaceholder('Password').fill(adminPassword);
  await adminPage.getByRole('button', { name: 'SIGN IN' }).click();
  await adminPage.waitForFunction(() => document.body.innerText.includes('Central Dashboard'), null, { timeout: 20_000 });
  await adminPage.waitForFunction(() => document.body.innerText.includes('Nishtar Park Sports Complex'), null, { timeout: 20_000 });
  const hqToken = await adminPage.evaluate(() => localStorage.getItem('sbp_padel_hq_token'));
  if (!hqToken) throw new Error('HQ UI did not persist an authenticated access token.');
  if (adminErrors.length) throw new Error(`Admin browser errors: ${adminErrors.join(' | ')}`);
  await adminContext.close();

  console.log('Deployed Player, Admin operations and HQ browser smoke passed.');
} finally {
  await browser.close();
}
