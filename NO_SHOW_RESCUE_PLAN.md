# No-Show Rescue — Max-Tier Feature Implementation Plan

**Status:** Proposed (2026-04-18)
**Target:** Max plan ($79/mo) differentiator
**Why:** AiSensy data shows automated WhatsApp reminders cut no-shows by 52%. For a salon, dentist, or plumber, one rescued booking/month pays the Max fee 3x over. No competitor in the $79–150/mo range bundles this with the AI receptionist itself.

---

## What it does (customer-facing)

Three automated outbound flows that run on top of the existing AI receptionist:

1. **Pre-appointment reminders** — automated WhatsApp messages 24 hours before and 2 hours before a booking. Template-based.
2. **No-show rescue** — if the customer doesn't show within 15 minutes of the booked time, the AI sends a "running late?" message with a reschedule link.
3. **Ghost recovery** — weekly digest that re-engages leads who went silent mid-conversation without booking. AI-generated personalised follow-up.

---

## Backend scoping

### Data model
- New table `scheduled_messages`: `id`, `agent_id`, `customer_phone`, `type` (reminder-24h / reminder-2h / no-show / ghost), `send_at`, `booking_id` (nullable), `status`, `sent_at`
- Index on `(send_at, status)` for fast polling
- FK to existing bookings table for reminder + no-show types

### Scheduler
- Cron job runs every 2 minutes: `SELECT * FROM scheduled_messages WHERE status='pending' AND send_at <= NOW() LIMIT 50`
- Sends via existing Baileys session for that agent
- Exponential backoff on send failure, mark `failed` after 3 retries

### Trigger points
- **Booking created** → insert 2 rows (24h reminder, 2h reminder) + 1 row (no-show check at booking_time + 15min)
- **Booking cancelled** → mark related scheduled_messages as `cancelled`
- **Weekly cron (Sunday 10am local time)** → for each Max agent, find leads with last_message > 7 days ago and no booking → insert ghost-recovery row

### Plan gating
- Add `plan` check in scheduler: skip rows where `agent.plan !== 'max'`
- Expose toggle in dashboard: "Enable no-show rescue" (on by default for Max)

### Templates
- Seed 3 default templates per industry archetype (booking/quote/consultation/reservation), editable per agent
- Variables: `{customer_name}`, `{business_name}`, `{appointment_time}`, `{reschedule_link}`

### Observability
- Track: reminders sent, no-show catches, bookings saved, ghost-recovery replies
- Surface in Max dashboard as "Revenue rescued this month" (£X estimated from rescued bookings)

---

## Build estimate

| Phase | Work | Estimate |
|---|---|---|
| Schema + migration | `scheduled_messages` table, indexes, FK | 2h |
| Scheduler + cron | Polling job, retry logic, plan gating | 4h |
| Booking hooks | Insert/cancel rows on booking lifecycle | 2h |
| Ghost cron | Weekly lead sweep | 3h |
| Template system | Per-agent templates, variable substitution | 4h |
| Dashboard UI | Toggle + stats + template editor | 6h |
| Testing | E2E with real Baileys session | 3h |
| **Total** | | **~24h / 3 days** |

---

## Risks

- **WhatsApp anti-spam** — Baileys sessions can be flagged for high-volume outbound. Rate-limit sends (max 1 message per agent per minute) and only send to customers with prior inbound message in last 30 days.
- **Template quality** — bad reminder copy erodes trust. Seed conservatively, let Max users edit before enabling.
- **Gate complexity** — make sure free + Pro agents skip the scheduler entirely, not just the UI.

---

## Ship order

1. Schema + scheduler (foundation)
2. Reminders (simplest, highest-value)
3. No-show catch (depends on reminders working)
4. Ghost recovery (last — requires lead-activity analytics)
5. Dashboard stats card ("Revenue rescued")

Each step is independently valuable. Don't batch.

---

## Related pending work (from project_state.md)

Not blockers for this feature, but should land around the same time:

- [ ] **Migrate SaaS pages to extensionless URLs** (`/signup.html` → `/signup`, etc.) — cleaner look, better SEO, matches modern SaaS convention. Do this before shipping Max copy update so we don't ship then immediately rewrite links.
- [ ] 3 blog hero images need Gemini regen (quota-waiting)
- [ ] Product Hunt launch assets
- [ ] SaaS directory submissions
- [ ] Zoho Mail setup for pat@automatyn.co

---

## Pricing copy (Max card, when shipped)

1. Unlimited conversations
2. **Auto reminders (24h + 2h)**
3. **No-show rescue**
4. **Ghost recovery**
5. Dedicated onboarding call

Replace "4-hour priority support SLA" and "Custom agent personality" when the feature ships. Those are filler; these are revenue-proving.
