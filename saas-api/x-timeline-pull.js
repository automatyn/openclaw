// Scrape your own X timeline via the logged-in openclaw-chrome session.
// Visits x.com/patrickssons, scrolls to load ~30 tweets, extracts metrics from each.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:18800');
  const ctx = browser.contexts()[0];
  if (!ctx) { console.error('no context'); process.exit(1); }
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);

  console.log('Navigating to /patrickssons...');
  try {
    await page.goto('https://x.com/patrickssons', { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (e) { console.log('goto err:', e.message); }

  // Wait for tweets
  try {
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 25000 });
    console.log('Tweets visible');
  } catch {
    console.log('No tweets selector after 25s, capturing anyway');
  }
  await page.waitForTimeout(3000);

  // Scroll to load ~30 tweets
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.scrollBy(0, 1200));
    await page.waitForTimeout(1500);
  }
  console.log('scrolled, capturing');

  await page.screenshot({ path: '/tmp/x-timeline.png', fullPage: false });

  const tweets = await page.evaluate(() => {
    const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
    return articles.map(a => {
      const text = (a.querySelector('[data-testid="tweetText"]')?.innerText || '').slice(0, 200);
      // Time
      const timeEl = a.querySelector('time');
      const time = timeEl?.getAttribute('datetime') || null;
      // URL — the link wrapping the time
      const linkEl = timeEl?.closest('a');
      const url = linkEl?.href || null;
      // Counts: each metric is a button with aria-label like "29 replies, ..."
      const ariaTexts = Array.from(a.querySelectorAll('[aria-label]')).map(e => e.getAttribute('aria-label')).filter(Boolean);
      const stats = ariaTexts.find(t => /views/i.test(t)) || '';
      // Reply / quote indicator: "Replying to" text or "@" prefix
      const replyingTo = a.querySelector('[data-testid="reply"]') ? null : null;
      const replyAuthor = (a.innerText.match(/Replying to\s*@(\w+)/) || [])[1] || null;
      // Repost
      const isRepost = !!a.querySelector('[data-testid="socialContext"]');
      return { time, url, text, stats, replyAuthor, isRepost };
    });
  });

  console.log('---TWEETS PARSED:', tweets.length, '---');
  for (const [i, t] of tweets.entries()) {
    const type = t.isRepost ? 'RT' : (t.replyAuthor ? `@${t.replyAuthor}` : 'OP');
    console.log(`${i + 1}. ${t.time?.slice(0, 16) || '???'} | ${type.padEnd(20)} | ${t.stats || '(no stats)'}`);
    console.log(`   ${t.text.replace(/\n/g, ' ').slice(0, 130)}`);
  }

  await page.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
