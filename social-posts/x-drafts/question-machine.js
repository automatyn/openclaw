#!/usr/bin/env node
// One-line provocative question post generator. Fires twice daily (12:00 + 18:00 UTC).
// Posts on Pat's profile (highest follower-conversion). Verified format from
// @TTrimoreau-style accounts: short, opinionated, ends in question or implied question.
// Rotates 30 questions × 2 slots per day so no repeats for ~15 days.

const crypto = require('crypto');

const TG_TOKEN = '8726414142:AAFQr-8dHxws5g9zZpu6IbjhmoN7b7lf8qc';
const TG_CHAT = '5904617085';

// 60 question-style posts, all on-Automatyn-objective. Two shapes mixed:
//
//  A) Single-line provocative question (Trimoreau format, e.g. "What makes a startup uncopyable?")
//  B) Multi-line option-list question (rxhit05 format, e.g. "What's worse for founders? -X -Y -Z")
//
// Both shapes pull high reply-ratio, which the algo amplifies (reply 13.5x, OP-reply-back 150x
// per reference_x_algorithm.md). All under 280 chars, no em-dashes, no banned words.
// Audience: small business / SMB / founder / service business — broad, not UK-trade-specific.
const QUESTIONS = [
  // Single-line questions (Trimoreau-style)
  "What's the first job AI actually takes from a small business? My bet: the after-hours phone, before anything 'creative.'",
  "Why do small businesses still send booking confirmations by email when WhatsApp opens 4x more?",
  "How much do you think a small business loses per missed call? Most owners can't even guess.",
  "If 78% of customers go with whoever replies first, why do most companies reply in 4 hours?",
  "What's the actual ROI on hiring a £30k/yr receptionist vs a £30/mo AI? I keep doing this math and it gets uglier.",
  "Why is 'speed of reply' the only marketing metric nobody tracks? It's also the most predictive.",
  "Honest question: when did you last call a business after 6pm and actually get an answer?",
  "What's the cheapest customer-acquisition channel for a small business? Hint: not Google Ads.",
  "Why do most companies spend more on ads than on the people who actually answer the phone?",
  "Founders: how many bookings did you lose last month because nobody answered fast enough?",
  "What's the boring SaaS unlock nobody talks about? Picking up at 11pm without paying overtime.",
  "Why does every founder optimize the top of the funnel and ignore the second touch?",
  "If 80% of sales need 5+ follow-ups and 44% of salespeople give up after 1, where's the money?",
  "What's the unfair advantage in a saturated market? Answering the phone.",
  "Why does enterprise SaaS pricing not work for small businesses? They don't pay £200/mo for software.",
  "How many AI demos have you seen this year that solved missed-call recovery? Probably zero.",
  "Most CX advice is about 'delight.' What customers actually want is to be reachable. Why is the gap so big?",
  "What's leaking more revenue from your business right now: the funnel, or the phone?",
  "Why is the answer to 'should I hire a receptionist' almost always 'no, automate it' in 2026?",
  "What's the lowest-status, highest-leverage workflow in any business? Reply-time. Discuss.",
  "If automation is so cheap, why do most companies still answer 'leave a message'?",
  "What's the version of 'AI replacing jobs' nobody mentions? It's replacing the boring admin no one wants to do anyway.",
  "How long should a small business wait before automating their phone? My answer: yesterday.",
  "Founders: would you pay £30/mo for a thing that handled 80% of after-hours inquiries? Why or why not?",
  "Why do most B2B SaaS demos miss the small-business market? The buyer has 90 seconds, not 90 minutes.",
  "What's the simplest test for 'is this AI worth it for my business?' Does it pick up the phone?",
  "Why is WhatsApp the customer-service channel of 2026 but most companies treat it as a side door?",
  "What's the most undervalued moat in business? Speed of reply. The one nobody competes on.",
  "Honest poll: what's worse, no marketing or unanswered marketing? Most owners pick wrong.",
  "Why do small businesses across every industry have the same bottleneck? Anyone? It's the phone.",
  // Option-list questions (rxhit05-style)
  "What's costing businesses more revenue?\n\n-missed calls after 6pm\n-no follow-up on Tuesday\n-replying in 4 hours not 4 minutes\n-ignoring the channels customers actually use",
  "What's the biggest lie in SMB software?\n\n-'AI agents change everything'\n-'we built it for small business'\n-'it's affordable for solo operators'\n-'the dashboard is intuitive'",
  "What kills a small business fastest?\n\n-bad reviews\n-slow replies\n-no follow-up\n-pricing too low",
  "Pick the worse problem for a founder:\n\n-no leads\n-leads going to voicemail\n-replying too late\n-no review pipeline",
  "What's more dangerous for businesses in 2026?\n\n-staying off AI\n-using the wrong AI\n-buying enterprise tools\n-treating WhatsApp as a side channel",
  "What's the bigger lever for any business?\n\n-better ads\n-faster reply-time\n-more reviews\n-better website",
  "What costs you more bookings?\n\n-the price\n-not picking up\n-not following up\n-being unreachable on WhatsApp",
  "Pick the cheaper fix:\n\n-£500/mo on ads\n-£400/mo on SEO\n-£30/mo automating after-hours\n-£3000/mo on a sales hire",
  "What's the worst SaaS pricing for a small business?\n\n-per-seat at £200/mo\n-per-API-call\n-annual upfront contracts\n-hidden setup fees",
  "What kills founder velocity faster?\n\n-perfectionism\n-no first customer\n-too many tools\n-not picking up the phone",
  "What's the single best AI hire for any business?\n\n-content writer\n-customer support\n-after-hours receptionist\n-sales SDR",
  "Which is the bigger small-business pain?\n\n-Google reviews\n-cancellations\n-missed calls\n-cash flow",
  "What's the dumbest thing businesses still do in 2026?\n\n-ignore WhatsApp\n-let calls go to voicemail\n-skip review chasing\n-quote by email only",
  "What's costing you more than you think?\n\n-the leads you don't get\n-the leads you got and lost\n-the calls you missed\n-the follow-ups you forgot",
  "Honest take: what's the slowest growth lever for a small business?\n\n-hiring more people\n-spending more on ads\n-better software\n-doing nothing",
  "What's the boring lever nobody pulls?\n\n-replying faster\n-following up more\n-answering after 6pm\n-asking for the review",
  "Pick the bigger SMB myth:\n\n-customers care about your brand\n-AI is too complex for small business\n-WhatsApp is unprofessional\n-after-hours doesn't matter",
  "What's wasted more in any business?\n\n-ad spend\n-missed calls\n-uncollected reviews\n-follow-ups never sent",
  "Pick the dumber excuse:\n\n-'we don't need WhatsApp'\n-'customers can leave a message'\n-'AI is for big companies'\n-'we'll fix it next quarter'",
  "What's the actual constraint on small business growth?\n\n-marketing budget\n-product quality\n-reply-time\n-reviews count",
  "Where does most small-business revenue leak?\n\n-the website form\n-the phone after 5pm\n-the WhatsApp inbox\n-the follow-up sequence",
  "What's the fastest payback for a small business?\n\n-paid ads\n-SEO\n-after-hours phone automation\n-CRM upgrade",
  "Pick the worst small-business hire:\n\n-the £30k receptionist\n-the £40k marketing manager\n-the £25k admin\n-the £35k sales rep",
  "What's the cheapest 5-minute fix for any business?\n\n-changing ad keywords\n-rewriting your homepage\n-routing calls to a bot\n-asking for reviews after every job",
  "What feels productive but isn't?\n\n-checking analytics\n-redoing the website\n-sending newsletter blasts\n-anything that isn't replying to leads",
  "What's the most overrated business metric?\n\n-followers\n-website traffic\n-impressions\n-anything that isn't booked revenue",
  "Pick the lazier excuse:\n\n-'we tried that'\n-'our customers are different'\n-'AI isn't ready'\n-'we don't have budget for that'",
  "What loses you more deals?\n\n-pricing\n-no follow-up\n-slow replies\n-being unreachable on WhatsApp",
  "What's the smallest change with the biggest ROI?\n\n-adding WhatsApp Business\n-automating booking confirms\n-an after-hours bot\n-a review request after every job",
  "Founders: what's the actual reason you haven't automated yet?\n\n-not enough time\n-too expensive\n-don't trust it\n-haven't found the right tool",
];

async function tgSend(text, replyMarkup) {
  const body = new URLSearchParams({
    chat_id: TG_CHAT,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: 'true',
    reply_markup: JSON.stringify(replyMarkup),
  });
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const j = await res.json();
  if (!j.ok) throw new Error(j.description || 'tg send failed');
  return j.result.message_id;
}

(async () => {
  // Dedupe: track which question indices we've pushed in the last 30 days.
  // Skip ones already pushed; pick the next one in rotation order that's fresh.
  const fs = require('fs');
  const path = require('path');
  const SENT = path.join(__dirname, 'question-sent.json');
  let sent = {};
  try { sent = JSON.parse(fs.readFileSync(SENT, 'utf8')); } catch {}
  // Garbage-collect entries older than 30 days
  const cutoff = Date.now() - 30 * 86400000;
  for (const k of Object.keys(sent)) {
    if (sent[k] < cutoff) delete sent[k];
  }

  // Rotation: day-of-year × 2 slots = position in QUESTIONS list. Slot 0 = 12 UTC, slot 1 = 18 UTC.
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getUTCFullYear(), 0, 0).getTime()) / 86400000);
  const hour = new Date().getUTCHours();
  const slot = (hour >= 17) ? 1 : 0;
  let idx = (dayOfYear * 2 + slot) % QUESTIONS.length;

  // If this idx was already pushed in last 30d, walk forward until we find a fresh one
  let attempts = 0;
  while (sent[idx] && attempts < QUESTIONS.length) {
    idx = (idx + 1) % QUESTIONS.length;
    attempts++;
  }
  if (attempts >= QUESTIONS.length) {
    console.log('all 60 questions pushed in last 30d — picking idx=0 anyway (extreme reuse)');
    idx = 0;
  }

  const question = QUESTIONS[idx];
  const id = `qm${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`;
  // Mark as sent
  sent[idx] = Date.now();
  fs.writeFileSync(SENT, JSON.stringify(sent, null, 2));

  const intentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(question)}`;
  const header = `❓ QUESTION OF THE SLOT (idx=${idx}, slot=${slot === 0 ? '12 UTC' : '18 UTC'})`;
  const msg = `${header}\n\n${question}\n\n<i>${question.length} chars · ${id} · post on YOUR profile, no reply target</i>`;
  const replyMarkup = {
    inline_keyboard: [
      [{ text: '➡️ Post on X (pre-filled)', url: intentUrl }],
      [
        { text: '✅ Posted', callback_data: `tap:${id}` },
        { text: '❌ Skip',   callback_data: `skip:${id}` },
      ],
    ],
  };
  await tgSend(msg, replyMarkup);
  console.log(`pushed question idx=${idx}: ${question.slice(0, 80)}`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
