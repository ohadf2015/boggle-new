You are running the nightly landing/CVR lane for LexiClash. Today: __TODAY__. Working dir: /Users/ohadfisher/git/boggle-new.

═══ LEARNINGS FROM PRIOR RUNS ═══
__LEARNINGS__

═══ GOAL ═══
Pick the WORST-converting landing page with ≥200 sessions in the last 14d and ship ONE variant behind a typed flag `landing_variant_<slug>_v1`. Goal = lift sign-up or game-start conversion.

**ONLY ONE landing variant per week** — if any `landing_variant_*_v1` flag is <7 days old, skip this lane and log "deferred — recent variant still measuring."

═══ HARD RULES ═══
- **Ground-truth audit** before writing copy: read `fe-next/public/llms.txt`, `fe-next/app/sitemap.ts`, and the actual mode pages your copy references. No fabricated features, modes, languages.
- **NO fake stats** ("10K+ players", "4.8★ rating") and **no `aggregateRating` JSON-LD**.
- **POSITIVE framing** — never "0 downloads"/"0 ads"; "browser-based", "ad-free", "free".
- **5 locales required** for any new strings (en, he, sv, ja, es). Hebrew RTL-safe.
- **Reuse design tokens** — no new colors/spacing outside `tailwind.config.ts` palette. Read `.impeccable.md` for brand context.

═══ STEP 1 — Pull CVR data ═══
Use **posthog** MCP. For each landing route (homepage + every `/[locale]/<mode>` and `/[locale]/<gsc-landing>`):
  • Sessions last 14d
  • Conversion to `game_started` (mode plays) and `signup_complete`
  • Pick the route with ≥200 sessions AND lowest CVR

Skip if all landings are within 10% of each other (no clear loser).
Skip if no landing has ≥200 sessions (too noisy).

═══ STEP 2 — Design the variant ═══
Invoke the `frontend-design` skill (or `impeccable:craft`) with the existing page as context. Generate ONE variant. Areas to consider:
  • Hero copy (front-load value prop in user's language)
  • CTA clarity ("Play free, no signup" beats "Get started")
  • Above-fold proof (real evidence — supported languages, modes — not fabricated)
  • Trust signal (browser-based, ad-free, free) using POSITIVE framing
  • Reduced friction (CTA → game in ≤2 clicks)

Optionally invoke `animate-ai` for ONE entrance animation IF it serves CTA visibility — never gratuitous. Honor `prefers-reduced-motion`.

═══ STEP 3 — Ship as variant ═══
- Add typed flag `landing_variant_<slug>_v1` to the experiments registry (grep `experiments/` or `getTypedExperiment` for pattern).
- Variant rendered when flag = `'variant'`; default = current page (control).
- New strings in all 5 locale files.
- Track `landing_variant_view` + `landing_variant_cta_click` events with `variant: 'control'|'variant'`.

═══ STEP 4 — Self-review ═══
Invoke `code-review` skill on your diff. Address findings before stopping. (NB: skill output is advisory; build/lint/test in shell is authoritative.)

═══ STEP 5 — Cap + finish ═══
PER-LANE CAP: __PER_LANE_CAP__ files. If exceeded, drop animation or trim trust signals.

DO NOT COMMIT. DO NOT PUSH.

═══ STEP 6 — Append to nightly report ═══
Append to `docs/nightly/reports/__TODAY__.md`:

```
### Lane 4 — Landing/CVR
- Target page: <route> (CVR <today%>, sessions <n>)
- Variant flag: `landing_variant_<slug>_v1`
- Hypothesis: <H>
- Locales touched: <list>
- Design skill: <frontend-design | impeccable | skipped>
- Animate-ai: <yes/no — purpose>
```
