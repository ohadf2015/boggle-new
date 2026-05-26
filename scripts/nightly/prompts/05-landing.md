You are running the nightly landing/CVR lane for LexiClash. Today: __TODAY__. Working dir: /Users/ohadfisher/git/boggle-new.

═══ LEARNINGS FROM PRIOR RUNS ═══
__LEARNINGS__

═══ RECENT TELEGRAM-BUTTON FEEDBACK ═══
Read every `.ndjson` file in `docs/nightly/feedback/` (last 7 days). Look for lines where `callback_data` starts with `mode:`, `idea:`, or `polish:` — user feedback on prior game-mode ships / ideas / polish proposals. Treat:
  - `mode:keep:<slug>` → that mode direction worked; build adjacent concepts
  - `mode:drop:<slug>` → that mode failed; do NOT propose anything similar this week
  - `mode:promote:<slug>` → user wants to make it public; lane 5 should propose the promotion path in the report (rollout flag + landing copy + sitemap entry) for next-night work
  - `mode:tweak:<slug>` → user wants iteration; check the chat history (msg_text_first120 field) for the change request
  - `idea:build:<hash>` → user voted YES on yesterday's idea; ship it tonight
  - `idea:pass:<hash>` → user voted NO; don't pitch the same idea again
  - `polish:try:<slug>:<hash>` → user voted YES on a game-mode polish idea (lane-4 `#### Top game-mode improvement idea` block; slug = the `Mode:` field, hash = shasum of `Title|Mode`). **Ship THIS polish to that mode tonight in place of the landing variant.** Find the matching block in the prior report (grep `docs/nightly/reports/*.md` for the title, confirm hash) — its `Concrete change:` line is your spec. Treat as a THIRD STEP 0 evidence path on par with lane-4 ideas / loop-improvements citations; no new-mode constraint applies (you're polishing an existing route).
  - `polish:pass:<slug>:<hash>` → user vetoed that polish; don't ship it (idea-history hard-bans it from re-pitch already)
  - `polish:combine:<slug>:<hash>` → user wants rework combined with sibling concept; do NOT ship verbatim, log a note in tonight's lane-5 report for next-night lane 4 to iterate on

═══ SKILLS TO USE ═══
From the **Specialized Skills** table above, invoke the skills listed for **lane 05 landing**. Design-quality skills (`frontend-design` or `impeccable:craft`) are MANDATORY here. Use `web-interface-guidelines` or `code-review` for the post-edit review pass.

═══ GOAL ═══
Default: pick the WORST-converting landing page with ≥200 sessions in the last 14d and ship ONE variant behind a typed flag `landing_variant_<slug>_v1`. Goal = lift sign-up or game-start conversion.

**ONLY ONE landing variant per week** — if any `landing_variant_*_v1` flag is <7 days old, skip the landing variant and consider STEP 0 instead.

═══ STEP 0 — Experimental game mode OR polish (DEFAULT path — try this FIRST) ═══
*Permission granted by user (see `Permissions` block in preamble). Updated 2026-05-19: mode lives at its natural route; the hub tile that links to it is wrapped in an `isAdmin` check so only the admin sees the entry point. User playtests manually then decides on public rollout.*

**Execution order: STEP 0 is the DEFAULT.** Only fall through to STEP 1 (landing CVR) if NONE of these signals fire:

1. **`polish:try:<slug>:<hash>` callback in `docs/nightly/feedback/*.ndjson` from the last 7 days** — founder explicitly voted YES on a polish idea. Find the matching `#### Top game-mode improvement idea` block in `docs/nightly/reports/*.md` (grep the title) and SHIP its `Concrete change:` line tonight. This is the strongest signal — never override it with STEP 1.
2. **`idea:build:<hash>` callback in feedback ndjson** — founder voted YES on a game-mode idea. Build it tonight as an experimental mode (see constraints below).
3. **NEW game-mode concept in `docs/nightly/loop-improvements/*.md` (last 3 nights) OR `docs/nightly/ideas/*.md` (lane 4)** with ≥2 mentions of evidence (data citation + competitor signal) — ship as experimental mode.

If ANY of (1)/(2)/(3) fires → ship via STEP 0, skip STEP 1 entirely, do NOT call PostHog. If NONE fires → fall through to STEP 1 (bounded).

Constraints (ALL must hold):
- **Mode route at its natural slug**: `fe-next/app/[locale]/<mode-slug>/page.tsx`. The page itself is plain code — no auth gate, no admin lock. If a non-admin types the URL they get the game, but they should never have a path to discover it.
- **Admin-only hub tile**: add the entry-point tile/card to the home/hub component (e.g., `fe-next/app/[locale]/page.tsx` or whatever the current hub is — grep for the existing mode tiles like Multiplayer/Daily/Adventure to find the pattern). Wrap it in `{isAdmin && <ExperimentalTile slug="<slug>" />}`. Reuse the existing `isAdmin` hook/helper — grep for `useIsAdmin` / `isAdmin` to find the pattern (memory `wordcraft-mvp-2026-05-04` ships an admin tile pattern).
- **No sitemap entry, no llms.txt entry, no header nav link** — the URL exists, the discovery surface is gated.
- **No rollout flag, no Playwriter mandate**: user playtests manually after you ship. Just make sure the page loads + the core loop works on your visual inspection during development.
- Pick a focused mode (one new route + minimal client logic + the hub-tile wiring + a route-scoped test). No file-count cap, but stay coherent. No new realtime tables. No new `auth.getUser()` calls.
- **MUST emit the mode URL in the report** so the user sees the link in tomorrow's Telegram digest. Use this exact format in the lane-5 section of `docs/nightly/reports/__TODAY__.md`:

  ```
  #### Experimental game mode shipped
  - Mode: <name>
  - URL: https://lexiclash.com/en/<slug>/  (mirrors on /he, /sv, /ja, /es)
  - Local URL: http://localhost:3001/en/<slug>/
  - Hub tile: admin-only via `{isAdmin && ...}` in <hub file:line>
  - Concept: <one-line>
  - Lane-4 / loop-improvements evidence: <link or quote>
  - Files added: <list>
  - Next step for user: open URL or refresh home as admin, play 1 round, send 👍/👎 to bot
  ```

If none of the STEP 0 signals (polish:try, idea:build, evidenced new concept) fire, only THEN fall through to STEP 1.

═══ HARD RULES ═══
- **Ground-truth audit** before writing copy: read `fe-next/public/llms.txt`, `fe-next/app/sitemap.ts`, and the actual mode pages your copy references. No fabricated features, modes, languages.
- **NO fake stats** ("10K+ players", "4.8★ rating") and **no `aggregateRating` JSON-LD**.
- **POSITIVE framing** — never "0 downloads"/"0 ads"; "browser-based", "ad-free", "free".
- **5 locales required** for any new strings (en, he, sv, ja, es). Hebrew RTL-safe.
- **Reuse design tokens** — no new colors/spacing outside `tailwind.config.ts` palette. Read `.impeccable.md` for brand context.

═══ STEP 1 — Pull CVR data (BOUNDED — was the lane's 0/6 root cause) ═══

**EXECUTION RULE — max 2 PostHog calls, hard-bail after 180s wall-clock**

The old "for each landing route" loop is what made this lane 0/6 for six nights running (05-21..05-26): PostHog `query-trends` with breakdowns hangs intermittently, and looping over ~91 route directories × 5 locales burned the entire 1500s budget before any code was written. Constrain hard:

1. **Call 1 (homepage CVR, ~60s budget)**: ONE PostHog trends query, no breakdown:
   - `event: $pageview`, filter `$pathname starts_with "/en/"` (no per-locale split), `dateRange: -14d`
   - Compute CVR as `game_started` count / `$pageview` count over the same window
2. **Call 2 (ONLY if call 1 succeeded AND CVR < 40%)**: ONE trends query with `breakdownBy: $pathname`, limit 10
   - Pick the route with ≥200 sessions AND lowest CVR; that's your target

**If either call hangs (returns `MCP_TOOL_TIMEOUT` / takes >90s / errors):** SKIP STEP 1 entirely and execute STEP 0 instead — it doesn't need PostHog (reads `docs/nightly/loop-improvements/*.md` + `docs/nightly/feedback/*.ndjson`). Do NOT retry. Do NOT try a third call. The polish / experimental-mode path is fully viable without CVR data.

**If homepage CVR ≥40% AND no clear loser in call 2:** also skip to STEP 0 (no signal to act on).

**Never** invoke `mcp__posthog__exec` more than 2 times in this lane. If a fix genuinely needs more data, log a follow-up in `docs/nightly/triage-queue.md` and exit cleanly — don't burn the budget chasing it.

═══ STEP 2 — Design the variant ═══
Invoke the `frontend-design` skill (or `impeccable:craft`) with the existing page as context. Generate ONE variant. Areas to consider:
  • Hero copy (front-load value prop in user's language)
  • CTA clarity ("Play free, no signup" beats "Get started")
  • Above-fold proof (real evidence — supported languages, modes — not fabricated)
  • Trust signal (browser-based, ad-free, free) using POSITIVE framing
  • Reduced friction (CTA → game in ≤2 clicks)

Optionally invoke `animate-ai` for ONE entrance animation IF it serves CTA visibility — never gratuitous. Honor `prefers-reduced-motion`.

OPTIONAL — image generation via mcp-image: if the variant needs a hero illustration AND no existing asset fits, use `mcp__mcp-image__generate_image` to produce one. Prompt should match brand context (read `.impeccable.md`): kawaii marshmallow cube mascot, white bg, electric color-coded modes (lime/pink/cyan/purple). Save under `fe-next/public/landing/<slug>-<n>.png`. Prefer an existing asset; generate only if the variant truly needs a hero illustration.

═══ STEP 3 — Ship as variant ═══
- Add typed flag `landing_variant_<slug>_v1` to the experiments registry (grep `experiments/` or `getTypedExperiment` for pattern).
- Variant rendered when flag = `'variant'`; default = current page (control).
- New strings in all 5 locale files.
- Track `landing_variant_view` + `landing_variant_cta_click` events with `variant: 'control'|'variant'`.

═══ STEP 4 — Self-review ═══
Invoke `code-review` skill on your diff. Address findings before stopping. (NB: skill output is advisory; build/lint/test in shell is authoritative.)

═══ STEP 5 — Cap + finish ═══
NO FILE-COUNT CAP — ship everything the work genuinely needs. The lint/test/build gate validates correctness and changes are encapsulated (only your own files are touched), so never drop real edits to hit a number; just keep the change focused + coherent.

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
