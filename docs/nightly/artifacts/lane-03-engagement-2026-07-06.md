---
status: partial
files_touched:
  - fe-next/components/blast/legacy/BlastContinueModal.tsx
  - fe-next/components/blast/legacy/BlastRetryWaveModal.tsx
next_steps: |
  - Add new experiment exp-blast-continue-urgency-v1 (countdown timer in continue modal)
  - Wire landing-daily-cube-v1 (0 call sites — dark experiment in PostHog, remove or wire)
  - Add blast_watchad_clicked analytics event to growthTracking.ts
  - Sweep old flags: adventure-difficulty-tuning (inactive), share-prompt-timing / show-signup-after-first-win (old, no recent data → cleanup candidates)
---

## What shipped

Rage-click fix for /he/blast (top signal score=0.888, 8 rage clicks in 7d):

Both `BlastContinueModal` (+5 moves) and `BlastRetryWaveModal` (retry wave) now:
- Destructure `status` from `useRewardedFeatureUnlock`
- Disable the watch-ad button and show `<Loader2 animate-spin>` while `status === 'loading' || status === 'showing'`
- `aria-busy` set during active state; ad badge hides during loading

Root cause: `useRewardedAd` has an internal re-entrancy guard but the button had zero visual feedback — users rage-clicked because it appeared stuck.

## Flag hygiene findings

- `landing-daily-cube-v1` = UNWIRED (0 non-test call sites) → dark experiment, remove or wire next run
- `exp-blast-wave-banner-v1` = already inactive in PostHog — retired
- All other exp-* keys have ≥1 call site; none meet n≥1000/arm threshold for winner cleanup yet

## New experiment (deferred to next run)

`exp-blast-continue-urgency-v1`  
Hypothesis: 10s countdown timer in continue modal increases watch-ad tap rate by reducing decision paralysis.
