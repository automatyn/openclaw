# Automatyn Business Plan

## What We Do
Self-serve AI receptionist SaaS. Businesses sign up, connect WhatsApp, and get an AI agent that answers calls, books appointments, handles inquiries, and captures leads 24/7.

Also offer professional OpenClaw setup service ($400/$800/$1500 one-time) for custom deployments.

## Website
- **Live:** https://automatyn.co (GitHub Pages, custom domain)
- **Google Search Console:** Verified, 97+ pages indexed
- **Bing Webmaster:** Indexed, IndexNow submitted
- **Design:** Midnight Operator theme (Cabinet Grotesk + DM Sans, cyan/emerald on #030303)
- **SaaS pages:** pricing.html, signup.html, dashboard.html, onboard.html, verify.html, login.html
- **Free tools:** WhatsApp auto-reply generator, AI receptionist ROI calculator
- **LLM SEO:** llms.txt, llms-full.txt, ai.txt, ai-plugin.json, 30+ crawlers in robots.txt

## SaaS Pricing

| Tier | Price | Conversations/mo |
|---|---|---|
| Free | $0 | 25 |
| Pro | $29/mo | 150 |
| Max | $79/mo | Unlimited |

Geo-pricing: US $29/$79, GB £29/£69, EU €29/€79, AU A$49/A$129, NZ NZ$49/NZ$129, CA C$39/C$99

## Setup Service Pricing (legacy)

| Tier | Price | What's included |
|---|---|---|
| Starter | $400 | Installation, 1 channel, basic security, 14-day support |
| Pro (most popular) | $800 | 3 channels, custom agent + skills, security hardening, 30-day support |
| Business | $1,500 | Unlimited channels, custom integrations, Docker sandboxing, 90-day support, onboarding call |
| Monthly Support | $150/mo | Updates, troubleshooting, priority response, 1x 30-min remote session |

## Competitive Landscape

| Competitor | Starter Price | Notes |
|---|---|---|
| SetupOpenClaw.sh | $3,000 | Premium, managed + hardware |
| OpenClawRUs | $2,000 | Setup + repair |
| OpenClaw Expert | $499 | Fast 24h setup |
| MyClaw | $599 | Mac-focused, $299/mo support |
| **Automatyn** | **$400** | Lowest entry, same-day setup |

## USP / Differentiation
- **Radical transparency:** show exact process, total cost of ownership, no hidden fees
- **Lowest entry point** in the market at $400
- **Free audit via email** -- lower friction than competitors who only offer calls
- **Monthly support at $150/mo** undercuts MyClaw ($299/mo) with same features

## Delivery Workflow
1. Client shares screen or SSH access
2. Claude Code handles installation, configuration, security, testing
3. We supervise and deliver -- typical setup: 1-2 hours (Starter), 2-3 hours (Pro)
4. Monthly support: client reports issue, we troubleshoot via Claude Code

## TikTok Content Pipeline (NataliaAI)

### Architecture (Updated 2026-04-18)
```
Claude Code (full pipeline):
  ├─ Research trending hooks + write 6-slide script
  ├─ Generate faceless images via Forge (JuggernautXL)
  ├─ Burn text overlays (Inter font, matching TikTok native style)
  ├─ Write caption + 5 hashtags max
  ├─ Audit every image before posting
  ├─ Upload to Postiz API
  └─ Post to TikTok (@realnataliana) via UPLOAD mode
```

### Image Style Rules
- **FACELESS** — back of head, silhouette, hands only, walking away. Never front-facing.
- **Dark/moody/cinematic** — low-key lighting, warm amber, deep shadows
- **iPhone photo quality** — grain, noise, raw unedited look. Not AI-looking.
- **Props** — phones with trading apps, laptops with dashboards, coffee, flat-lay objects
- **Resolution:** 768x1376 (9:16)

### Forge Setup
- **URL:** 100.107.24.7:7860 via Tailscale
- **Model:** JuggernautXL Ragnarok (SDXL)
- **Steps:** 25-28, CFG: 6.5, Sampler: DPM++ 2M Karras
- **Generation time:** ~3 min per slide at 768x1376

### Carousel Formula (Tier 1)
6 slides: Hook → Problem → Discovery → Transformation 1 → Transformation 2 → CTA
Pattern: Person + Conflict → AI → Changed Mind
End with: "Shadow Agency. [tagline]. Follow for more."

### Posting
- Posts via Postiz API using UPLOAD mode (arrives as draft in TikTok inbox)
- User adds trending audio before publishing (silent carousels get buried)
- Max 5 hashtags per post

### Content Archive
- ad_037 (Apr 13): sister/job theme
- ad_038 (Apr 14): shopping/salary theme
- ad_039 (Apr 15): therapist theme
- ad_040 (Apr 18): boss/quiet theme

## Progress Log

### 2026-03-25 (Session 1)
- Website fully redesigned: Satoshi font, gradient wordmark, dark theme
- Removed fake testimonials, replaced with honest copy
- Added free email audit CTA
- Competitive pricing set: $400 / $800 / $1,500
- SEO overhaul: keyword-optimized meta, sitemap, robots.txt
- Repo renamed to automatyn.github.io (root domain for SEO)
- Google Search Console verified + sitemap submitted
- Tested full TikTok slide generation pipeline via Forge
- Generated 6-slide carousel with self-review process (all 6 slides in hooks-queue/test-job-001/)
- Generated 3 variations for slide 5, selected best (penthouse + multiple devices)
- Designed split workflow: Telegram bot (research/overlay/metrics) + Claude Code (image gen)

### 2026-03-25 (Session 2)
- Connected Postiz API to TikTok (realnataliana account)
- Uploaded all 6 slides to Postiz successfully
- Attempted carousel post → discovered Postiz TikTok photo posting is broken (bugs #1338, #1220, #1059)
- Attempted video post (ffmpeg slideshow from 6 slides, 21s, 1.3MB) → also ERROR state
- Investigated root cause: Postiz code drops privacy_level in UPLOAD mode + TikTok 5 pending shares limit
- Contacted Postiz support — confirmed it's a known issue
- Decision: switch to video format instead of photo carousels
- Set up ComfyUI connection (100.107.24.7:8188, RTX 4070, 8GB VRAM)
- Started downloading Wan2.2 i2v models (~19GB): main model, text encoder, VAE, speed LoRA
- Decided to use Natalia character (trained LoRA) for all TikTok content — builds consistent brand
- Pipeline upgraded: still images → animated video clips → stitched TikTok video
- Claude Code now handles: image gen, video gen, text overlay, captions, Postiz upload (full pipeline)

### 2026-04-04 (Major Session)
- Custom domain purchased: automatyn.co ($12.48/yr on Namecheap)
- DNS configured, GitHub Pages serving on automatyn.co
- HTTPS enabled, all 65 internal URLs migrated from github.io
- Google Search Console verified for automatyn.co + sitemap submitted
- Bing indexed + IndexNow submitted for instant ChatGPT visibility
- GEO optimization: robots.txt (allows all AI crawlers), llms.txt, enhanced JSON-LD schema
- Answer-first content added for LLM crawler extraction
- Blog post #2 published: "What is OpenClaw and Why Every Business Needs It in 2026"
- Blog trigger updated to daily (using $100 Anthropic credit)
- WhatsApp demo added to homepage — cycles through 3 business types
- Demo upgraded to multi-platform: WhatsApp/Telegram/Discord with platform-specific UI
- Full site redesign: Midnight Operator theme (3 iterations)
  - v1: Gold/amber (rejected — looked muddy)
  - v2: LocalClaw-style split hero (rejected — copycat)
  - v3: Demo-centrepiece with flanking stats (final — unique)
- Applied frontend-design skill + antigravity skills (ux-persuasion, loss-aversion, marketing-psychology)
- Persuasion architecture implemented:
  - Section reorder: Comparison → Case Study → Price Anchoring → Pricing
  - Price anchoring: VA $2K/mo vs SaaS $200/mo vs Automatyn $400 one-time
  - Loss framing: "Every week without automation is lost time and missed leads"
  - Risk-reversal: 14-day guarantee on every pricing CTA
  - Varied CTAs: Get Started / Book Free Call / Talk to Us
- Launch discount banner: "First 5 setups at 50% off"
- Email forwarding: support@automatyn.co → patrickssons@outlook.com
- Brevo email sequence running (Day 2/5/7 follow-ups)
- Product Hunt launch scheduled for 2026-04-05 (12:01 AM Pacific)
- PH monitoring script created (ph_monitor.py)
- Browser Use + Frontend Design skills installed for Claude Code
- Antigravity Awesome Skills installed (1,234+ skills)
- ChatGPT confirmed finding automatyn.co when queried directly
- Favicon: cyan "A" on dark background
- Logo: "Automatyn." clean typographic (Cabinet Grotesk)
- Blog posts updated to match Midnight Operator theme
- Content ready to publish: 3 Medium articles, 10 Quora answers, 16 directory listings

### Audit Scores (2026-04-04)
| Skill | Score |
|---|---|
| Frontend Design | 4.4/5 |
| UX Persuasion (Fogg/Cialdini) | 4.4/5 |
| Loss Aversion (Kahneman) | 5.0/5 |
| Marketing Psychology (PLFS) | 3.8/5 |
| Landing Page Generator (PAS) | 4.8/5 |
| **Overall** | **4.5/5** |

### LLM Visibility (2026-04-04)
| Platform | Status |
|---|---|
| ChatGPT | ✅ Found when queried directly |
| Copilot | ✅ Bing indexed |
| Perplexity | ⚠️ Pending (1-3 days) |
| Google Gemini | ⚠️ Pending (1-3 days) |
| Google Search | ⚠️ Minimal — domain is new |
| Bing Search | ✅ Indexed (22 mentions) |

### 2026-04-17 (Major Session)
- **Paddle payments fully integrated** (primary MoR, verified, live)
  - Products: Pro $29/mo (pri_01kp9nmg87gyapxj153wv8t4y9), Max $79/mo (pri_01kp9nmhq88fnny2ha7b37yxy2)
  - Paddle.js checkout overlay directly in dashboard (VM-independent)
  - Webhook endpoint with HMAC-SHA256 signature verification
  - DodoPayments as fallback (still in review)
- **Email marketing infrastructure built**
  - 3 Brevo contact lists: SaaS Signups, Guide Downloads, Demo Requests
  - Homepage email forms POST to /api/capture
  - 4-email onboarding drip: welcome → WhatsApp nudge (day 2) → social proof (day 4) → upgrade (day 7)
  - Industry-specific social proof emails (plumbing, salon, cleaning, restaurant)
  - All transactional emails redesigned with branded dark theme
- **Dashboard sign out** added (dropdown on biz-pill + mobile button)
- **Onboard dropdown** fixed (was dropping up on mobile)
- **Security hardened**: webhook fail-closed, XSS fix, legacy endpoints removed, body size limits

### 2026-04-18 (TikTok Session)
- **TikTok pipeline rebuilt** — Claude Code now handles full carousel pipeline
  - Bot no longer posts to TikTok (conserves Gemini API keys)
  - ad_040 generated and posted: "boss/quiet" theme, faceless dark moody style
  - Learned: images must be faceless, dark/moody, iPhone-quality (NOT AI-looking)
  - Learned: UPLOAD mode works for carousels (DIRECT_POST silently fails)
  - Learned: text overlay needs improvement (switch to Inter font, smaller size)
  - All pipeline knowledge documented in memory for future sessions

## Infrastructure Status (2026-04-18)

| Component | Status |
|---|---|
| Website (GitHub Pages) | ✅ Live, 97+ pages |
| SaaS API (Express.js) | ✅ Running on port 3001 via systemd |
| Payments (Paddle) | ✅ Live, verified, Paddle.js checkout |
| Email (Cloudflare + Brevo) | ✅ Inbound routing + outbound transactional + drip |
| Auth (magic link + Google OAuth) | ✅ Working |
| WhatsApp (Baileys multi-tenant) | ✅ Per-agent QR/pairing |
| TikTok (Forge + Postiz) | ✅ Carousel pipeline working |
| Google Search Console | ✅ 97+ pages indexed |
| Bing/IndexNow | ✅ Indexed |

## Next Steps
- [ ] Get first paying customer
- [ ] Improve TikTok text overlay (Inter font)
- [ ] 3 blog hero images need Gemini regen
- [ ] Product Hunt launch assets
- [ ] SaaS directory submissions
- [ ] Daily TikTok carousel posting cadence
- [ ] Add real testimonials when customers arrive
