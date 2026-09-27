# Brain Gym Rework — Spec (2026-06-04)

> Goal: make Brain Gym **easier to understand, warmer/more encouraging, more fun, better-looking, and more forgiving**. Clarify each mini-game's purpose; soften scoring without making it pointless. Use `/impeccable` + `/animate-ai` for polish, generate on-brand assets via image MCP.

Grounded in: existing-code map, council (gemini + grok), advisor review.

## Core principle (the one decision that matters)

**Forgive the DISPLAY, keep the METRIC honest.**

- The player-facing **displayScore** is floored + badged + warmly framed → never insulting, never 0-feeling, never "Game Over."
- The **performanceScore** fed to the cognitive-domain calc stays HONEST. We do **not** floor the domain delta. The existing EMA already forgives bad days; flooring it would drift the radar/tiers/history upward regardless of skill and turn the dashboard into a participation trophy — fighting the "clear purpose" goal.
- In practice the domain calc runs server-side off the *submitted* score, so honesty = **submit the raw score unchanged**; compute `displayScore` purely client-side for the celebratory number + badge + gold floor. Honesty preserved by omission.

This split is the contract encoded in `drillScoring` tests (wiped session → `performanceScore` 0 but `displayScore` > 0).

## Phase 0 — shared primitives (TDD) ✅
- `shared/utils/drillScoring.ts` — `calculateForgivingDrillScore` + `badgeForRatio`. 13 tests.
- `lib/drills/drillThemes.ts` — per-drill persona/accent/mascot/i18n-keys. Reuses EXISTING mascot variants (powerup/scholar/onfire/flexing/explorer). 10 tests.

## Phase 1 — UI primitives ✅
- `components/brain/DrillBriefing.tsx` — themed ready screen: mascot + persona, mission, benefit, 3-step how-to, coach tip, goal, themed CTA. 6 tests.
- `components/brain/DrillEarningsBreakdown.tsx` — always-colored badge medal + big displayScore + participation/performance/bonus breakdown. Never gray, never "Game Over." 5 tests.

## Phase 2 — pilot drill: Memory Hunt (sharpest lives-pain)
- `useMemoryHuntGame.ts`: first miss per round is free ("warm-up miss"). On lives→0 still finish + forgiving score; no cold "Game Over."
- Ready phase → `DrillBriefing`. Complete phase → `DrillEarningsBreakdown` (badge-based; kill `lives>0?complete:gameOver` + gray trophy).
- Warm miss feedback. Wire `displayScore` to UI/gold; submit raw score (honest) to domain.
- TDD gameplay tests first.

## Phase 3 — roll to other 4 drills
Briefing + badge complete-phase + forgiving display + warm tone. Pattern Switcher: free first wrong-length per pattern. Reuse primitives; keep game loops intact.

## Phase 4 — assets (image MCP) + animation
On-brand per-drill emblem/badge art EXTENDING kawaii-marshmallow + neo-brutalist (bake palette + "thick black borders, hard pixel shadow, flat, no gradients, kawaii marshmallow character" into prompts). Output `public/brain-drills/`. **Visually verify each file landed + on-brand before wiring.** `/impeccable` + `/animate-ai` polish.

## Phase 5 — i18n
New keys (persona/mission/benefit/coachTip/step1-3 per drill, badge names+titles, briefing labels) × 5 langs, native (not calque), Hebrew RTL. `brainTranslations` test guards presence.

## OUT of scope (later)
Last-Gasp/Final-Spark buffer (live timers), demo/tutorial mode, today's-drills pip strip, haptics.

## Commit discipline
Per-phase commits. **Daemon deletes untracked + reverts tracked mid-session** (hit once already) → commit early to make work durable; verify committed state via `git cat-file -e origin/...:path`.

## Quality gates
`npm run lint && npm run test && npm run build` after each phase. tsc clean. Visual-verify assets. Test Hebrew `?locale=he`.
