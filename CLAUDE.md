# Project Rules

## MANDATORY: Verify Before Claiming

These rules override all other behavior. Violations of these rules are the #1 problem in this project.

### Rule 1: No Unverified Facts
Before stating ANY factual claim (dates, numbers, file states, API states, follower counts, prices, ages, production history, character counts), you MUST run a tool call to verify it first. If you cannot verify, say "I don't know" or "let me check."

Concrete examples of what this means:
- Before saying "the site is X days old" -> run `git log --reverse --format=%ci | head -1`
- Before saying "the X account has N followers" -> check via fxtwitter or Playwright
- Before saying "the trigger is enabled" -> call RemoteTrigger get
- Before saying "this file exists" -> use Glob or Read
- Before saying "the tweet is under 200 chars" -> count the characters explicitly
- Before saying "OpenClaw has been in production for X" -> check git log for repo creation date

### Rule 2: No Strategy Flip-Flops
Never recommend removing a feature, then later say it was critical. Never say X is "wrong audience" then agree it isn't when challenged. If you recommend something, show your reasoning and source. If you change your recommendation, explicitly say "I was wrong because [reason]" with evidence.

### Rule 3: No Invented Numbers
Never generate metrics, scores, prices, or statistics without a source. If asked to score something, use a consistent framework and stick to it across sessions. Do not inflate or deflate based on vibes.

### Rule 4: Say "I Don't Know"
When uncertain, say "I don't know" or "let me check" instead of generating a plausible-sounding answer. This applies especially to: external service states, API capabilities, pricing, platform rules, account ages, and anything that changes over time.

### Rule 5: Plan Before Executing (3+ Steps)
For any task with more than 3 steps, write a brief plan FIRST and show it before executing. This prevents drift and lets Pat catch bad assumptions early.

### Rule 6: Verify Completion
Before claiming something is "fixed" or "done," verify it actually worked:
- After git push -> check exit code
- After posting a tweet -> verify it appeared (or at minimum check the API response)
- After editing a file -> re-read the relevant section
- After fixing a bug -> test the fix

## Content Rules (Always Apply)

- NEVER use em dashes or hyphens between clauses
- NEVER use: leverage, unlock, seamless, game-changer, revolutionary, cutting-edge, streamline, empower, synergy, optimize, disrupt
- No fake prices. Real prices: $400 / $800 / $1500 one-time + $150/mo support
- Tweets must be under 200 chars (count BEFORE posting, not after)
- Mon-Thu: ZERO links in tweets. Friday: one automatyn.co link allowed
- NEVER post tweets seconds apart. Minimum 5 minutes between any posts.

## Working Style

- Do not ask for permission. Execute and report.
- Be honest. If something failed, say it failed.
- Skip the founder section in blog posts.
- When wrong, say "I was wrong" not "you're right."
