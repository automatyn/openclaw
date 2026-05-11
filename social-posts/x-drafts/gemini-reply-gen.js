#!/usr/bin/env node
// Per-tweet reply generator using Gemini 2.5 Flash (free tier: 15 req/min).
// Takes top N candidates from merged sources, generates ONE genuinely on-topic
// reply per tweet using LLM (so reply actually addresses the proposition),
// emits to drafts-replies.json.
//
// Usage: GEMINI_API_KEY=... node gemini-reply-gen.js [count] [slot]
//
// Output schema matches what /tmp/push-fresh-replies.js expects.

const fs = require('fs');
const path = require('path');

const COUNT = parseInt(process.argv[2] || '5', 10);
const SLOT  = process.argv[3] || 'afternoon';
const KEY   = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('GEMINI_API_KEY not set'); process.exit(1); }

const dir = __dirname;
const SOURCES = ['candidates-api.json', 'candidates-browser.json', 'firehose-candidates.json'];

// Load replied-cache
const repliedCacheFile = path.join(dir, 'replied-cache.json');
const alreadyReplied = new Set();
if (fs.existsSync(repliedCacheFile)) {
  const cache = JSON.parse(fs.readFileSync(repliedCacheFile, 'utf8'));
  for (const id of (cache.replied_to || [])) alreadyReplied.add(String(id));
}

// Merge + dedupe
const seen = new Set();
const merged = [];
for (const fname of SOURCES) {
  const fpath = path.join(dir, fname);
  if (!fs.existsSync(fpath)) continue;
  try {
    const data = JSON.parse(fs.readFileSync(fpath, 'utf8'));
    for (const c of (data.candidates || [])) {
      const id = c.tweet_id || c.id;
      if (!id || seen.has(id)) continue;
      if (alreadyReplied.has(String(id))) continue;
      seen.add(id);
      merged.push(c);
    }
  } catch (e) { /* skip */ }
}

// Filter: skip personal/political/unrepliable, prefer recent + has engagement
const SKIP = /(mother.s day|happy birthday|RIP|condolences|election|democrat|republican|trump|biden|gaza|ukraine|charity)/i;
const filtered = merged.filter(c => {
  if (!c.text || c.text.length < 50) return false;
  if (SKIP.test(c.text)) return false;
  if (parseFloat(c.age_hours || 100) > 6) return false;
  return true;
});

// Rank by engagement
filtered.sort((a, b) => {
  const sa = (a.likes||0) + (a.replies||0)*2 + (a.reposts||0)*3;
  const sb = (b.likes||0) + (b.replies||0)*2 + (b.reposts||0)*3;
  return sb - sa;
});

const targets = filtered.slice(0, COUNT * 2); // overshoot, LLM may reject some
console.log(`Filtered ${merged.length} → ${filtered.length} → top ${targets.length} for LLM`);

const SYSTEM_PROMPT = `You are Patrick (@patrickssons), a UK founder who builds AI agents for small businesses (plumbers, salons, dentists, electricians, vets, garages). Your product Automatyn answers phones/WhatsApps at 2am so SMB owners don't lose £400 jobs.

You're writing a reply to a tweet. Your goal is to make the AUTHOR reply back (a reply-back gives 150x impressions per X algo). Replies that work:
- Direct question to the author about their post (about THEIR experience, data, take)
- Mild contrarian challenge with a specific number or counter-example
- Add a sharp observation that genuinely extends what they said

Hard rules:
- Reply MUST directly address the proposition of the tweet (not a generic adjacent take)
- Under 200 characters
- NO em dashes (use colons, full stops, or commas)
- NO buzzwords: leverage, unlock, seamless, game-changer, revolutionary, streamline, empower, synergy, optimize, disrupt
- NO emojis
- Sound human, terse, no "Great post!" / "100%" / "This!" sycophancy
- Don't pitch Automatyn. You can occasionally drop SMB/trades context if it fits naturally; usually skip
- If the tweet is announcement/launch/link-only/personal/political with no genuine entry point: respond with literally the word SKIP

Output: just the reply text, nothing else. No preamble.`;

async function generateReply(tweet) {
  const userMsg = `Tweet by @${tweet.handle}:\n${tweet.text}\n\nWrite ONE reply (or "SKIP"):`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${KEY}`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userMsg }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
  };
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const errText = await r.text();
      console.error(`Gemini ${r.status}: ${errText.slice(0,200)}`);
      return null;
    }
    const j = await r.json();
    const text = j?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text || /^SKIP$/i.test(text)) return null;
    return text;
  } catch (e) { console.error('LLM error:', e.message); return null; }
}

function postValidate(reply, tweet) {
  if (!reply) return null;
  let t = reply.replace(/[—–]/g, ':').trim(); // em/en dash -> colon
  // Strip surrounding quotes
  if (t.startsWith('"') && t.endsWith('"')) t = t.slice(1,-1);
  if (t.length > 270) return null;
  if (t.length < 20) return null;
  // Banned words
  if (/\b(leverage|unlock|seamless|game-changer|revolutionary|cutting-edge|streamline|empower|synergy|optimize|disrupt)\b/i.test(t)) return null;
  // Sycophant openers
  if (/^(great post|100%|this!|spot on|exactly this|so true|love this)/i.test(t)) return null;
  return t;
}

(async () => {
  const drafts = [];
  let llmCalls = 0, accepted = 0, skipped = 0, rejected = 0;
  for (const t of targets) {
    if (accepted >= COUNT) break;
    llmCalls++;
    const raw = await generateReply(t);
    if (!raw) { skipped++; continue; }
    const clean = postValidate(raw, t);
    if (!clean) { rejected++; continue; }
    drafts.push({
      id: `r${String(drafts.length + 1).padStart(2,'0')}`,
      type: 'reply',
      target_handle: t.handle,
      target_age: `${t.age_hours}h`,
      target_url: t.url,
      tweet_id: t.tweet_id || t.id,
      target_text: t.text.slice(0, 220),
      draft: clean,
      char_count: clean.length,
      reason: 'gemini-2.5-flash per-tweet'
    });
    accepted++;
    // 15 rpm = 4s spacing
    await new Promise(r => setTimeout(r, 4500));
  }
  const out = { slot: SLOT, date: new Date().toISOString().slice(0,10), drafts, stats: { llmCalls, accepted, skipped, rejected, targets: targets.length } };
  fs.writeFileSync(path.join(dir, 'drafts-replies.json'), JSON.stringify(out, null, 2));
  console.log(`LLM calls: ${llmCalls}, accepted: ${accepted}, llm-skip: ${skipped}, validator-reject: ${rejected}`);
  console.log(`Wrote drafts-replies.json (${accepted} replies)`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
