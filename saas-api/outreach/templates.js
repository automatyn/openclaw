// Cold email templates for UK plumbers.
// Principles baked in:
// - Subject lines lowercase, curious, under 50 chars
// - Opening specific to the business (via {{intro_line}})
// - Pain stated in plumber terms, not SaaS jargon
// - Short (~70-90 words body), mobile-readable
// - Founder-led signature, first name only
// - Clear unsubscribe
//
// Variant tracking (Larry-brain framework):
// - E1 subject variants (hook): SUBJECTS_E1 — 3 options, rotated per send
// - E1 CTA variants (close): CTAS_E1 — 4 options, rotated per send
// - Each send records subject_id + cta_id on the lead for per-variant attribution
// - daily-report.js applies diagnostic matrix:
//     high opens + high replies → SCALE
//     high opens + low replies → FIX CTA
//     low opens + high replies → FIX SUBJECT
//     low opens + low replies → FULL RESET

function render(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : '');
}

// E1 SUBJECT VARIANTS (hooks)
const SUBJECTS_E1 = {
  S1: 'quick question about {{business_name}}',
  S2: '{{business_name}} — missed evening enquiries?',
  S3: 'after-hours WhatsApp for {{business_name}}',
};

// E1 CTA VARIANTS (close — slot into the end of the body)
// All honest, using only real assets (signup link, setup offer, qualifier).
const CTAS_E1 = {
  C1_binary: `Want me to set yours up this week — yes or no?`,
  C2_reverse: `Are you already replying to WhatsApp within 5 minutes? If yes, ignore this.`,
  C3_qualifier: `Are you on WhatsApp Business, or the personal app?`,
  C4_link: `automatyn.co/plumbers if you want to skip the pitch.`,
};

// E1 body skeleton — CTA is appended at the end.
function renderE1Body(vars, cta) {
  return `${vars.greeting}${vars.intro_line}

Quick one. When someone WhatsApps ${vars.business_name} at 7am with a burst pipe, who answers before you're up?

I built a tool that pairs to your WhatsApp Business in about 2 minutes, answers after-hours messages, takes bookings, and pings you with the lead.

${cta}

Patrick
Founder, Automatyn
${vars.unsubscribe_line}`;
}

// EMAIL 2 — Day 3 follow-up
const EMAIL_2 = {
  subject: 're: {{business_name}}',
  body: `{{greeting}}Bumping this up in case it got buried.

The tool sits on your existing WhatsApp Business number — you don't need a new phone or app. When a customer messages after hours, it replies instantly ("I'm out on a job, Patrick will confirm in the morning"), captures their details and the problem, and you see everything when you wake up.

Takes two minutes to try. If it's not useful, you unpair it and nothing changes.

automatyn.co/plumbers — link's here if you want to skip the pitch.

Patrick
{{unsubscribe_line}}`,
};

// EMAIL 3 — Day 5 breakup
const EMAIL_3 = {
  subject: 'last one',
  body: `{{greeting}}Last email from me, promise.

If missed evening enquiries aren't costing you bookings, ignore this. If they are — it's 2 minutes to set up and free forever on the starter tier.

automatyn.co/plumbers

Either way, wishing {{business_name}} a solid week.

Patrick
{{unsubscribe_line}}`,
};

function buildUnsubscribeLine(email, token) {
  const url = `https://api.automatyn.co/u?e=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}`;
  return `\n---\nNot interested? ${url}`;
}

function firstName(business_name) {
  if (!business_name) return 'there';
  const word = business_name.trim().split(/\s+/)[0];
  if (!word) return 'there';
  const skip = new Set([
    'the', 'a', 'an', 'mr', 'mrs', 'ms', '24/7',
    'london', 'leeds', 'manchester', 'birmingham', 'liverpool', 'sheffield',
    'bristol', 'nottingham', 'newcastle', 'leicester', 'glasgow', 'edinburgh',
    'cardiff', 'mayfair', 'east', 'west', 'north', 'south', 'central',
    'city', 'national', 'royal', 'best', 'premier', 'rapid', 'fast',
    'urgent', 'express', 'elite', 'prime', 'top', 'first', 'pro',
    'quick', 'smart', 'super', 'ultra', 'gold', 'silver', 'diamond',
    'ace', 'star', 'crown', 'empire', 'universal', 'metro', 'greater',
    'piccadilly', 'mayfair', 'kensington', 'chelsea', 'fulham', 'hackney',
    'islington', 'camden', 'wandsworth', 'tooting', 'wimbledon',
    'plumbing', 'heating', 'gas', 'boiler', 'pipe', 'pipes',
    'emergency', 'reliable', 'affordable', 'trusted',
  ]);
  if (skip.has(word.toLowerCase())) return 'there';
  if (/^[A-Z][a-z]+$/.test(word)) return word;
  return 'there';
}

// Round-robin variant picker based on an integer seed (e.g. count of sends).
// Stateless; caller passes seed so assignment is deterministic + distributable.
function pickVariantRoundRobin(keys, seed) {
  const arr = Object.keys(keys);
  return arr[seed % arr.length];
}

function buildEmail(step, lead, unsubscribeToken, opts = {}) {
  const name = lead.first_name && lead.first_name.trim() ? lead.first_name.trim() : '';
  const vars = {
    first_name: name,
    greeting: name ? `Hi ${name},\n\n` : '',
    business_name: lead.business_name || 'your business',
    intro_line: lead.intro_line || '',
    unsubscribe_line: buildUnsubscribeLine(lead.email, unsubscribeToken),
  };

  if (step === 1) {
    const subjectId = opts.subjectId || 'S1';
    const ctaId = opts.ctaId || 'C1_binary';
    const subjectTpl = SUBJECTS_E1[subjectId] || SUBJECTS_E1.S1;
    const ctaText = CTAS_E1[ctaId] || CTAS_E1.C1_binary;
    return {
      subject: render(subjectTpl, vars),
      body: renderE1Body(vars, render(ctaText, vars)),
      subjectId,
      ctaId,
    };
  }

  const tpl = step === 2 ? EMAIL_2 : EMAIL_3;
  return {
    subject: render(tpl.subject, vars),
    body: render(tpl.body, vars),
  };
}

module.exports = {
  buildEmail,
  firstName,
  SUBJECTS_E1,
  CTAS_E1,
  pickVariantRoundRobin,
  EMAIL_2,
  EMAIL_3,
};
