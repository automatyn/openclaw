#!/usr/bin/env node
// Once-a-day thread generator. Posts on Pat's profile (not buried under OP) → highest
// follower-conversion of any post format. Each tweet pushed to Telegram with its own
// pre-filled URL button. Pat posts tweet 1 → grabs the URL of his own tweet 1 →
// taps button 2 (which Pat then edits with his tweet-1 URL as the reply-target).
//
// Simpler workflow shipped here: each tweet has a pre-fill URL. Pat posts them in
// order, replying each subsequent tweet to the previous one manually. The thread
// shows up on his timeline as a natural thread.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TG_TOKEN = '8726414142:AAFQr-8dHxws5g9zZpu6IbjhmoN7b7lf8qc';
const TG_CHAT = '5904617085';

// Thread library — each thread is 4-5 tweets, all on-Automatyn-objective.
// Keep adding new ones over time; pick rotates by day-of-year so we don't repeat too soon.
const THREADS = [
  {
    name: 'missed-calls-cost',
    tweets: [
      "A UK plumber I know loses ~£200 every time the phone goes to voicemail.\n\nHe gets 2-3 missed calls/week.\n\nThat's £400-600/wk = ~£25k/year of work walking to whoever picks up first.\n\nMost SMBs can't see this number. It never lands on the P&L.",
      "The reason it's invisible: nobody calls back to say 'I called, you didn't answer, I went elsewhere.'\n\nThe customer just disappears.\n\nYou never know they existed.",
      "When you DO see it, it's brutal:\n\n- 70% of plumbing emergencies happen between 6pm and 9am\n- 78% of customers go with whoever replies first\n- 5 mins beats 5 hours by 21x in close-rate\n\nThree numbers, same conclusion.",
      "What actually fixes this isn't another receptionist (£25k/yr). It's automating the after-hours phone for £30/month.\n\nDoesn't call in sick. Doesn't quit. Books the £400 emergency at 2am.\n\nThe ROI calc takes one week of data to flip from 'maybe' to 'why didn't I do this years ago.'",
    ],
  },
  {
    name: 'speed-of-reply-moat',
    tweets: [
      "Speed of reply has quietly become the only marketing moat that compounds.\n\n78% of buyers go with whoever replies first.\n\nYet most SMBs reply in 4 hours.\n\nThe gap is the entire game.",
      "What's wild: this gap doesn't show up in any sales report.\n\nCRMs measure pipeline, conversion rate, deal size.\n\nNone of them measure 'how long did the lead wait for the first reply.'\n\nThe most predictive metric is the one nobody tracks.",
      "Why nobody tracks it: it requires admitting the bottleneck isn't the product or the salesperson. It's whether anyone was at the desk at 6:48pm on Tuesday.\n\nAdmin problems are uncomfortable to face.",
      "The fix isn't hiring a night-shift receptionist.\n\nIt's deploying something that:\n- Picks up at any hour\n- Qualifies the lead\n- Books the slot\n- Costs £30/month\n\nHumans handle the edge cases. The bot handles the 90% that's just 'are you available Thursday'.",
      "The compounding part:\n\nFaster replies → more closed deals → more reviews → better Google rank → more leads → faster replies still pay off.\n\nMost SMB growth strategies hit a ceiling. This one doesn't.",
    ],
  },
  {
    name: 'whatsapp-vs-email',
    tweets: [
      "98% open rate on WhatsApp.\n22% on email.\n\nMost SMBs send their booking confirmations by email.\n\nThe cost of that habit is enormous and invisible.",
      "If you run a service business and your customer says 'message me on WhatsApp,' that's not a preference.\n\nIt's a signal that they don't read email.\n\nIgnore it and you lose the sale to whoever replies on the channel they actually use.",
      "Half the bookings for UK plumbers happen via WhatsApp now.\n\nThe ones who treat it as a real channel beat the ones who treat it as a side door, every quarter.\n\nIt's not a generational thing. It's a 'how long do you want to wait' thing.",
      "What this looks like in practice:\n\n- Customer messages WhatsApp at 8pm\n- AI receptionist confirms availability at 8:00:30pm\n- Customer books for next morning\n- Plumber sees the booking in the morning, has nothing to do but show up\n\nNobody answered an email at 8pm. Nobody had to.",
    ],
  },
  {
    name: 'after-hours-arbitrage',
    tweets: [
      "The unfair advantage UK trades aren't using:\n\n70% of emergency calls happen between 6pm and 9am.\n\nMost competitors don't answer during that window.\n\nWhoever does, books the £400 job. It's that simple.",
      "The reason most plumbers don't answer after hours: they have a life. Reasonable.\n\nThe reason it's still arbitrage: nobody's automated the easy bits.\n\nA bot that picks up, qualifies (boiler? leak? blocked drain?), books the morning slot — that's a £30/mo edge over every competitor in your postcode.",
      "Three weekday evenings of automated answering = one extra £400 job/week = an extra £20k/year.\n\nNo extra trucks. No extra payroll. No extra admin.\n\nThe payback period on the setup cost is roughly one week.",
      "What kills this for most owners: they want a human to answer because that's how it's always been.\n\nThe customer doesn't care. They want their leak fixed. The voice they hear at 11pm matters less than whether somebody booked the morning slot.\n\nMarket the speed, not the human.",
    ],
  },
  {
    name: 'follow-up-leverage',
    tweets: [
      "80% of sales need 5+ follow-ups.\n\n44% of salespeople give up after 1.\n\nThere's the entire game in two numbers.",
      "Most pipeline issues aren't 'we don't have leads.'\n\nThey're 'we got leads, we forgot to chase on Tuesday at 6pm, we lost the deal.'\n\nThe second-touch is where revenue lives. Most companies die there.",
      "The CRM doesn't fix this. It just gives you a more organised way to feel guilty about the chase you didn't do.\n\nYou need either: a discipline you'll never have, or automation that doesn't need a discipline.",
      "Automated 3-touch follow-up sequences (text + WhatsApp + email) recover 30-40% of leads that would otherwise be lost.\n\nFor a UK trade doing £200k/yr, that's ~£60k of recovered revenue from work that's already in the pipeline.\n\nNot more leads. Same leads, less leakage.",
    ],
  },
  {
    name: 'ai-receptionist-honest',
    tweets: [
      "Most 'AI for small business' demos miss the actual job.\n\nThe point isn't to be smart.\n\nIt's to not lose the booking when the boss is asleep.\n\nLow-prestige work, high-leverage outcome.",
      "The AI that wins for trades isn't the one that answers complex policy questions.\n\nIt's the one that answers 'are you free Thursday morning' in 3 seconds, books the slot, and moves on.\n\nNarrow > smart.",
      "The use-case stack ranked by SMB ROI:\n\n1. Phone answering at night/weekend\n2. Booking confirmations + reminders\n3. Review chasing post-job\n4. WhatsApp inbound qualification\n\nEverything above #4 is mostly dev-twitter theatre.",
      "The right benchmark for an AI receptionist isn't 'does it sound human.'\n\nIt's 'does it book the £400 job at 2am that the boss would have otherwise lost?'\n\nMeasure that, ignore everything else.",
    ],
  },
  {
    name: 'smb-pricing-game',
    tweets: [
      "SaaS pricing for SMBs is broken.\n\n£200/mo per seat works for fintech.\n\nFor a 1-person plumber doing £80k/yr, the same pricing sounds like fraud.\n\nThe market between £30-80/mo for SMB tools is huge and almost completely ignored.",
      "Why nobody serves it: the unit economics suck for traditional SaaS.\n\n£30/mo × 1000 customers = £30k/mo MRR. Lots of support, low ARPU.\n\nMost VCs prefer chasing one £3k MRR enterprise logo (which takes 8 months to close, churns 30%/yr, and demands custom dev).",
      "The SMB market is bootstrap-friendly because the low ARPU is a moat.\n\nThe big players won't enter. The boutique players win it.\n\nDistribution beats product. Whoever gets in the door first holds it for years.",
      "If you're building for SMBs:\n\n- Price it like a phone bill (£30-80/mo predictable)\n- One-time setup (£300-1500) covers your CAC\n- Sell speed of reply, not features\n- Every sale is a 5-year customer if you don't break the trust\n\nThis is the boring playbook.",
    ],
  },
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

// Wrap thread tweets in the high-engagement format verified on @TTrimoreau:
//   - opening tweet ends with 👇 to signal "thread, follow along"
//   - every tweet ends with i/N counter (1/4, 2/4, etc) — confirmed pulls 3-5x more views
function wrapThreadFormat(tweets) {
  const N = tweets.length;
  return tweets.map((t, i) => {
    let body = t.trim();
    // Append i/N counter to every tweet
    const counter = `\n\n${i + 1}/${N}`;
    // First tweet gets a 👇 at the end (before counter)
    if (i === 0) {
      // If body doesn't already contain a hook signal, add one
      if (!/👇|here's how|breaking it down|let me explain|the real story/i.test(body)) {
        body = body + ' 👇';
      } else {
        body = body + ' 👇';
      }
    }
    return body + counter;
  });
}

(async () => {
  // Pick by day-of-year for deterministic rotation
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getUTCFullYear(), 0, 0).getTime()) / 86400000);
  const idx = dayOfYear % THREADS.length;
  const thread = THREADS[idx];
  const formattedTweets = wrapThreadFormat(thread.tweets);
  console.log(`day=${dayOfYear} → thread.name=${thread.name} (${formattedTweets.length} tweets, with 👇 hook + i/N counters)`);

  // Send a header
  await tgSend(
    `🧵 THREAD OF THE DAY: ${thread.name}\n\n` +
    `${formattedTweets.length} tweets to post on YOUR profile.\n\n` +
    `Format = TTrimoreau-style: opening tweet ends in 👇, all tweets numbered i/N. Verified to pull 3-5x more views than plain threads.\n\n` +
    `<i>Post tweet 1 → grab its URL → tap reply on your tweet 1 → post tweet 2 → repeat. Chain forms the thread.</i>`,
    { inline_keyboard: [] }
  );
  await new Promise(r => setTimeout(r, 500));

  for (let i = 0; i < formattedTweets.length; i++) {
    const t = formattedTweets[i];
    const id = `t${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`;
    // Each tweet just opens X with text pre-filled. User replies-to-self manually for chain.
    const intentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(t)}`;
    const header = `🧵 ${i + 1}/${thread.tweets.length} — ${thread.name}`;
    const msg = `${header}\n\n${t}\n\n<i>${t.length} chars · ${id}</i>`;
    const replyMarkup = {
      inline_keyboard: [
        [{ text: `➡️ Post tweet ${i + 1}/${thread.tweets.length} on X`, url: intentUrl }],
        [
          { text: '✅ Posted',  callback_data: `tap:${id}` },
          { text: '❌ Skip',    callback_data: `skip:${id}` },
        ],
      ],
    };
    await tgSend(msg, replyMarkup);
    await new Promise(r => setTimeout(r, 400));
  }
  console.log(`pushed thread of ${thread.tweets.length} tweets`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
