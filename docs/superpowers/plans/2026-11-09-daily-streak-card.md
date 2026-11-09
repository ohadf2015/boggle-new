# Post-game Daily Streak Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline). Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** After every finished solo game and MP series-end, show a dismissible TomorrowCard that CTAs into today's remaining daily or keep-streak countdown — without fighting rematch or classroom flows.

**Architecture:** Keep `shouldShowDailyInvite` as the rematch/classroom gate. Add a pure local daily-done probe. Generalize `TomorrowCard` with props (`source`, optional `dailyDoneToday`/`streak`/`isStreakLoaded`); self-resolve local daily-done + `useWinStreak` when props omitted. Mount on MP final when gate is true; lift first-session-only gate on solo.

**Tech Stack:** Next.js fe-next, Vitest + Testing Library, existing growthTracking, useWinStreak, dailyChallenge storage.

## Global Constraints

- Non-blocking / sessionStorage-dismissible; rematch priority preserved.
- Guests allowed (finish-today / countdown; never invent streak).
- Classroom student/host results: hide.
- All locales incl. Hebrew RTL (inherit `dir`; no hardcoded LTR).
- Social/tests: mock/in-process only; no prod accounts/DB migrations.
- No force-push / hook bypass / merge / prod deploy.

---

### Task 1: Gate + local daily-done helpers (TDD)

**Files:**
- Modify: `fe-next/lib/results/shouldShowDailyInvite.ts`
- Modify: `fe-next/lib/results/__tests__/shouldShowDailyInvite.test.ts`
- Create: `fe-next/lib/results/isDailyHubDoneLocally.ts`
- Create: `fe-next/lib/results/__tests__/isDailyHubDoneLocally.test.ts`

- [x] **Step 1:** Extend `shouldShowDailyInvite` with `isClassroom?: boolean` (false when classroom). Allow guests (remove guest hard-block) so guests get finish-today/countdown; rematch priority unchanged. Update tests.
- [x] **Step 2:** Add `isDailyHubDoneLocally(language)` using `requiredDailyModes(DAILY_MODES)` + `hasPlayedWordHuntToday` / `hasPlayedWordWheelToday`. Test with mocked storage.

### Task 2: Generalize TomorrowCard (TDD)

**Files:**
- Modify: `fe-next/components/results/TomorrowCard.tsx`
- Modify: `fe-next/components/results/__tests__/TomorrowCard.test.tsx`
- Modify: `fe-next/utils/growthTracking.ts` (add `postgame_daily_cta_clicked`; expand `tomorrow_card_shown` comment)
- Modify: `fe-next/translations/{en,he,es,ja,ru,sv}.js` — `results.tomorrowCard.*` finishToday / keepStreak / ctaFinish / ctaKeep / dismiss / streakLabel

Props:
```ts
export type TomorrowCardSource = 'solo' | 'mp';
export type TomorrowCardVariant = 'finish-today' | 'keep-streak';
export interface TomorrowCardProps {
  source?: TomorrowCardSource;
  dailyDoneToday?: boolean;
  streak?: number;
  isStreakLoaded?: boolean;
}
```

Behavior:
- Drop `readGamesCompletedCount() <= 1` gate.
- Variant from `dailyDoneToday` (prop or local probe).
- sessionStorage key `lc:tomorrow-card-dismissed` — hide for session after X.
- CTA Link to `/${locale}/daily`; fire `postgame_daily_cta_clicked`.
- `tomorrow_card_shown` props: `{ seconds_to_midnight, variant, streak, daily_done, source }`.
- Show streak line only when `isStreakLoaded && streak > 0`.
- Countdown helpers unchanged.

### Task 3: Mount points

**Files:**
- Modify: `fe-next/components/singleplayer/SinglePlayerResults.tsx` — pass `source="solo"` + streak props from existing `useWinStreak`.
- Modify: `fe-next/components/multiplayer/results/MpResultsStage.tsx` — dynamic import TomorrowCard; render below MpMyCard block when `c.showDailyInvite && !c.isClassroom` (gate already series-end aware).
- Modify: `fe-next/components/multiplayer/results/useMpResultsController.ts` — pass `isClassroom` into `shouldShowDailyInvite`.

Keep `StreakIgnitionCard` as solo sibling (no double-merge).

### Task 4: Verify, commit, PR

- [x] Run targeted vitest for touched tests.
- [x] Run eslint on touched files if available.
- [x] `git diff` review vs spec; commit once; push; `gh pr create` (do not merge).
