#!/usr/bin/env node
// X reply scanner: scans target profiles via authenticated Chrome (CDP 18800),
// picks fresh substantive tweets, drafts replies, and queues them to Telegram
// with twitter.com/intent/tweet URL buttons. No API writes — Pat taps the link
// on his phone and X opens with the reply pre-filled.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TARGETS_FILE = path.join(__dirname, 'x-reply-targets.json');
const LOG_FILE = path.join(__dirname, 'x-reply-scanner.log');
const SEEN_FILE = path.join(__dirname, 'x-reply-seen.json');

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8726414142:AAFQr-8dHxws5g9zZpu6IbjhmoN7b7lf8qc';
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '5904617085';

const MAX_DRAFTS_PER_RUN = parseInt(process.env.MAX_DRAFTS || '5', 10);

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function loadSeen() {
  try { return new Set(JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8'))); }
  catch { return new Set(); }
}

function saveSeen(set) {
  // Keep only last 500 entries to bound file size
  const arr = Array.from(set).slice(-500);
  fs.writeFileSync(SEEN_FILE, JSON.stringify(arr));
}

function bu(args) {
  return execSync(`browser-use --cdp-url http://127.0.0.1:18800 ${args}`, { encoding: 'utf8', timeout: 30000 });
}

function scanProfile(handle, filters) {
  log(`Scanning @${handle}`);
  try {
    bu(`open "https://x.com/${handle}"`);
  } catch (e) {
    log(`  open failed: ${e.message.slice(0, 100)}`);
    return [];
  }
  // Give the timeline time to render, then scroll to trigger virtualized rows
  execSync('sleep 4');
  for (let i = 0; i < 4; i++) {
    try { bu('scroll down --amount 1000'); } catch {}
    execSync('sleep 2');
  }
  const js = `
    Array.from(document.querySelectorAll('article')).slice(0, 8).map(a => {
      const time = a.querySelector('time');
      const link = a.querySelector('a[href*="/status/"]');
      const text = a.innerText;
      const isReply = text.startsWith('Replying to') || (text.split('\\n')[0] || '').includes('Replying to');
      const isRetweet = (text.split('\\n')[0] || '').includes('reposted') || text.includes(' reposted');
      const isPinned = text.startsWith('Pinned') || (text.split('\\n')[0] || '').includes('Pinned');
      // Engagement counts from aria-labels
      const groups = Array.from(a.querySelectorAll('[role="group"]'));
      const engagement = groups.length ? (groups[0].innerText || '').replace(/\\s+/g,' ').slice(0,80) : '';
      return {
        time: time?.getAttribute('datetime'),
        url: link?.href,
        text: text.slice(0, 500),
        isReply,
        isRetweet,
        isPinned,
        engagement
      };
    }).filter(x => x.url && x.url.includes('/status/'))
  `.replace(/\n\s*/g, ' ');
  let raw;
  try {
    raw = bu(`eval ${JSON.stringify(js)}`);
  } catch (e) {
    log(`  eval failed: ${e.message.slice(0, 100)}`);
    return [];
  }
  // Parse python-dict-style output from browser-use
  const start = raw.indexOf('[');
  if (start < 0) return [];
  let parsed;
  try {
    const jsonish = raw.slice(start)
      .replace(/'/g, '"')
      .replace(/: True/g, ': true')
      .replace(/: False/g, ': false')
      .replace(/: None/g, ': null');
    parsed = JSON.parse(jsonish);
  } catch (e) {
    log(`  parse failed: ${e.message.slice(0, 100)}`);
    return [];
  }
  const now = Date.now();
  const cutoffMs = (filters.max_age_minutes || 240) * 60 * 1000;
  return parsed
    .filter(t => {
      if (!t.time || !t.url) return false;
      if (filters.skip_replies && t.isReply) return false;
      if (filters.skip_retweets && t.isRetweet) return false;
      if (t.isPinned) return false;
      const age = now - new Date(t.time).getTime();
      if (age > cutoffMs) return false;
      return true;
    })
    .map(t => {
      t.author = handle;
      t.tweet_id = (t.url.match(/\/status\/(\d+)/) || [])[1];
      return t;
    });
}

async function sendToTelegram(handle, tweetUrl, tweetText, draftText, tweetId, ageMin) {
  const intentUrl = `https://twitter.com/intent/tweet?in_reply_to=${tweetId}&text=${encodeURIComponent(draftText)}`;
  const msg = `📝 REPLY to @${handle} (${ageMin}m ago)\n\n"${tweetText.slice(0, 200).replace(/\n/g, ' ')}"\n\nDraft (${draftText.length} chars):\n${draftText}`;
  const body = new URLSearchParams({
    chat_id: TG_CHAT,
    text: msg,
    reply_markup: JSON.stringify({
      inline_keyboard: [[
        { text: '🔗 Open in X to post', url: intentUrl },
        { text: '👀 Original', url: tweetUrl }
      ]]
    })
  });
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const json = await res.json();
  if (!json.ok) throw new Error('Telegram: ' + (json.description || 'unknown'));
  return json.result.message_id;
}

// === DRAFT GENERATION ===
// We do NOT call an LLM here. The scanner outputs candidate tweets to stdout
// as JSON. A separate flow (Claude Code via the routine skills) reads them,
// drafts replies in Pat's voice, then calls this script with --queue mode.

async function main() {
  const mode = process.argv[2] || 'scan';
  if (mode === 'scan') {
    const cfg = JSON.parse(fs.readFileSync(TARGETS_FILE, 'utf8'));
    const seen = loadSeen();
    const candidates = [];
    for (const handle of cfg.targets) {
      const tweets = scanProfile(handle, cfg.filters);
      for (const t of tweets) {
        if (seen.has(t.tweet_id)) continue;
        candidates.push(t);
      }
      if (candidates.length >= MAX_DRAFTS_PER_RUN * 3) break;
    }
    // Sort by recency, take top N
    candidates.sort((a, b) => new Date(b.time) - new Date(a.time));
    const top = candidates.slice(0, MAX_DRAFTS_PER_RUN);
    for (const t of top) seen.add(t.tweet_id);
    saveSeen(seen);
    log(`Found ${candidates.length} candidates, returning top ${top.length}`);
    process.stdout.write(JSON.stringify(top, null, 2) + '\n');
  } else if (mode === 'queue') {
    // Read drafts JSON from stdin: [{tweet_id, author, url, text, draft, age_min}]
    const input = fs.readFileSync(0, 'utf8');
    const drafts = JSON.parse(input);
    let queued = 0;
    for (const d of drafts) {
      if (!d.draft || d.draft.length < 20 || d.draft.length > 280) {
        log(`Skip ${d.tweet_id}: draft length ${d.draft?.length || 0} out of bounds`);
        continue;
      }
      try {
        const id = await sendToTelegram(d.author, d.url, d.text || '', d.draft, d.tweet_id, d.age_min || 0);
        log(`Queued ${d.tweet_id} → @${d.author} (Telegram msg ${id})`);
        queued++;
      } catch (e) {
        log(`Queue failed ${d.tweet_id}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 800));
    }
    log(`Queued ${queued}/${drafts.length} drafts to Telegram`);
  } else {
    console.error(`Unknown mode: ${mode}. Use 'scan' or 'queue'.`);
    process.exit(2);
  }
}

main().catch(e => { log(`FATAL: ${e.stack || e.message}`); process.exit(1); });
