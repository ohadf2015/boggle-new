# Multiplayer Invite Onboarding — Design Spec

**Date:** 2026-05-04
**Status:** Draft (awaiting user review)
**Owner:** Onboarding/MP

## Problem

A new user clicking a friend's multiplayer-room invite link currently lands in the standard 5-step FTUE (language → returningUser → tutorial → profile → scoreReveal). The "skip" button exists but is buried inside the tutorial step only, with no context that a friend is waiting. The result:

- Time-to-room for invitees is ~60–90s (vs. Supercell-class benchmark <30s).
- The strongest motivator (social pull from a friend already in a room) is invisible until the very end of the funnel.
- The Practice hub — where users may land if they tap the existing tutorial-step skip prematurely — has zero awareness of a pending invite.

This spec defines a dedicated invite-aware onboarding flow plus a Practice-hub fallback banner.

## Goals

1. Hit a <30s time-to-room median for first-time invited users.
2. Make the skip-to-room option **visible from the moment a profile exists** (one tap, no confirm modal).
3. Keep one mandatory interactive moment so users get a feel for gameplay before the room loads (research: doing > skipping for retention).
4. Surface social context (host name + room code) on every screen of the invite-aware flow.
5. Zero regression on the non-invited 5-step FTUE.

## Non-Goals

- Server-side pre-validation of invite room existence (deferred — add only if telemetry shows >10% wasted-FTUE rate).
- Personalised teaser-board content based on host's recent games (deferred).
- A/B testing of teaser difficulty (deferred — establish a baseline first).

## Decision Record

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Profile (name+avatar) stays mandatory | Server requires identity to join a room. Cannot be deferred. |
| D2 | Tutorial is mandatory-by-default but skippable in 1 tap | Plotline/UXCam research: users who *do* one micro-interaction retain ~30% better than passive skippers; persistent visible skip respects user time. |
| D3 | Tutorial is "minimal interactive teaser" — new component, NOT existing `TutorialGame` | Existing tutorial is full-game (timer + score). Invite teaser must be one preset board, find any word, ~5–10 seconds. |
| D4 | Host name in URL via `?host=...` param, not server lookup | Avoids backend round-trip; share-sheet already builds the URL. Sanitised on read. |
| D5 | Pending invite TTL = 24h (existing) | No change. |
| D6 | Practice-hub banner is dismissible-per-session, returns next visit | Respects user choice within a session, but nudges back if they bounce and return. |
| D7 | Non-invite users keep current 5-step flow untouched | Regression-guarded by test. |

## Architecture & Flow

### Invite-mode flow (when `?room=XXX` AND `isFirstTimeUser()` AND no Supabase session)

```
Land /[locale]?room=ABC123&host=Alice
  └─ home gate writes pending invite { code, hostName, ts }
  └─ mounts OnboardingFlow in invite-mode (STEPS = ['language','profile','inviteTutorial'])

[1] Language pick                       — unchanged, 1 tap
[2] Profile (name + avatar)             — header reframed: "Joining Alice's room"
                                          InviteContextBanner sticky at top
[3] InviteTutorialTeaser                — sticky banner: "👋 Alice in ABC123 — Skip & Join now →"
                                          preset 2×2 board (e.g. C-A-T-S)
                                          prompt: "Drag letters to make a word"
                                          word-found → confetti + "+10 nice!" → auto-advance 1.2s
                                          OR Skip CTA → consume invite → room
[→] /multiplayer?room=ABC123            — scoreReveal SKIPPED for invitees
```

**Target time-to-room: ~15–30s.**

### Non-invite flow

Current 5-step `['language','returningUser','tutorial','profile','scoreReveal']` — **untouched**.

### Practice hub fallback

Whenever `hasPendingRoomInvite()` is truthy and the user lands on `/practice` (e.g. tapped pre-feature skip, browsed away from invite), render a sticky `PendingRoomBanner` above the practice hub hero:

- Pink accent (matches MP color in design system).
- Copy: "👋 {hostName} is waiting in **ABC123** — Join now →".
- Tap CTA → consume invite → `/multiplayer?room=ABC123`.
- × dismisses for current session only.

## Components

### New files

| File | Purpose |
|------|---------|
| `components/onboarding/steps/InviteTutorialTeaser.tsx` | One-moment interactive demo (preset board, find any word, auto-advance). Sticky skip-to-room CTA visible at all times. |
| `components/onboarding/InviteContextBanner.tsx` | Sticky top banner: hostName + room code + Skip CTA. Reused inside teaser **and** profile step header. |
| `components/practice/PendingRoomBanner.tsx` | Practice-hub banner — pink, dismissible, deeplinks to room. |
| `hooks/useInviteContext.ts` | SSR-safe reader for pending invite. Returns `{roomCode, hostName, expiresAt} \| null`. Subscribes to a custom `'invite-changed'` event so dismissals/consumes propagate without remount. |

### Modified files

| File | Change |
|------|--------|
| `utils/onboardingStorage.ts` | `savePendingRoomInvite(code, hostName?)` payload becomes `{code, hostName, ts}`; expose `getPendingRoomInvite()` reader; emit `'invite-changed'` event on save/consume. |
| `components/onboarding/OnboardingFlow.tsx` | When `hasPendingRoomInvite()` is truthy, STEPS = `['language','profile','inviteTutorial']`. Profile step receives `inviteContext` prop. On `inviteTutorial` complete or skip → consume invite → `router.push('/multiplayer?room=' + code)`. |
| `components/onboarding/steps/ProfileStep.tsx` | Accept `inviteContext` prop. When set, render `<InviteContextBanner>` above form. |
| `app/[locale]/practice/PageClient.tsx` | Mount `<PendingRoomBanner>` above hero when `useInviteContext()` returns truthy. |
| `app/[locale]/PageClient.tsx` | When parsing `?room=`, also parse `?host=` (URL-decoded, sanitised) → pass to `savePendingRoomInvite`. |
| `components/multiplayer/RoomShareSheet.tsx` (or wherever invite URL is built) | Append `&host={encodeURIComponent(hostDisplayName)}` to share URL. |

### Data shape

```ts
// utils/onboardingStorage.ts
type PendingRoomInvite = {
  code: string;          // existing
  hostName?: string;     // NEW — optional; falls back to t('invite.banner.yourFriend')
  ts: number;            // existing — TTL gate (24h)
};
```

### Sanitisation

`hostName` from URL: strip to `[A-Za-z0-9 'À-ɏ֐-׿぀-ヿ]` (latin + accents + Hebrew + Japanese kana — covers our 5 locales without allowing markup); max 24 chars; rendered as text only (pre-commit hook already blocks raw-HTML script-injection props per project rules).

## Telemetry (PostHog)

| Event | Props |
|-------|-------|
| `invite_landed` | `{roomCode, hasHostName, isFirstTimeUser}` — fired at home gate when `?room=` parsed |
| `invite_tutorial_started` | `{roomCode}` — teaser mounted |
| `invite_tutorial_word_found` | `{roomCode, word, secondsSinceStart}` |
| `invite_tutorial_skipped` | `{roomCode, step: 'profile' \| 'tutorial', secondsSinceLanded}` |
| `invite_consumed` | `{roomCode, path: 'tutorial' \| 'skip', totalSeconds}` |
| `practice_pending_banner_clicked` | `{roomCode, secondsOnPracticeHub}` |

## Edge Cases

| Case | Behaviour |
|------|-----------|
| Invite expired (ts >24h old) | `getPendingRoomInvite()` returns null → standard onboarding; teaser step skipped |
| Room no longer exists / full | After consume + redirect, existing `useMultiplayerSocket` error handler fires → toast `t('invite.toast.notFound')` → `/multiplayer` lobby |
| User already authenticated (returning login on new device) | `hasSupabaseSession()` true → existing branch skips onboarding → straight to `/multiplayer?room=XXX` |
| Host name missing | `hostName` undefined → banner renders `t('invite.banner.yourFriend')` |
| User completes profile then closes tab; returns later | sessionStorage persists in same browser session; OnboardingFlow resumes at teaser step (use STEP_INDEX-by-name, not by-int) |
| Banner dismissed on practice hub | Dismiss persists in `sessionStorage`; reappears next session as long as invite valid |
| RTL (Hebrew) | Banner mirrors; chevron flips; verified via existing RTL test pattern |
| CrazyGames embed | Existing CG branch already skips returningUser; invite-mode layers atop. Test ensures CG users with `?room=` work. |
| Reduced motion | Confetti + score popup gated behind `prefers-reduced-motion: no-preference` |
| XSS attempt via `?host=` | Sanitised per regex above; max 24 chars; text-only rendering |

## i18n Keys (5 locales)

```
invite.banner.host          — "{hostName} is waiting in"
invite.banner.yourFriend    — "Your friend" (fallback)
invite.banner.skipCTA       — "Skip & Join now"
invite.profile.header       — "Joining {hostName}'s room"
invite.tutorial.prompt      — "Drag letters to make a word"
invite.tutorial.celebrate   — "Nice! Joining {hostName}…"
invite.practice.banner      — "{hostName} is waiting in {code}"
invite.practice.dismissAria — "Dismiss invite"
invite.toast.expired        — "This invite has expired"
invite.toast.notFound       — "Room {code} is no longer available"
```

HE/SV/JA/ES strings flagged for native review (per project pattern). Use `i18n.normalizeMessages` `{var}` syntax — never `{{var}}.replace()` (per project gotcha).

## Tests (TDD — RED before GREEN)

1. **`onboardingStorage.test.ts`** — extend: `savePendingRoomInvite({code, hostName})` round-trips both fields; missing hostName → reader returns `hostName: undefined`; >24h ts → reader returns null; emits `'invite-changed'` event on save/consume.
2. **`useInviteContext.test.ts`** — SSR-safe (no window access on first render); reactive to `'invite-changed'` event.
3. **`InviteTutorialTeaser.test.tsx`** — renders preset board; word-found fires `invite_tutorial_word_found`; auto-advances 1.2s after find; skip CTA visible at all times; click skip fires `invite_tutorial_skipped` + consumes invite + navigates to `/multiplayer?room=...`.
4. **`InviteContextBanner.test.tsx`** — uses `hostName` when present; falls back to `t('invite.banner.yourFriend')`; sanitises pathological host strings; renders correctly in RTL.
5. **`PendingRoomBanner.test.tsx`** — only renders when `useInviteContext()` truthy; dismiss persists for session; click navigates + consumes invite.
6. **`OnboardingFlow.test.tsx`** — when `hasPendingRoomInvite()` truthy, STEPS = `['language','profile','inviteTutorial']` (NOT `returningUser`/`scoreReveal`); when falsy, current 5-step path unchanged (regression guard).
7. **`ProfileStep.test.tsx`** — renders `InviteContextBanner` when `inviteContext` prop passed; doesn't when undefined.
8. **E2E (Playwright, recommended)** — land `/en?room=ABC123&host=Alice` → fill name → see banner with "Alice" → click skip → arrive at `/en/multiplayer?room=ABC123`.

## Implementation Order

1. Storage + hook (data layer first; pure logic, easy TDD).
2. `InviteContextBanner` (presentational, reused by other components).
3. `OnboardingFlow` branching + `ProfileStep` prop wiring.
4. `InviteTutorialTeaser` (most novel component; build last with everything else mocked).
5. `PendingRoomBanner` + practice-hub mount.
6. URL-build update in share sheet.
7. Telemetry events wired across all surfaces.
8. i18n keys × 5 locales.
9. E2E.

## Success Metrics (post-launch, 14-day window)

- **Primary:** median time-to-room for invitees drops from current baseline to <30s.
- **Primary:** invitee FTUE-completion rate (reaches room) ≥85% (baseline measured at launch).
- **Secondary:** `invite_tutorial_word_found` ≥40% of `invite_tutorial_started` (engagement gauge — too low = teaser is friction, not value).
- **Secondary:** `practice_pending_banner_clicked` ≥30% of practice-hub views with pending invite (rescue rate from premature skip).

## Out of Scope / Follow-ups

- Server-side room pre-validation before FTUE.
- Personalised teaser-board content from host's recent games.
- A/B test of teaser difficulty (3 vs 4 vs 5 letters).
- Native review of HE/SV/JA/ES strings (flag in commit; route through standard locale-review process).

## References

- [Yu-kai Chou — Onboarding Phase / Social Influence drive](https://yukaichou.com/gamification-study/4-experience-phases-gamification-2-onboarding-phase/)
- [Game Wisdom — Designing for Minimal Friction in Player Onboarding](https://game-wisdom.com/general/designing-minimal-friction-player-onboarding)
- [Inworld — Best Practices for Video Game Onboarding](https://inworld.ai/blog/game-ux-best-practices-for-video-game-onboarding)
- [UX Collective — Building the Right Onboarding Experience](https://uxdesign.cc/games-ux-building-the-right-onboarding-experience-a6e99cf4aaea)
