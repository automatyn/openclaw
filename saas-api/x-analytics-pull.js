// Connect to running openclaw-chrome via CDP, navigate to X analytics,
// extract verified numbers from the DOM. Patient: x.com is React-heavy.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:18800');
  const ctx = browser.contexts()[0];
  if (!ctx) { console.error('No context'); process.exit(1); }
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);

  console.log('Navigating to /i/account_analytics...');
  try {
    await page.goto('https://x.com/i/account_analytics', { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (e) {
    console.log('goto error (continuing):', e.message);
  }

  console.log('Waiting for content...');
  try {
    await page.waitForSelector('text=Impressions', { timeout: 25000 });
    console.log('Found "Impressions" label');
  } catch {
    console.log('Did not find Impressions in 25s — capturing whatever rendered');
  }
  await page.waitForTimeout(5000);

  await page.screenshot({ path: '/tmp/x-analytics.png', fullPage: true });
  console.log('Screenshot saved: /tmp/x-analytics.png');

  const data = await page.evaluate(() => {
    const text = document.body.innerText || '';
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    return { url: location.href, title: document.title, lines };
  });
  console.log('URL:', data.url);
  console.log('TITLE:', data.title);
  console.log('---LINES (first 120)---');
  for (const l of data.lines.slice(0, 120)) console.log(l);

  await page.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
