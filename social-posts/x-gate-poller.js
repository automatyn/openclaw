#!/usr/bin/env node
import crypto from 'crypto';
import fs from 'fs';
import https from 'https';

const TG_TOKEN = '8726414142:AAFQr-8dHxws5g9zZpu6IbjhmoN7b7lf8qc';
const TG_CHAT = '5904617085';
const CK = 'sNdJ4BazPelZOihs3zi1s2CGx';
const CS = 'foViin5cDQOZRqIxUX3ze7pT4XSXgdVe6J3xxvjQWT2xgBWiBV';
const AT = '153945388-TTk087bDBxCw4ctP5UU6mLqY2IBE6UNWRc9EXnJQ';
const ATS = 'OzAkwUuHWskdQvvftrQFQrLyxUjSMEb7SC5PVHFoMVVYl';

const DRAFTS = '/home/marketingpatpat/openclaw/social-posts/pending-x-drafts.json';
const BUDGET = '/home/marketingpatpat/openclaw/social-posts/x-api-budget.json';
const OFFSET_FILE = '/home/marketingpatpat/openclaw/social-posts/.tg-offset';
const LOG = '/home/marketingpatpat/openclaw/social-posts/x-gate-poller.log';

const MONTHLY_CAP = 500;
const MIN_JITTER_SEC = 120;
const MAX_JITTER_SEC = 420;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG, line);
  process.stdout.write(line);
}

function pct(s) {
  return encodeURIComponent(s).replace(/[!*'()]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function httpsJson(opts, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function tgSend(text) {
  const body = JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML', disable_web_page_preview: false });
  return httpsJson({
    hostname: 'api.telegram.org', path: `/bot${TG_TOKEN}/sendMessage`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
  }, body);
}

async function tgAnswerCallback(id, text) {
  const body = `callback_query_id=${id}&text=${encodeURIComponent(text)}`;
  return httpsJson({
    hostname: 'api.telegram.org', path: `/bot${TG_TOKEN}/answerCallbackQuery`, method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': body.length }
  }, body);
}

async function tgGetUpdates(offset) {
  const r = await httpsJson({
    hostname: 'api.telegram.org', path: `/bot${TG_TOKEN}/getUpdates?offset=${offset}&timeout=25`, method: 'GET'
  });
  return JSON.parse(r.body);
}

async function postTweet(text, replyTo) {
  const url = 'https://api.twitter.com/2/tweets';
  const params = {
    oauth_consumer_key: CK,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: AT,
    oauth_version: '1.0'
  };
  const sorted = Object.keys(params).sort().map(k => `${pct(k)}=${pct(params[k])}`).join('&');
  const base = `POST&${pct(url)}&${pct(sorted)}`;
  const key = `${pct(CS)}&${pct(ATS)}`;
  params.oauth_signature = crypto.createHmac('sha1', key).update(base).digest('base64');
  const auth = 'OAuth ' + Object.keys(params).sort().map(k => `${pct(k)}="${pct(params[k])}"`).join(', ');
  const body = JSON.stringify(replyTo ? { text, reply: { in_reply_to_tweet_id: replyTo } } : { text });
  return httpsJson({
    hostname: 'api.twitter.com', path: '/2/tweets', method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json', 'Content-Length': body.length }
  }, body);
}

function readJSON(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}
function writeJSON(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2)); }

function checkBudget() {
  const b = readJSON(BUDGET, { month: '', writes: 0, cost_usd: 0 });
  const curMonth = new Date().toISOString().slice(0, 7);
  if (b.month !== curMonth) { b.month = curMonth; b.writes = 0; b.cost_usd = 0; writeJSON(BUDGET, b); }
  return b;
}

function incBudget() {
  const b = checkBudget();
  b.writes += 1;
  b.cost_usd = +(b.writes * 0.01).toFixed(2);
  b.last_updated = new Date().toISOString();
  writeJSON(BUDGET, b);
  return b;
}

const approvedQueue = [];
let posting = false;

async function processQueue() {
  if (posting || approvedQueue.length === 0) return;
  posting = true;
  while (approvedQueue.length > 0) {
    const b = checkBudget();
    if (b.writes >= MONTHLY_CAP) {
      await tgSend('🛑 $5 budget cap hit. Halting posts until next month.');
      break;
    }
    const jitter = MIN_JITTER_SEC + Math.floor(Math.random() * (MAX_JITTER_SEC - MIN_JITTER_SEC));
    log(`Sleeping ${jitter}s before next post (${approvedQueue.length} in queue)`);
    await new Promise(r => setTimeout(r, jitter * 1000));

    const draft = approvedQueue.shift();
    const replyId = draft.target ? (draft.target.match(/status\/(\d+)/) || [])[1] : null;
    try {
      const r = await postTweet(draft.text, replyId);
      if (r.status === 201) {
        const parsed = JSON.parse(r.body);
        const newId = parsed.data?.id;
        const bu = incBudget();
        await tgSend(`✅ Posted reply to ${draft.targetAuthor || ''}\nhttps://x.com/patrickssons/status/${newId}\nBudget: ${bu.writes}/${MONTHLY_CAP} ($${bu.cost_usd})`);
        log(`Posted ${draft.id}: ${newId}`);
      } else {
        const err = (JSON.parse(r.body).detail || r.body).slice(0, 200);
        await tgSend(`❌ Failed ${draft.id} (${draft.targetAuthor || 'post'}): ${err}`);
        log(`Failed ${draft.id}: ${r.status} ${r.body}`);
      }
    } catch (e) {
      await tgSend(`❌ Error posting ${draft.id}: ${e.message}`);
      log(`Error ${draft.id}: ${e.message}`);
    }
  }
  posting = false;
}

async function main() {
  log('Poller starting');
  await tgSend('🟢 X gate poller online. Tap ✅ on drafts to post.');
  let offset = 0;
  try { offset = parseInt(fs.readFileSync(OFFSET_FILE, 'utf8')) || 0; } catch {}

  while (true) {
    try {
      const upd = await tgGetUpdates(offset);
      if (upd.ok && upd.result.length > 0) {
        for (const u of upd.result) {
          offset = u.update_id + 1;
          if (u.callback_query) {
            const cq = u.callback_query;
            const data = cq.data || '';
            const [action, id] = data.split(':');
            const drafts = readJSON(DRAFTS, []);
            const draft = drafts.find(d => d.id === id);
            if (!draft) {
              await tgAnswerCallback(cq.id, 'Draft not found').catch(() => {});
              continue;
            }
            if (action === 'post') {
              // Existing API-write flow. Refuses if the draft is firehose-mode (manual)
              // so a stray tap never burns API credits on a 150/day firehose draft.
              if (draft.mode === 'manual') {
                await tgAnswerCallback(cq.id, 'Manual-mode draft — use ✅ Tapped, not ✅ Post').catch(() => {});
                log(`Refused post on manual-mode ${id}`);
              } else {
                if (!approvedQueue.find(d => d.id === id)) {
                  approvedQueue.push(draft);
                  log(`Queued ${id} (${approvedQueue.length} total)`);
                }
                await tgAnswerCallback(cq.id, `Queued (${approvedQueue.length} pending)`).catch(() => {});
              }
            } else if (action === 'tap') {
              // Firehose flow: user posted manually on phone, just mark as tapped.
              // No API call, no queue. Pure bookkeeping for stats + dedupe.
              draft.tapped_at = new Date().toISOString();
              fs.writeFileSync(DRAFTS, JSON.stringify(drafts, null, 2));
              await tgAnswerCallback(cq.id, '✓ Tapped').catch(() => {});
              log(`Tapped ${id}`);
            } else if (action === 'skip') {
              draft.skipped_at = new Date().toISOString();
              fs.writeFileSync(DRAFTS, JSON.stringify(drafts, null, 2));
              await tgAnswerCallback(cq.id, 'Skipped').catch(() => {});
              log(`Skipped ${id}`);
            }
          }
        }
        fs.writeFileSync(OFFSET_FILE, String(offset));
        processQueue();
      }
    } catch (e) {
      log(`Poll error: ${e.message}`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

main().catch(e => { log(`Fatal: ${e.message}`); process.exit(1); });
