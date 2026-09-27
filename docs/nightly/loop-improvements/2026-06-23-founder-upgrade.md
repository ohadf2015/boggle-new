# Nightly loop upgrade — 2026-06-23 (founder directive)

Founder goal (verbatim intent): surface new-landing-page URLs; audit ONE game mode per night
for production readiness (start Word Tower, be a harsh critic, multi-night handoff to ≥90%);
more autonomy / fewer human hand-offs; faster site without bugs; drive users to the education
module (landing pages + keywords + competitor research); better, more goal-focused prompts —
without dropping critical lanes.

## What changed

### 1. New lane `11-mode-qa` — mode production-readiness QA (headline)
- `prompts/11-mode-qa.md`, `lanes/11-mode-qa.sh` (sonnet, 25-min cap), `lib/mcp-config.sh` (+posthog).
- **Code-audit-first** (reliable headless): bugs, edge cases, UI-from-code, clarity, i18n×5, a11y, perf.
- **Visual QA is a verified bonus** under a HARD anti-fabrication rule: no on-disk screenshot ⇒ no
  visual claim. Capture uses the `?word-tower=1` gate-override on prod, or a local dev server.
  (Rationale: prior nightly browser runs fabricated results; admin/beta gating blocks naive capture.)
- **Multi-night handoff** via durable ledger `docs/nightly/mode-readiness.md`: the lane stays on the
  current mode across nights until readiness ≥90%, then promotes it to *Released* and pulls the next
  from the queue. Word Tower seeded first (closest to release).
- Scores readiness 0–100 harshly; fixes what's safe (autonomy + 4 rails); writes a
  `#### Mode readiness verdict` block the orchestrator turns into a Telegram card.

### 2. Landing/page URL surfacing → Telegram
- `lib/landing-cards.sh` (TDD, `test/landing-cards.test.sh`, 12 cases): maps the night's authored
  app-router `page.tsx` files to `https://www.lexiclash.live/<locale>/<route>` URLs (handles route
  groups `(..)`, `[locale]`→`/en`, root, skips unknowable `[slug]` routes).
- `run.sh` sends a 🌐 *New / updated pages* card after the digest when the run touched any page route.
- Note: no Vercel auto-deploy (Railway, watches `fe-next/**`) — URLs open once the deploy completes.

### 3. Lane reorder (budget protection, no new skip logic)
- `LANES` reordered PRIORITY-FIRST: `01-triage 11-mode-qa 02-perf 05-landing 06-seo 03-engagement
  07-self-learn 10-dictionary 09-monetization 04-competitor 08-adsense`.
- Mode-QA runs at position 2 so the headline lane executes before the shared usage window can drain.
- The existing circuit breaker already defers the *tail* under budget pressure — now the tail is the
  genuinely-low-value-per-night lanes (competitor/adsense). Nothing critical dropped on a healthy night.
  Safe because the loop matches lanes by NAME, not position.

### 4. Standing FOUNDER PRIORITIES block (every lane)
- Added to `lib/headless.sh` `nightly_artifact_contract` (beside the existing REVENUE standing block),
  injected into EVERY lane: (1) speed without bugs, (2) mode release-quality, (3) education growth,
  (4) ship-more-defer-less autonomy that NEVER loosens the 4 safety rails.

### 5. Targeted prompt edits (education + perf focus)
- `02-perf.md`: FOUNDER PRIORITY: SPEED. `05-landing.md`: EDUCATION GROWTH. `06-seo.md`: EDUCATION
  KEYWORDS. `04-competitor.md`: EDUCATION COMPETITORS.

## Critical lanes preserved
Triage, gate-isolated, git-ship, wip-revert, circuit breaker, and the 4 safety rails are
untouched/additive. No lane deleted or permanently disabled.

## Recommended follow-up (NOT built this session — orthogonal reliability work)
Tonight's lane-07 self-review (`2026-06-23.md`) independently ranks **lane-start stagger + concurrency
cap** as the #1 reliability fix for the shared-usage cascade. The reorder above mitigates it for the
headline lane but does not solve the general cascade — that stagger is the right next loop-infra change.
