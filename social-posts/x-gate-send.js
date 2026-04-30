#!/usr/bin/env node
// Send an X draft to the Telegram approval gate so the gate-poller can post it via X API.
// Usage:
//   node x-gate-send.js original "<text>"
//   node x-gate-send.js reply "<text>" "<https://x.com/user/status/123>" "@author"
//
// Writes the draft into pending-x-drafts.json (the poller reads from there on callback)
// and sends a Telegram message with ✅/❌ inline buttons whose callback_data is
// `post:<id>` / `skip:<id>` — matching what x-gate-poller.js handles.

import crypto from 'crypto';
import fs from 'fs';

const TG_TOKEN = '8726414142:AAFQr-8dHxws5g9zZpu6IbjhmoN7b7lf8qc';
const TG_CHAT = '5904617085';
const DRAFTS = '/home/marketingpatpat/openclaw/social-posts/pending-x-drafts.json';

function readJSON(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

async function tgSend(text, replyMarkup) {
  const body = new URLSearchParams({
    chat_id: TG_CHAT,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: 'true',
    reply_markup: JSON.stringify(replyMarkup)
  });
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const j = await res.json();
  if (!j.ok) throw new Error(j.description || 'tg send failed');
  return j.result.message_id;
}

function slot() {
  const h = new Date().getUTCHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

async function main() {
  const [type, text, target, targetAuthor] = process.argv.slice(2);
  if (!type || !text) {
    console.error('Usage: x-gate-send.js <original|reply> "<text>" [target_url] [@author]');
    process.exit(2);
  }
  if (text.length > 280) {
    console.error(`Draft is ${text.length} chars (max 280)`);
    process.exit(2);
  }
  if (type === 'reply' && !target) {
    console.error('Reply mode needs a target URL');
    process.exit(2);
  }

  const id = `${slot().slice(0, 1)}${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`;
  const draft = {
    id,
    type,
    text,
    target: target || null,
    targetAuthor: targetAuthor || null,
    created: new Date().toISOString(),
    slot: slot()
  };

  const drafts = readJSON(DRAFTS, []);
  drafts.push(draft);
  fs.writeFileSync(DRAFTS, JSON.stringify(drafts, null, 2));

  const header = type === 'reply'
    ? `📝 REPLY to ${targetAuthor || target}`
    : `📝 ORIGINAL POST`;
  const targetLine = type === 'reply' ? `\n\n<a href="${target}">Source</a>` : '';
  const msg = `${header}\n\n${text}\n\n<i>${text.length} chars · ${id}</i>${targetLine}`;

  const replyMarkup = {
    inline_keyboard: [[
      { text: '✅ Post via API', callback_data: `post:${id}` },
      { text: '❌ Skip', callback_data: `skip:${id}` }
    ]]
  };

  await tgSend(msg, replyMarkup);
  console.log(JSON.stringify({ ok: true, id, type, length: text.length }));
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
