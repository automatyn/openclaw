#!/usr/bin/env node
// Pull follower counts for all target-list handles via fxtwitter (free).
// Writes handle-followers.json: { handle: { followers: N, fetched_at: ISO } }.
// Run daily; the firehose reads this to filter out small accounts.

const fs = require('fs');
const https = require('https');
const path = require('path');

const dir = __dirname;
const targets = JSON.parse(fs.readFileSync(path.join(dir, 'target-list.json'), 'utf8'));
const OUT = path.join(dir, 'handle-followers.json');

const handles = [];
const seen = new Set();
for (const group of Object.values(targets.groups)) for (const h of group) {
  if (!seen.has(h)) { seen.add(h); handles.push(h); }
}

function fxt(handle) {
  return new Promise(resolve => {
    const opts = {
      hostname: 'api.fxtwitter.com',
      path: `/${handle}`,
      method: 'GET',
      headers: { 'User-Agent': 'AutomatynFirehose/1.0 (+https://automatyn.co)' },
    };
    https.get(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          resolve(j.user?.followers || null);
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  const out = {};
  for (const h of handles) {
    const f = await fxt(h);
    if (f != null) out[h.toLowerCase()] = { followers: f, fetched_at: new Date().toISOString() };
    process.stdout.write(`${h}=${f}  `);
    await new Promise(r => setTimeout(r, 500)); // pace, be polite
  }
  console.log();
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`wrote ${OUT} with ${Object.keys(out).length} handles`);
})();
