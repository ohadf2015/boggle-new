# Cosmetics Visibility & Wiring — Spec (2026-06-04)

## Problem (audited, evidence-backed)
Skins / special tiles / ending effects exist (`lib/cosmetics.ts`, 17 items, 4 categories) but feel invisible and "not sure it works."

1. **Wired wrong (the real "doesn't work").** `fireEquippedVictoryEffect` is called only inside `ResultsWinnerBanner`, which renders single-player as `variant='completion'` → confetti explicitly excluded. The MP winner path (`ResultsHeroSection`, rank 1) calls `fireFirstWinConfetti` directly and **ignores the equipped effect**. Net: a player's chosen victory effect fires in ~one edge case (custom-challenge rank-1 win). Equipped cosmetic is invisible ~99% of plays.
2. **Not discoverable.** One buried entry (Profile → Collection, 4th tab). Unlock toast announces but has **no CTA / no link**. Nothing on results / home / nav.
3. **Feels unreachable.** Locked items show a static hint ("Reach Gold rank") with **no progress** ("how close am I?").

## Non-goals (deliberate, per advisor)
- **No new celebration moments.** `completion` staying quiet is intentional — only honor the equipped effect where the game *already* celebrates (preserve the *when*, change the *what*).
- **No economy re-tune.** Don't move rank/streak gates (product-sensitive, irreversible). Fix the *feeling* with progress visibility instead.
- **No nav-tab / home-teaser / onboarding-slide** this pass. One discovery add only.

## Keystone risk
~90% of players have nothing equipped. The dispatcher's default branch (`fireRankConfetti light`) is **weaker** than MP's current `fireFirstWinConfetti`. Naively routing MP through the dispatcher would silently *downgrade* the celebration for everyone who never opened the collection. → dispatcher must run the call site's *own* existing celebration on the default path.

## Changes

### Phase 1 — Wiring (keystone + most of discovery)
`utils/victoryEffects.ts` — add `fallback` param + return cancel handle:
```ts
fireEquippedVictoryEffect(rank, effectId, fallback?: () => (()=>void)|void): (()=>void)|void
// fireworks → fireFireworks (returns cancel); lightning → fireVictoryConfetti;
// else → fallback?.() ?? fireRankConfetti(rank,'light')
```
`components/results/ResultsHeroSection.tsx` — at rank===1 (unchanged when + `reducedMotion` guard), route through dispatcher:
```ts
const equippedEffect = useEquippedCosmetic('victoryEffect');
cancelConfettiRef.current = fireEquippedVictoryEffect(rank, equippedEffect, () => fireFirstWinConfetti(1200)) ?? null;
```
Result: nothing-equipped player → identical MP win celebration (no downgrade); fireworks-equipped → fireworks on MP win. Self-advertising.

### Phase 2 — Discovery (unlock toast deep-link)
`hooks/useUnlockNotifier.ts` — replace plain-string toast with a clickable `<a href="/${language}/profile?tab=collection">` (still via `toast.success`, JSX payload). Adds copy `cosmetics.equipCta`.

### Phase 3 — Achievability (progress hints)
`lib/cosmetics.ts` — new pure `formatUnlockProgress(cosmetic, {rankTier, streakDays})`:
- streak → `cosmetics.progress.streak` `{current,target}` (current clamped ≤ target)
- rank → `cosmetics.progress.rank` `{current,tier}`
- else → null
`components/cosmetics/CosmeticCollection.tsx` — render the progress line under the unlock hint for locked rank/streak items.

## i18n (×5: en/he/sv/ja/es, Hebrew RTL, no calques)
- `cosmetics.equipCta` — "Tap to equip"
- `cosmetics.progress.streak` — "{{current}}/{{target}} day streak"
- `cosmetics.progress.rank` — "{{current}} → {{tier}}"

## TDD targets (RED first)
- `victoryEffects.test.ts`: + fallback runs on null path (and `fireRankConfetti` NOT called → no downgrade); fallback NOT run when premium equipped; returns cancel handle.
- `ResultsHeroSection` wiring test: rank 1 → calls dispatcher w/ equipped id + fallback fn; rank 2 / reducedMotion → not called.
- `useUnlockNotifier.test.ts`: toast payload is an element linking to `…/profile?tab=collection`.
- `cosmetics.test.ts`: `formatUnlockProgress` streak/rank/null cases.

## Discriminating acceptance check
Nothing-equipped player sees the **same** MP win celebration as before (not a downgrade) **AND** a fireworks-equipped player sees fireworks on an MP rank-1 win.

## Guards
Preserve `reducedMotion`/Cosy guard at every touched call site. All copy via `t()`.
