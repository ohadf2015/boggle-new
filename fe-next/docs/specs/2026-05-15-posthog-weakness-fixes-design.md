# 2026-05-15 PostHog Weakness Fixes & Experiment Backlog

> Source: PostHog 14-day prod data + 2026-05-15 insights memory.
> Data: D1 retention 9.4%, D7 4.7%, classic/blast complete% < 30%, rewarded-ad 92% ignore, dual-emit events still on, `game_abandoned` ≈ 0, onboarding profile→completed gap 38%.

## Goals

1. Unblock honest measurement (dedup, abandon fire, completion-before-route).
2. Plug retention cliff (D1 9% → 18%) via push, streak save, return hooks.
3. Plug mode-quality cliff (classic 26% → 45%) via UX audit + auto-restart CTA.
4. Plug rewarded-ad cliff (7% → 25%) via per-user cooldown + copy A/B.
5. Build experiment infra so future fixes have a one-line spawn path.

## Non-Goals

- Adding new modes; the data says hide/promote what exists.
- Mobile-only or TV-only redesigns; foundation work is platform-agnostic.

## Phase 1 — Foundation (this PR)

| Change | File | Notes |
|---|---|---|
| Emit canonical-only for whitelisted events (drop `growth:` dual) | `utils/growthTracking.ts:175,254` | Whitelist becomes "emit canonical, skip `growth:` prefix". |
| Add `visibilitychange` + `sendBeacon` to abandon listener | `utils/abandonOnPagehide.ts` | pagehide alone misses backgrounded Capacitor webviews. |
| Move `emitCompleted` before `router.push` | `components/onboarding/OnboardingFlow.tsx:233` | Fixes 38% profile→completed gap caused by aborted navigation. |
| New `hooks/useExperiment.ts` | new | Wraps `useFeatureFlag`; auto-emits `$experiment_started`; supports variants. |
| Add `game_abandoned` `rage_quit_under_5s` flag | `utils/growthTracking.ts:741` | Replace 15s rage-quit threshold with a slow exit signal; abandoned-under-5s is a confused tap. |
| Tests for the above | `**/*.test.ts` | Vitest + Jest. |

### Dual-emit decision

The 9 whitelisted events double-fire on every capture: `posthog.capture('growth:X')` AND `posthog.capture('X')`. Poisons every funnel that doesn't dedup on `person_id`. Decision: **keep canonical name, drop `growth:` prefix** for whitelisted events. Reason: PostHog funnel goals and external dashboards (GA4 mirror, Supabase mirror) reference canonical names; the `growth:` prefix was for internal organisation but its dashboards are easier to rename. Migration impact: 5 saved insights that filter `growth:game_completed` need editing to `game_completed`. Done out-of-band.

### Abandon-event design

Current `pagehide` listener fires zero events. Three causes:
1. iOS/Android Capacitor webview pauses on `visibilitychange`, not `pagehide`. Need both.
2. Default `posthog.capture` does NOT use `navigator.sendBeacon` for the in-flight request on unload. Need `transport: 'sendBeacon'`.
3. `MIN_ENGAGED_MS = 2000` may be too short for true abandon vs. tab-switch — raise to 5000 and add a `reason: 'visibilitychange' | 'pagehide'`.

## Phase 2 — Onboarding (next commit)

| Change | File | Hypothesis |
|---|---|---|
| Skip language picker if `navigator.language` matches available locale | `OnboardingFlow.tsx` + new `utils/detectLocale.ts` | -1 step → completed +20% |
| Auto-route from `tutorial` to `word-hunt` (best-volume mode) instead of profile dead-end | `OnboardingFlow.tsx` `handleProfileComplete` | first_game_played +15pp |
| Commit CG flow improvements (`is_cg` super-prop set BEFORE provider mount + auto-route timeout) | `components/CrazyGamesSDK.tsx`, `CrazyGamesWelcome.tsx` | CG player rate 5% → 30% |
| Emit `onboarding_completed` BEFORE any route (already in Phase 1) | OnboardingFlow.tsx | -13 user ghost gap |

## Phase 3 — Engagement loops (next commit)

| Change | File | Hypothesis |
|---|---|---|
| Rewarded-ad: per-user 10-min cooldown + 3-variant copy A/B | `useRewardedAd.ts` + `RewardedAdGoldButton.tsx` | watch% 7% → 25% |
| Signup prompt timing: trigger after 3 games OR first 4-letter word, not first completion | `useSignupPrompt.ts` | complete→signup 14% → 25% |
| Hide `connections`+`adventure` from default home tile grid; expose via "all modes" drawer | `app/[locale]/PageClient.tsx` | classic+word-hunt depth +20% |
| "Play one more" 2-tap CTA on game-end screens (random mode) | `components/singleplayer/results/*` | games/session 3.0 → 4.5 |
| Streak save modal w/ rewarded-ad save | `components/streak/*` (new) | streak_continued users 11 → 25 |

## Phase 4 — Return hooks (deferred)

- Smart daily reminder push (already-uncommitted per memory `smart-daily-reminder-2026-05-03`) — ship.
- Re-engagement email at H+24 for signed-up players (Resend + AI Gateway prompt).
- D1 streak XP curve flattening (1→2→3→5→10).

## Phase 5 — Analytics infra (deferred)

- Group analytics: register `mode` as PostHog group → per-mode dashboards stop needing custom SQL.
- Funnel insights pinned as saved entities: onboarding, first-game-to-signup, rewarded-ad, multiplayer match-found→game_completed.
- Missing custom events: `mode_screen_seen`, `mode_card_hover_ms`, `home_scroll_depth`, `first_word_typed_ms`, `streak_freeze_used`, `notification_permission_outcome`, `game_resumed`, `mode_switched_mid_run`.
- Cohort-based A/B: split by `device_class` (mobile/TV/desktop) and `is_cg`.
- Sentry x PostHog: forward `sentry_issue_seen` to PostHog so retention drops can correlate with error spikes.

## useExperiment hook

```ts
const { variant, loading } = useExperiment('exp_onboarding_autoroute', ['control','word-hunt','random']);
```

- Wraps `useFeatureFlag` for the variant string.
- Emits `$experiment_started` once per session with `{ experiment_key, variant }`.
- Persists assignment in localStorage for stable bucketing across reloads.
- Server-side flag eval lives in `app/api/feature-flags/check/route.ts` — `useExperiment` reuses that endpoint with `flagName: experiment_key`.

## Risk / Rollback

- Dropping `growth:` prefix is irreversible-ish — saved insights need re-pinning. Risk: a stakeholder filters on the old name and sees zero. Mitigation: announce in standup, batch-rename insights.
- Abandon-fire change could spike `game_abandoned` to thousands/day. That's correct, but funnels using it as a "goal not reached" filter will look worse for a week. Expected.
- Onboarding skip-language change must NOT bypass language for invite-mode users (they may have arrived with a `?lang=` query) — guard against override.

## Test plan

- Unit: growthTracking dedup, abandon visibility, useExperiment variant assignment, onboarding emit-before-route.
- Integration: full onboarding e2e with `?locale=he` → confirms no language step; full onboarding without query → language step shown.
- Manual: open prod build, tab-switch mid-game, verify `game_abandoned` fires in PostHog dev tools.
