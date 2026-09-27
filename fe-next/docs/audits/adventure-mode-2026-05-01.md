# Adventure Mode — Comprehensive Audit (Master)

**Date:** 2026-05-01
**Trigger:** User report — "adventure mode is full of bugs … make it fun and usable and improve UI/UX, reduce cluttering."
**Method:** 5 parallel expert agents covering disjoint lenses (bugs, UX clutter, fun, a11y, perf), main thread consolidating with spot-verification.
**Prior:** `docs/audits/adventure-mode-comprehensive-audit-2026-04-02.md` (78 findings, 6 sprints — most shipped)

## Sub-reports

| Lens | File | Findings |
|------|------|---------:|
| Bugs / broken flows | `adventure-mode-2026-05-01-bugs.md` | 6 (3C / 3H / 0M / 0L) |
| UI/UX clutter | `adventure-mode-2026-05-01-uiux.md` | 20 |
| Fun & engagement | `adventure-mode-2026-05-01-fun.md` | 24 (8 HIGH) |
| Accessibility | `adventure-mode-2026-05-01-a11y.md` | 13 (2 Crit / 4 Serious / 5 Mod / 3 Minor) |
| Performance | `adventure-mode-2026-05-01-perf.md` | ~10 P0/P1/P2 |

---

## Executive summary

The persistent **"unwired upgrade" backlog from prior audits is closed** — re-verified all 11 upgrade IDs are read by `useUpgradeEffects.ts`. New work since 2026-04-02 (boss-rush, endless, achievements, skills sub-routes; expanded loot reveal; new toast types) introduced fresh issues that cluster into three themes:

1. **Server doesn't validate everything it should** — flash-challenge claims and retry-score retention are still client-trusted (C2, C3). C1 (sendBeacon gold) needs further verification: server recomputes via `calcGoldEarned` so claim may be overstated.
2. **Mobile portrait is over-stuffed** — up to 5 simultaneous overlays (toasts, vignettes, objectives, upgrade HUD, loot reveal). Grid squeezes to ~140px playable on 320px screens. This is the #1 driver of "feels cluttered."
3. **Onboarding dumps everything at once** — 4 simultaneous objectives on W1-1, no sequenced teaching, generic icon-only tutorial. Players faceplant before they know what's fun.

Bugs are real and hardenable; UX clutter and FTUE require design discipline (cut, don't add).

---

## Top 10 cross-cutting fixes (highest impact / cheapest)

| # | Fix | Lens | Effort | Impact |
|---|-----|------|--------|--------|
| 1 | Single-objective W1-1 + first-3-levels staged tutorial | fun + uiux | M | massive FTUE clarity |
| 2 | Toast queue: max 2 visible, merge upgrade/mechanic/flash into one channel | uiux | S | reclaims ~60 px on mobile portrait |
| 3 | Server validates flash-challenge claim against active config (C2) | bugs | M | closes free-gold exploit |
| 4 | Server validates `score - previousBest ≤ maxRetryDelta` for retried levels (C3) | bugs | M | closes score-injection exploit |
| 5 | Fail-screen progress bars ("7/8 ice tiles cleared") | fun | S | +20–30 % retry rate (estimated) |
| 6 | Replace blast-mode full-screen vignette with corner timer badge | uiux + a11y | S | photosensitive-safe + less visual noise |
| 7 | Tile aria-labels: `letter + special-state + selected-state` | a11y | S | unblocks SR users |
| 8 | LazyMotion wrap on adventure routes | perf | XS | ~85 KB deferred |
| 9 | Phase-index lock in boss orchestration (H1) instead of timestamp | bugs | S | fixes W10 phase double-fire |
| 10 | Re-encode `public/music/adventure/**` MP3 → Opus 96 kbps | perf | S | ~28 MB asset reduction |

---

## Sprint plan (5 sprints, ordered by user impact + risk)

### Sprint A — **Server-trust hardening** (security, must-do)
- **C2** validate flash-challenge claim against server-loaded config
- **C3** validate retry-score delta against `level_completions.best_score`
- **C1** verify sendBeacon exploit; if real (server doesn't strip client `goldEarned`), force server-only recompute on both fetch + beacon paths
- **Tests:** integration test for each — submit malformed payload, expect 400 / clamped value
- **Estimate:** 1 sprint

### Sprint B — **Mobile clutter cut** (the user's literal ask)
- Toast queue consolidator (uiux P0-GAME-05)
- Drop redundant quest UI from hub (uiux P1-HUB-01) — keep compact dots
- Collapse Objectives + Upgrade HUD into a single sidebar tab on phone (uiux P0-GAME-08)
- Replace blast-mode vignette with corner badge (uiux P0-GAME-13)
- Modal state machine: only one modal at a time (uiux P0-MODAL-14)
- RTL audit pass on the surfaces above
- **Estimate:** 1 sprint

### Sprint C — **FTUE + feedback loop** (the "fun" sprint)
- Single-objective W1-1; gate ice/bomb/flash to W1-2/W1-3
- Sequenced tutorial: 1 mechanic per level for first 3 levels (no icon walls)
- Fail-screen progress bars (fun F5)
- Boss-victory ceremony (fun F2/F14): pause → big number → loot → CTA — currently silent
- Loot-chest reveal: cut to 1.5 s, enlarge total
- Endgame breadcrumb after W10 (fun F24): boss-rush + endless CTA, prestige hint
- **Estimate:** 1 sprint

### Sprint D — **Accessibility unblockers**
- Tile aria-labels (a11y Critical-1)
- Grid keyboard alternative — letter-key entry as path preview (a11y Critical-2)
- aria-live regions for found-word, combo, objective updates (a11y Serious-1)
- Reduced-motion guards on `AdventureEffectsCanvas`, loot reveal, combo overlay
- 200 % text-scale pass on objectives + HUD
- **Estimate:** 1 sprint

### Sprint E — **Hook stability + perf polish**
- **H1** boss phase lock by index, not timestamp
- **H2** unstable combo-timeout closure → ref-based read
- **H3** stale `earnedGoldRef` → sync to `earnedGold` state
- LazyMotion wrap (perf P1)
- Music re-encode → Opus (perf P1)
- `AdventureEffectsCanvas` ring buffer (perf P2)
- **Estimate:** 1 sprint (parallel-safe with D)

---

## Quick wins (ship in current sprint, < 1 day each)

- LazyMotion wrap (perf)
- Reduced-motion gate on confetti + combo-milestone overlay (a11y)
- Drop redundant XP counter from hub if it appears twice (uiux verification needed)
- Loot-chest duration 3s → 1.5 s (fun)
- Music files re-encode (perf — automation script)
- Boss phase-index lock (bugs H1, isolated)

---

## Verification notes (read before fixing)

Memory record: agent claims have ~40 % false-positive rate. Confirmed during this audit:

- ✅ **C2 verified** — `route.ts:196` only checks ≥1 valid word, not challenge-specific criteria. Real fix needed.
- ✅ **C3 verified** — `route.ts:89-92` literally `void _retainedScore;` with comment confirming it relies on client merge. Real fix needed.
- ⚠️ **C1 partially weakened** — server recomputes `goldEarned` at `route.ts:198` via `calcGoldEarned`. Sendbeacon path may already be safe at the gold level; verify no other client field (`words`, `flashChallengeCompleted`) is the actual exploit vector. Run a malformed-payload test before opening a fix PR.
- ✅ **Upgrade wiring** — all 11 IDs from prior backlog now consumed by `useUpgradeEffects.ts:117-155`. Backlog closed.
- ⚠️ **A11y agent's "modal focus trap unconfirmed"** — labelled unconfirmed, not broken. Read code before flagging in PR.
- ⚠️ **UI/UX agent's "Toast Stacking — up to 5 overlays"** — verify by repro, not by reading files. Memory pattern: clutter-counts agents narrate from imagination.

Spot-verify any HIGH+ before assigning a sprint slot.

---

## Files touched / not touched

**Audited surface:**
```
fe-next/app/[locale]/adventure/**
fe-next/app/api/adventure/**
fe-next/components/adventure/**
fe-next/lib/adventure/**
fe-next/hooks/adventureGameReducer.ts, useAdventureGame.ts, useAdventure*
fe-next/types/adventure/**
```

**Out of scope (separate audits exist):**
- Multiplayer (`mp-audit-2026-04-27.md`)
- Brain Drills (`brain-drills-audit-2026-04-26.md`)
- Connections (`connections-audit-2026-04-26.md`)

---

## Decision points for owner

1. **Order of sprints** — proposed A → B → C → D → E. Security (A) is non-negotiable. B is the user's literal ask ("clutter"). User can approve or re-order.
2. **C1 status** — open follow-up: write a malformed-payload integration test to confirm/refute the sendBeacon exploit before sprint A planning.
3. **W1-1 onboarding rewrite** — design call: do we ship a simpler W1-1, or a separate "tutorial world" prequel? Cheaper = simplify W1-1 in place.
4. **Toast consolidation** — design call: keep current toast types but throttle, or collapse into a single channel with type tags? Sprint B assumes the latter.
