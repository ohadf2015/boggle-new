You are running the nightly landing/CVR lane for LexiClash. Today: __TODAY__. Working dir: /Users/ohadfisher/git/boggle-new.

═══ LEARNINGS FROM PRIOR RUNS ═══
__LEARNINGS__

═══ RECENT TELEGRAM-BUTTON FEEDBACK ═══
Read every `.ndjson` file in `docs/nightly/feedback/` (last 7 days). Look for lines where `callback_data` starts with `mode:`, `idea:`, or `polish:` — user feedback on prior game-mode ships / ideas / polish proposals. Treat:
  - `mode:keep:<slug>` → that mode direction worked; build adjacent concepts
  - `mode:drop:<slug>` → that mode failed; do NOT propose anything similar this week
  - `mode:promote:<slug>` → user wants to make it public; lane 5 should propose the promotion path in the report (rollout flag + landing copy + sitemap entry) for next-night work
  - `mode:tweak:<slug>` → user wants iteration; check the chat history (msg_text_first120 field) for the change request
  - `idea:build:<hash>` → user voted YES on yesterday's improvement idea (lane 4 `- Top idea:`); ship that improvement tonight to the existing admin-beta mode it targets
  - `idea:pass:<hash>` → user voted NO; don't pitch the same idea again
  - `polish:try:<slug>:<hash>` → user voted YES on a game-mode polish idea (lane-4 `#### Top game-mode improvement idea` block; slug = the `Mode:` field, hash = shasum of `Title|Mode`). **Ship THIS polish to that mode tonight in place of the landing variant.** Find the matching block in the prior report (grep `docs/nightly/reports/*.md` for the title, confirm hash) — its `Concrete change:` line is your spec. Treat as a THIRD STEP 0 evidence path on par with lane-4 ideas / loop-improvements citations; no new-mode constraint applies (you're polishing an existing route).
  - `polish:pass:<slug>:<hash>` → user vetoed that polish; don't ship it (idea-history hard-bans it from re-pitch already)
  - `polish:combine:<slug>:<hash>` → user wants rework combined with sibling concept; do NOT ship verbatim, log a note in tonight's lane-5 report for next-night lane 4 to iterate on

═══ SKILLS TO USE ═══
From the **Specialized Skills** table above, invoke the skills listed for **lane 05 landing**. Design-quality skills (`frontend-design` or `impeccable:craft`) are MANDATORY here. Use `web-interface-guidelines` or `code-review` for the post-edit review pass.

═══ GOAL ═══
**Default EVERY night: improve an existing admin-beta (admin-gated / experimental) game mode (STEP 0).** Do NOT invent new modes. Do NOT create new routes. The founder wants the not-yet-public modes made genuinely good — better UI, gameplay, variable reward, feel, graphics; less obvious/predictable; more understandable and fun — until each is worth promoting to all players. Landing-CVR work (STEP 1) is now a RARE fallback (see the fallback clause at the end of STEP 0).

═══ FOUNDER PRIORITY: EDUCATION GROWTH ═══
Driving users to the EDUCATION module is a top growth goal. When choosing this run's landing variant, strongly prefer one that targets the education / "learn to spell / build vocabulary / classroom / teachers / students" audience and routes them into the education module. The page should make the education value prop concrete and have a clear CTA into the module. (Still behind a flag, still all 5 locales, per the existing rules below.)

**SCOPE CEILING (this lane timed out 5/5 nights on over-scope — read this).** Ship the SMALLEST coherent slice that is shippable TONIGHT, not a perfect/complete deliverable:
- Mode improvement (STEP 0) = ONE axis × ONE mode (e.g. one variable-reward mechanic, OR one feel/juice pass, OR one clarity fix) editing EXISTING files. If you can't finish, ship the working part + record `status: partial` + `next_steps` so tomorrow continues it.
- Landing variant (STEP 1 fallback) = change the SINGLE highest-leverage element (hero headline OR the primary CTA OR one above-fold proof line) + its 5-locale strings + the flag wiring. NOT a full-page rewrite.
- A larger timeout is NOT the answer (already tried 1500→600→1200s). Finishing a small slice and writing the artifact beats a half-built big thing that the gate reverts.

═══ STEP 0 — Improve an existing admin-beta mode (DEFAULT — runs EVERY night, no vote required) ═══
*Permission: SHIP WITHOUT ASKING. You do NOT wait for a founder vote. Pick a target, ship ONE concrete improvement, report it. KEEP every admin gate intact — promoting a mode to the public is the founder's call (the 🚀 button), never yours.*

**This path ALWAYS has a target** (admin-beta modes always exist), so it always runs. Only the rare fallback clause at the end sends you to STEP 1. Do NOT call PostHog in STEP 0.

— A) Discover the admin-beta modes (the improvement targets; the list drifts, so re-derive nightly) —
  1. `grep -rEn "isAdmin" fe-next/app/[locale]/page.tsx fe-next/components/home/ fe-next/components/landing/ fe-next/lib/dailyModes.ts 2>/dev/null` — admin-only hub tiles + admin-only daily modes.
  2. `grep -rEn "isAdminSession|notFound\(\)" fe-next/app/[locale]/*/page.tsx 2>/dev/null` — server-gated (hard-404) routes.
  3. Known set as of 2026-06-16 (verify, don't trust blindly): `word-forge`, `shiritori/solo`, `blast/v2`, `crossword`, `word-craft` (cards/gems sub-modes gated by `gateWordCraftMode`), `word-tower` daily. Public modes (Blast, Word Wheel, Word Hunt, MP, classic Daily) are NOT targets here.

— B) Pick tonight's target (priority order; (3) is the common case) —
  1. **`mode:tweak:<slug>` callback** in `docs/nightly/feedback/*.ndjson` (last 7d) → founder asked for a specific change to that mode. Do THAT (read the `msg_text_first120` field for the ask).
  2. **`polish:try:<slug>:<hash>` callback** (last 7d) → founder voted YES on a lane-4 `#### Top game-mode improvement idea`. Find the matching block in `docs/nightly/reports/*.md` (grep the title, confirm hash); its `Concrete change:` line is your spec. Ship it.
  3. **SELF-SELECT (no vote needed — default)** → pick the admin-beta mode that most needs work AND was NOT improved in the last 3 nights. Anti-stagnation: `grep -hA2 "#### Mode improvement shipped" docs/nightly/reports/*.md | grep "^- Mode:" | tail -10` → don't repeat the most-recent mode; rotate so every mode gets attention across a week. Among candidates, choose the change with the highest felt-impact on a real player.

— C) What "improve" means — pick the ONE highest-leverage axis tonight —
  • **UI** — clearer hierarchy, better affordances, less clutter, fix a confusing layout.
  • **Gameplay** — a mechanic that adds depth or fixes a dull/confusing moment.
  • **Variable reward** — replace flat/predictable payoffs with variable-ratio rewards, streak escalation, near-miss tension, surprise drops. Strongest comeback lever.
  • **Feel / juice** — motion, sound, haptics, screen-shake, particle bursts on key moments (honor `prefers-reduced-motion`).
  • **Graphics** — sprites, palette, background, mascot presence — on-brand (read `.impeccable.md`).
  • **Defeat obviousness** — the outcome must not feel predictable nor the mechanic transparent; add hidden depth / surprise so a player can't see the whole game in 10 seconds. NEVER at the cost of first-time clarity.
  • **Understandability** — a first-timer must grasp the goal in one screen: better empty-state, a one-line rule hint, a clearer first-move affordance.
  • **Fun** — the reason to play one more round.

— D) Constraints (ALL must hold) —
- **EDIT EXISTING mode files only.** NO new route, NO new `page.tsx`, NO new hub tile, NO new mode.
- **KEEP the existing admin gate intact** (`isAdmin` / `isAdminSession` / client redirect). Do not ungate; promotion to public is the founder's 🚀 decision.
- Smallest coherent slice that SHIPS tonight (see SCOPE CEILING). One axis, one mode.
- **5 locales** (en, he, sv, ja, es) for any new strings. Hebrew RTL-safe.
- Reuse design tokens — no colors/spacing outside `tailwind.config.ts`. Design-quality skill (`frontend-design` / `impeccable:craft`) is MANDATORY. `animate-ai` only if motion serves the improvement.
- No new realtime tables. No new `auth.getUser()` calls.
- **MUST emit the report block below** so the founder gets the Telegram card. **The URL MUST use the `.live` host** — `run.sh` only sends the card when it matches `lexiclash.live`, so `.com` = no card.

  ```
  #### Mode improvement shipped
  - Mode: <name>
  - URL: https://lexiclash.live/en/<slug>/  (mirrors on /he, /sv, /ja, /es)
  - Local URL: http://localhost:3001/en/<slug>/
  - Axis: <ui | gameplay | variable-reward | feel | graphics | obviousness | understandability | fun>
  - What changed: <one line — what the player feels different>
  - Files touched: <list>
  - Next step for user: open URL or refresh home as admin, play 1 round, reply 👍/👎 to the bot
  ```

— E) Fallback to STEP 1 (RARE) —
Take a landing-CVR night INSTEAD of a mode improvement ONLY if BOTH hold: (a) an admin-beta mode was improved on ≥6 of the last 7 nights (`grep -l "#### Mode improvement shipped" docs/nightly/reports/*.md | tail -7 | wc -l` → ≥6), AND (b) a landing page converts <40% with ≥200 sessions. Otherwise STAY in STEP 0. **ONLY ONE landing variant per week** — if any `landing_variant_*_v1` flag is <7 days old, do not ship another; stay in STEP 0.

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

═══ STEP 2 — Design the variant (ONE element, per the SCOPE CEILING) ═══
Invoke the `frontend-design` skill (or `impeccable:craft`) with the existing page as context. Change exactly ONE of the elements below (the highest-leverage one) — not all of them:
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
