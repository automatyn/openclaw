// Connect to running openclaw-chrome via CDP, navigate to TTrimoreau profile,
// pull last ~30 tweets with engagement data so we can see what format works.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:18800');
  const ctx = browser.contexts()[0];
  if (!ctx) { console.error('no context'); process.exit(1); }
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);

  console.log('Navigating to TTrimoreau...');
  try {
    await page.goto('https://x.com/TTrimoreau', { waitUntil: 'domcontentloaded', timeout: 45000 });
  } catch (e) { console.log('goto err:', e.message); }
  try {
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 25000 });
  } catch {}
  await page.waitForTimeout(3000);
  // Scroll
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.scrollBy(0, 1500));
    await page.waitForTimeout(1200);
  }
  await page.screenshot({ path: '/tmp/x-trimoreau.png', fullPage: false });

  const tweets = await page.evaluate(() => {
    const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
    return articles.slice(0, 30).map(a => {
      const text = (a.querySelector('[data-testid="tweetText"]')?.innerText || '').slice(0, 600);
      const timeEl = a.querySelector('time');
      const time = timeEl?.getAttribute('datetime') || null;
      // Engagement counts: each metric button has aria-label
      const groupAria = a.querySelector('[role="group"]')?.getAttribute('aria-label') || '';
      const replyAuthor = (a.innerText.match(/Replying to\s*@(\w+)/) || [])[1] || null;
      const isRepost = !!a.querySelector('[data-testid="socialContext"]');
      const hasImage = !!a.querySelector('[data-testid="tweetPhoto"]');
      const isThread = a.innerText.includes('Show this thread') || a.innerText.split('\n').length > 6;
      return { time, text, groupAria, replyAuthor, isRepost, hasImage, isThread };
    });
  });
  console.log(`---PARSED ${tweets.length} TWEETS---`);
  for (const [i, t] of tweets.entries()) {
    const type = t.isRepost ? 'RT' : (t.replyAuthor ? `@${t.replyAuthor}` : (t.isThread ? 'THREAD' : 'OP'));
    const img = t.hasImage ? '🖼' : '  ';
    console.log(`${i + 1}. ${(t.time||'').slice(0,16)} ${img} ${type.padEnd(15)} | ${t.groupAria.slice(0,90)}`);
    console.log(`   ${t.text.replace(/\n/g, ' / ').slice(0, 130)}`);
  }
  await page.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
