#!/usr/bin/env node
// Outreach Daily Report — Larry-brain framework applied to email.
//
// Diagnostic matrix:
//   high open + high reply  → SCALE (more volume on winning variant)
//   high open + low reply   → FIX CTA (subject works, close is broken)
//   low open + high reply   → FIX SUBJECT (body converts, needs more opens)
//   low open + low reply    → FULL RESET (variant is dead)
//
// Reads leads-store directly; groups sends by (e1_subject_id, e1_cta_id),
// writes hook-performance.json, prints + saves a markdown report.
//
// Usage: node daily-report.js [--days 14]

const fs = require('fs');
const path = require('path');
const store = require('./leads-store');

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : fallback;
}
const days = parseInt(getArg('days', '14'));

// Thresholds — tuned for cold B2B email, not consumer.
const OPEN_RATE_GOOD = 0.20;   // 20%+ open is good for cold B2B
const REPLY_RATE_GOOD = 0.02;  // 2%+ reply is the goal
const MIN_SENDS = 10;          // don't diagnose with <10 sends per variant

function pct(n, d) { return d > 0 ? n / d : 0; }
function fmtPct(x) { return (x * 100).toFixed(1) + '%'; }

function diagnose(openRate, replyRate, sends) {
  if (sends < MIN_SENDS) return { label: 'INSUFFICIENT DATA', action: `Need ${MIN_SENDS - sends} more sends before diagnosing` };
  const openGood = openRate >= OPEN_RATE_GOOD;
  const replyGood = replyRate >= REPLY_RATE_GOOD;
  if (openGood && replyGood) return { label: 'SCALE', action: 'Both subject and CTA working. Pour volume here.' };
  if (openGood && !replyGood) return { label: 'FIX CTA', action: 'Subject earns opens but CTA fails. Swap CTA, keep subject.' };
  if (!openGood && replyGood) return { label: 'FIX SUBJECT', action: 'CTA converts but few open. Swap subject, keep CTA.' };
  return { label: 'FULL RESET', action: 'Drop this pair. Try a different variant entirely.' };
}

function run() {
  const cutoff = new Date(Date.now() - days * 86400000);
  const leads = store.listAll();
  const e1Sent = leads.filter(l => l.email1_sent && new Date(l.email1_sent) >= cutoff);

  // Aggregate per (subject, cta) pair, and per axis.
  const pairs = {};        // key "S1|C1_binary"
  const subjects = {};     // key "S1"
  const ctas = {};         // key "C1_binary"
  const unlabelled = { sends: 0, opens: 0, replies: 0 };

  for (const l of e1Sent) {
    const sId = l.e1_subject_id;
    const cId = l.e1_cta_id;
    const opened = !!l.email1_opened_at;
    const replied = !!l.replied;

    if (!sId || !cId) {
      unlabelled.sends++;
      if (opened) unlabelled.opens++;
      if (replied) unlabelled.replies++;
      continue;
    }

    const pk = `${sId}|${cId}`;
    if (!pairs[pk]) pairs[pk] = { subjectId: sId, ctaId: cId, sends: 0, opens: 0, replies: 0 };
    pairs[pk].sends++;
    if (opened) pairs[pk].opens++;
    if (replied) pairs[pk].replies++;

    if (!subjects[sId]) subjects[sId] = { sends: 0, opens: 0, replies: 0 };
    subjects[sId].sends++;
    if (opened) subjects[sId].opens++;
    if (replied) subjects[sId].replies++;

    if (!ctas[cId]) ctas[cId] = { sends: 0, opens: 0, replies: 0 };
    ctas[cId].sends++;
    if (opened) ctas[cId].opens++;
    if (replied) ctas[cId].replies++;
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  let report = `# Outreach Daily Report — ${dateStr} (last ${days}d)\n\n`;

  const totalSends = e1Sent.length;
  const totalOpens = e1Sent.filter(l => l.email1_opened_at).length;
  const totalReplies = e1Sent.filter(l => l.replied).length;
  report += `**E1 totals:** ${totalSends} sends, ${totalOpens} opens (${fmtPct(pct(totalOpens, totalSends))}), ${totalReplies} replies (${fmtPct(pct(totalReplies, totalSends))})\n\n`;

  if (unlabelled.sends > 0) {
    report += `*Unlabelled sends (pre-variant-tracking): ${unlabelled.sends}*\n\n`;
  }

  // Per-subject table
  report += `## Subject variants\n\n`;
  report += `| ID | Sends | Opens | Open rate | Replies | Reply rate |\n`;
  report += `|----|------:|------:|----------:|--------:|-----------:|\n`;
  for (const [id, s] of Object.entries(subjects).sort((a, b) => b[1].sends - a[1].sends)) {
    report += `| ${id} | ${s.sends} | ${s.opens} | ${fmtPct(pct(s.opens, s.sends))} | ${s.replies} | ${fmtPct(pct(s.replies, s.sends))} |\n`;
  }
  report += '\n';

  // Per-CTA table
  report += `## CTA variants\n\n`;
  report += `| ID | Sends | Opens | Open rate | Replies | Reply rate |\n`;
  report += `|----|------:|------:|----------:|--------:|-----------:|\n`;
  for (const [id, c] of Object.entries(ctas).sort((a, b) => b[1].sends - a[1].sends)) {
    report += `| ${id} | ${c.sends} | ${c.opens} | ${fmtPct(pct(c.opens, c.sends))} | ${c.replies} | ${fmtPct(pct(c.replies, c.sends))} |\n`;
  }
  report += '\n';

  // Per-pair diagnostic
  report += `## Diagnosis per (subject × CTA) pair\n\n`;
  const sortedPairs = Object.values(pairs).sort((a, b) => b.sends - a.sends);
  for (const p of sortedPairs) {
    const oRate = pct(p.opens, p.sends);
    const rRate = pct(p.replies, p.sends);
    const d = diagnose(oRate, rRate, p.sends);
    report += `**${p.subjectId} × ${p.ctaId}** — ${p.sends} sends, ${fmtPct(oRate)} open, ${fmtPct(rRate)} reply\n`;
    report += `  → **${d.label}** — ${d.action}\n\n`;
  }

  // Top-level diagnosis (aggregate)
  report += `## Overall diagnosis\n\n`;
  const overall = diagnose(pct(totalOpens, totalSends), pct(totalReplies, totalSends), totalSends);
  report += `**${overall.label}** — ${overall.action}\n\n`;

  // Persist hook-performance.json
  const perfPath = path.join(__dirname, 'hook-performance.json');
  const perf = {
    updated_at: new Date().toISOString(),
    window_days: days,
    totals: { sends: totalSends, opens: totalOpens, replies: totalReplies },
    subjects, ctas, pairs,
  };
  fs.writeFileSync(perfPath, JSON.stringify(perf, null, 2));
  report += `---\nhook-performance.json updated.\n`;

  // Save report
  const reportsDir = path.join(__dirname, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(reportsDir, `${dateStr}.md`);
  fs.writeFileSync(reportPath, report);

  console.log(report);
  console.log(`Saved: ${reportPath}`);
}

if (require.main === module) run();

module.exports = { run };
