# LexiClash Telemetry Audit — 2026-06-23

Source of truth: `fe-next/utils/growthTracking.ts` `GrowthEvent` union (**108** typed events) vs
live PostHog volume (project 151059, EU), trailing 7d + prior-7d windows.

Tooling built this session (now reusable + run nightly — see lane 12):
`scripts/nightly/lib/posthog-coverage.sh` (`extract` + `classify`).

---

## TL;DR

- **62 of 108 registry events have zero or collapsed live volume.** Most are not "broken" —
  they fall into 4 buckets below. The actionable ones are the *wired-but-silent* and the
  *high-traffic never-wired* events.
- **Per-mode completion telemetry is a hole, not a single bug.** Several modes emit
  `game_started` but never `game_completed`, so per-mode funnels are unusable.
- **Highest-value events to implement**: the 4 already-typed social events, real monetization
  (`iap_purchased` / shop / offerwall), per-mode end-events, and share-method slicing.

---

## 1. Coverage gaps (code defines it, PostHog never sees it)

### 1a. Wired but SILENT — investigate first (call site exists, 0 volume)
A fire site exists in code yet nothing arrives — either an unreachable branch or a regression.
These are the urgent ones because the instrumentation *looks* done.

| event | call sites | note |
|---|---|---|
| `results_cta_clicked` | 2 | Solo results CTA — should fire on normal traffic. Verify the handler runs. |
| `push_prompt_granted` | 2 | Push opt-in grant — 0 grants in 14d is suspicious. |
| `notification_delivered` | 2 | Delivery callback — check token-registration path. |
| `iap_tapped` | 2 | RemoveAds probe — low traffic plausible, but confirm. |
| `avatar_nudge_clicked` | 2 | Nudge CTA — `_shown` also dead; whole nudge may not render. |
| `hint_used` | 0* | *Has a `trackHintUsed` wrapper but **nobody calls the wrapper** → effectively dead. |

### 1b. Never wired — type-defined, 0 call sites (backlog to implement)
These are "the events we can implement to get the full picture." Prioritised:

**P1 — social loop (already typed, just need call sites; cheap wins):**
`friend_added`, `challenge_sent`, `leaderboard_viewed`, `profile_viewed`, `achievement_shared`

**P1 — monetization (revenue blind spots):**
`iap_purchased` (only `_viewed`/`_tapped` exist → cannot measure conversion), shop/avatar-part
purchase event (none), offerwall/CPX completion (none — a primary revenue source, fully dark).

**P2 — share attribution (only `share_completed` fires; cannot slice by channel):**
`share_link_copied`, `share_whatsapp_clicked`, `share_qr_generated`, `share_card_generated`,
`share_win_prompt_shown`, `share_win_prompt_clicked`

**P2 — streak / retention mechanics:**
`streak_broken`, `streak_freeze_used`, `return_visit`, `daily_challenge_completed`

**P2 — game lifecycle nuance:**
`first_word_found`, `session_start`, `game_abandon_attempted`, `replay_countdown_shown`,
`results_autoplay_cancelled`, `room_joined_via_code`, `referral_link_clicked`,
`adventure_level_pass`, `adventure_quit`

### 1c. Low-traffic by context — likely legit zeros (do NOT chase blindly)
- `cg_*` (CrazyGames embed funnel): all 0 — no CrazyGames traffic in the window, not a bug.
- `school_lead_*`, `education` events: low-volume education vertical.
- `iap_*`: few payers; small numbers expected.

### 1d. CRATERED — was healthy, collapsed
| event | 7d | prior 7d | note |
|---|---|---|---|
| `signup_prompt_shown` | 20 | 94 | -79%. Check whether the signup-nudge entry point regressed. |

---

## 2. Per-mode completion telemetry is broken (data-driven, verified)

`game_started` carries `mode`/`gameMode`; `game_completed` should mirror it. It doesn't.
Side-by-side `GROUP BY event, mode` (14d) proves two distinct failures:

| mode | started | completed | % | diagnosis |
|---|---|---|---|---|
| word-wheel | 68 | 65 | 96% | healthy |
| survival | 73 | 57 | 78% | healthy |
| blast | 61 | 39 | 64% | healthy |
| classic | 111 | 48 | 43% | low — worth a UX look |
| word-hunt | 51 | 17 | 33% | completion lives in `daily_word_hunt_complete` (split signal) |
| **random** | **94** | **1** | **1%** | **emits no completion at all — biggest hole (94 starts!)** |
| wheel-rush | 25 | 2 | 8% | no real completion event |
| adventure | 5 | 0 | 0% | no completion event (uses `adventure_level_*`, also dead) |
| adventure-boss | 3 | 0 | 0% | no completion event |
| **brain-drill** | **0** | **8** | — | **completes with NO matching `game_started` label** (start-event gap) |

**Fix is per-mode, not global:** modes in the "no completion" group need an end-event wired (or,
if endless-by-design, a `session_end` defined); `brain-drill` needs its start labelled. Until
then any per-mode retention/difficulty analysis is misleading.

---

## 3. Data-driven improvement opportunities

1. **`random` mode (94 starts / 1 completion).** Either the highest-volume instrumentation hole
   or a genuinely abandoned mode. Decide which, then fix instrumentation or the mode UX.
2. **Signup-prompt impressions down 79% w/w.** If unintended, the top-of-funnel for conversion
   shrank — trace the nudge trigger. (Cross-check with lane 03 experiment work.)
3. **No monetization conversion funnel.** `iap_viewed → iap_tapped → iap_purchased` is missing its
   last step, and offerwall (the real earner) is entirely dark. Cannot compute payer LTV today.
4. **Social loop is invisible.** friend/challenge/leaderboard/profile all unmeasured → cannot tell
   whether social features drive retention. Wiring the 4 typed events unlocks that immediately.

---

## 4. What ships now vs what the nightly job owns

- **Now (this session):** the 4 P1 social events wired (`friend_added`, `challenge_sent`,
  `leaderboard_viewed`, `profile_viewed`) + this audit + the coverage helper + **nightly lane 12**.
- **Nightly (lane 12 `12-telemetry-coverage`):** re-runs `posthog-coverage.sh` every night,
  surfaces newly-DEAD (a deploy broke an emitter) + CRATERED events + per-mode completion holes,
  triages the actionable ones, and reports to Telegram. The static backlog in §1b is drained over
  successive nights, not all at once.
