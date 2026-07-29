# Onboarding & Conversion Experiments — 2026-05-08

## Context

PostHog 28d funnel pull surfaced three structural conversion gaps. This doc
records the diagnosis, the changes shipped today, and the experiments + spec
work that follow. Owner: growth.

## Diagnosis (28d, project 151059)

### Top funnel
| Stage | Count | Conversion |
|---|---|---|
| `$pageview` (landing) | 91 | — |
| `first_game_played` | 27 | 29.7% |
| `first_game_won` | 22 | 81.5% (of played) |
| `signup_completed` | 5 | 22.7% (of winners) |

Median landing → play = **88s**. Median play → won = **0.02s** (immediate
re-fire of existing-game state — likely returning users with prior local
state, not true first-time activation).

### Onboarding step funnel
| Step | Count | Drop |
|---|---|---|
| `language` | 55 events | — |
| `first_word_found` | 8 users | **−40% drop in tutorial board** |
| `tutorial` | 33 | flat |
| `profile` | 31 | −6% |
| `score_reveal` | 21 | **−32%** |
| `mode_select` | 13 | **−38%** |
| `onboarding_completed` | 4 | **end-to-end 13.3%** |

### Signup prompt triggers
| Trigger | Shown | Converted | Rate |
|---|---|---|---|
| `first_win_signup_shown` | 3 | 1 | **33%** |
| `mp_sheet` (post-game-2 sheet) | 19 | 0 | 0% |
| `mp_toast` (post-sheet game-3+ toast) | 58 | 0 | **0%** |
| `mp_sheet_dismissed` | 9 | 0 | 0% |

**`mp_toast` is pure dismissal training — 58 impressions, zero converts.**

### Retention
54 new players in 28d. **D1 = 0/54**. W1 = 14/54 (25.9%). Smart-reminder
push (cron, avg-play+30min, cold-start fix `e5538da62`) is invisible to
PostHog — no `notification_delivered` / `notification_clicked` events
existed before today.

### Locale + platform split
| Locale | Users started onboarding |
|---|---|
| en | 17 |
| he | 11 |
| es | 3 |
| sv / ja | 0 |

Israel = 82% of GSC clicks (per audit `gsc-2026-04-28`) but Hebrew users
under-onboard relative to traffic. HE-specific copy + faster TTI hypothesized
as drivers.

### Mode mix of `first_game_played`
- tutorial: 24 users
- survival: 5
- singleplayer: 3
- adventure / word-wheel: 1 each
- multiplayer: **0** (guests CAN play MP, but the event was emitted with
  `gameMode = null` for 90/127 events — fixed today, see below).

## Shipped today (2026-05-08)

### Phase 1 — Telemetry holes closed
1. **`first_game_played.gameMode` populated.** `trackGameCompletion` at
   `utils/growthTracking.ts:389` now extracts `mode` once at function top
   and passes it through both first-played + first-won emits. 90/127 null
   events were caused by this single missing payload field. Tests added in
   `utils/__tests__/growthTracking.mode.test.ts` for first-played mode
   propagation.
2. **`notification_delivered` + `notification_clicked` events.** Added to
   `GrowthEvent` union and wired into Capacitor push listeners
   (`utils/pushNotifications/tokenRegistration.ts`). Smart-reminder cron
   delivery is now measurable. Properties: `type`, `campaign`, `actionUrl`.
   Tests in `utils/pushNotifications/__tests__/setupPushListeners.test.ts`.

### Phase 2 — MP signup nudge experiment
3. **New experiment `mp-signup-nudge-copy-v1`** in `lib/experiments.ts`.
   Variants:
   - `control` — current behavior (sheet at game 2 + toast at game 3+).
   - `toast-disabled` — sheet only, no follow-up toast. Kills the 0/58
     converter cleanly via flag (reversible).
   - `value-prop` — alternate sheet copy (deferred, see Phase 2B below).
   - `social-proof` — alternate sheet copy (deferred, see Phase 2B below).
4. **Hook gate.** `useMultiplayerSignupNudge` reads the variant and skips
   the toast `useEffect` branch when `toast-disabled`. Tests cover both
   control (toast fires at game 3) and disabled (toast never fires + no
   `signup_prompt_shown` event with `trigger=mp_toast`).

## Open work — experiments to launch

### E1: `mp-signup-nudge-copy-v1` (toast-disabled rollout)
- **Hypothesis**: removing the 0%-converting `mp_toast` will not regress
  signup rate (it can't — base rate is already 0%) and will reduce the
  per-session friction users experience post-MP-game.
- **Variant split**: 50% control / 50% toast-disabled. Skip `value-prop` +
  `social-proof` until copy lands.
- **Sample size**: at current 86 prompts/28d, MDE is too coarse for copy
  variants. Run `toast-disabled` first as a 2-variant test for 14 days
  (~43 prompts/arm) — sufficient to detect ≥10pp swing in *downstream
  retention* (D1 / D7), which is the real risk of nudging changes.
- **Primary metric**: `signup_completed` per session reaching MP results
  page (denominator includes guests who DON'T see the toast).
- **Guardrail metrics**: D1 retention, W1 retention, MP session length.
  If toast-disabled lifts D1 (less rage-dismiss) — strong ship signal.
- **PostHog flag**: create `mp-signup-nudge-copy-v1` (multivariant) with
  `control`/`toast-disabled` rolled at 50/50, others at 0%.
- **Rollout**: enable flag in PostHog UI → deploy → monitor Sentry +
  daily PostHog funnel for 7 days → ship winner.

### E2: `mp-signup-nudge-copy-v1` (copy variants — deferred)
- After E1 settles, branch `MultiplayerSignupSheet.tsx` on variant:
  - `value-prop` — replace title with "Save your stats + unlock daily
    challenges". Replace `statsAtRisk` chip with progression-framed copy.
  - `social-proof` — replace title with "X players signed up this week"
    using `incrementPostHogUserProp` snapshot. Falls back gracefully when
    snapshot unavailable.
- New i18n keys × 5 locales. HE + JA need native review (existing rule).
- Tests: snapshot of variant copy + tracking that `signup_prompt_shown`
  carries the active variant.
- Sample size target: ~600 prompts/arm to detect 5pp lift on a 5–10% base
  rate. Current volume = 19/28d → would need either lift in upper funnel
  or 90+ days. Recommend deferring until E1 ships and tutorial-board fix
  (E3) increases the impression pool.

### E3: Tutorial board generosity (separate doc)
- `growth:onboarding_first_word_found` drops 40% of starters mid-tutorial.
  Spec: bias tutorial board to high-density 3-letter starts; if user finds
  no word in 20s, animate a hint path. New experiment
  `onboarding-tutorial-generosity-v1` with `control` / `hint-on-stuck`.
- Owner: onboarding/UX. Defer until current sprint clears.

### E4: Cold-start D1 push verification
- D1 = 0% may be caused by FCM token not active when smart-reminder cron
  fires for D0 users. With `notification_delivered` shipping today, set up
  PostHog cohort: `users with first_game_played in last 24h` and check
  `notification_delivered` rate within 24h. If <5%, hypothesis confirmed →
  defer reminder fire window OR inject a same-day "tomorrow's word" tease
  into the post-game results screen as a fallback.
- Action: monitor for 7 days post-deploy of Phase 1, then decide.

### E5: Default mode = today's WOTD/DWH
- 38% drop at `mode_select` step. Hypothesis: choice paralysis. Skip the
  picker for new users; route directly to a server-curated daily slot.
  Mode picker becomes a post-game-1 unlock screen.
- Spec: separate doc once UX wireframes land.

## Tracking gaps still open

| Gap | Severity | Plan |
|---|---|---|
| `$initial_referring_domain` null for all users | Medium | Add `$referrer: document.referrer` to manual `$pageview` capture in `components/providers/PostHogProvider.tsx:72`. Confirm `register_once` is firing post-consent. |
| `signup_prompt_shown` `trigger=null` actually = direct `signup_completed` siblings | Low | Cosmetic. Funnel queries should `WHERE trigger IS NOT NULL` to exclude. Document, don't fix. |
| MP submode (`word-hunt`/`classic`/`wheel-rush`) collapsing to `multiplayer` | Already fixed | Memory `posthog-telemetry-holes-2026-05-05` — verify `recordMpGame(submode)` callers all pass submode. Existing tests cover. |

## Files touched

```
utils/growthTracking.ts                                  (+5/-7  bug fix + 2 event types)
utils/pushNotifications/tokenRegistration.ts             (+22    delivery + click instrumentation)
utils/__tests__/growthTracking.mode.test.ts              (+25    first_played mode tests)
utils/pushNotifications/__tests__/setupPushListeners.test.ts (+33  delivery + click tests)
lib/experiments.ts                                       (+22    new experiment registered)
hooks/useMultiplayerSignupNudge.ts                       (+8     toast gate)
hooks/__tests__/useMultiplayerSignupNudge.test.ts        (+72    variant tests + multi-flag mock)
docs/specs/2026-05-08-onboarding-conversion-experiments.md (this doc)
```

## Validation

```
npx vitest run utils/__tests__/growthTracking.mode.test.ts
  utils/pushNotifications/__tests__/setupPushListeners.test.ts
  hooks/__tests__/useMultiplayerSignupNudge.test.ts
→ 32 tests passed (was 25 before; +7 new, 0 regressions)

npx tsc --noEmit  → clean
npx eslint <changed files>  → clean
```

## Next-session checklist

- [ ] Create `mp-signup-nudge-copy-v1` flag in PostHog (multivariant,
      `control` 50% / `toast-disabled` 50%). Match variant strings exactly.
- [ ] Re-pull onboarding funnel 7 days post-deploy. Expect: `mp_toast`
      impression count drops to ~0 in `toast-disabled` arm; signup rate
      unchanged or slightly improved.
- [ ] Set up `notification_delivered` cohort in PostHog tied to
      `first_game_played` users. Confirm D1 push delivery exists.
- [ ] Re-evaluate D1 = 0 after 7 days of `notification_delivered` data.
- [ ] If toast-disabled wins, ship the kill (default the flag to 100%
      `toast-disabled`) and design copy variants for E2.
