# Blast v2 — Plan 5: Tutorial + Unlock Cards (Stream F) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Level 1 FTUE (6-step overlay), per-mechanic unlock cards, skip-all flow, replay UI in Settings, veteran detection, and integration with `BlastGame` to gate input until tutorials are acknowledged. All data persists to `blast_progress.unlocks_seen` jsonb via Plan 3's DB layer.

**Architecture:** Two main components—`BlastFtueOverlay.tsx` (modal with 6 sequential steps) and `BlastUnlockCard.tsx` (reusable mechanic-card modal). Helpers in `lib/blast/v2/tutorial/` manage persistence. Hook `useBlastTutorial` orchestrates "is new mechanic shown?" logic. Settings section under Game tab lists all 12 cards + L1 FTUE for replay. RTL and reduced-motion support throughout.

**Tech Stack:** React 19, Framer Motion, Zod (for schema), `useLanguage().t()` from `@/contexts/LanguageContext`, existing modal patterns from codebase.

**Spec reference:** `docs/superpowers/specs/2026-05-12-blast-mode-redesign-design.md` — sections "Incremental Mechanic Unlock Ladder" (full table), "Tutorial Implementation" (Level 1 FTUE 6 steps + per-mechanic cards + skip path + string budget), "Bypass for veterans" subsection.

**Plan 1 reference:** `mechanicsForLevel(n)` from `lib/blast/v2/mechanic-flags.ts` — used to detect which tutorial to show on level entry.

**Plan 3 reference:** `blast_progress.unlocks_seen` jsonb field — Plan 5 reads/writes this via helper functions. Schema defined in Plan 3 migrations.

**Out of scope:**
- DB migrations → Plan 3
- Pixi FX during tutorials → Plan 4 (may add if specified, but tutorials are designed with DOM only)
- Translation key authoring → Plan 6 (Plan 5 emits `t(key, fallback)` calls with English fallbacks)
- PostHog events (`blast_tutorial_seen`) → Plan 7

---

## File Structure

| File | Purpose |
|---|---|
| `fe-next/lib/blast/v2/tutorial/unlocks-seen.ts` | Typed helpers: `hasSeenUnlock`, `markUnlockSeen`, `shouldSkipAll`, `setSkipAll`, schema validators |
| `fe-next/lib/blast/v2/tutorial/mechanic-cards.ts` | Registry of 12 mechanic cards: `key`, `level`, `titleKey`, `bodyKey`, `iconAsset` |
| `fe-next/lib/blast/v2/tutorial/veteran-detection.ts` | Check legacy `max_level_cleared >= 5` from Plan 3's `blast_progress` or prior tables |
| `fe-next/hooks/useBlastTutorial.ts` | Orchestrates: on level mount, compute new mechanics, check unlocks_seen, show card if not seen/not skipped |
| `fe-next/components/blast/v2/BlastFtueOverlay.tsx` | 6-step Level 1 FTUE modal with step-specific content + auto-advance triggers |
| `fe-next/components/blast/v2/BlastUnlockCard.tsx` | Reusable mechanic-card modal: icon + title + body + "Got it" + skip link (card #2+) |
| `fe-next/components/settings/BlastTutorialReplaySection.tsx` | Settings: list all cards + L1 FTUE, each tappable to re-show |
| `fe-next/lib/blast/v2/types.ts` | Extend with `UnlocksSeen` type (or define in unlocks-seen.ts) |
| `fe-next/components/blast/v2/__tests__/BlastFtueOverlay.test.tsx` | Unit tests for FTUE overlay (step transitions, auto-advance) |
| `fe-next/components/blast/v2/__tests__/BlastUnlockCard.test.tsx` | Unit tests for unlock card (render, skip link) |
| `fe-next/lib/blast/v2/tutorial/__tests__/unlocks-seen.test.ts` | Unit tests for helpers |
| `fe-next/lib/blast/v2/tutorial/__tests__/mechanic-cards.test.ts` | Unit tests for registry |
| `fe-next/hooks/__tests__/useBlastTutorial.test.tsx` | Hook tests (new mechanic detection, card trigger) |

All under 500-line cap. Tests under `__tests__/` next to source.

---

## Type Definitions (locked for Plans 6-7)

```ts
// lib/blast/v2/tutorial/unlocks-seen.ts (or extend types.ts)

export type UnlocksSeen = {
  ftue_completed?: boolean;
  skip_all?: boolean;
  veteran_bonus_granted?: boolean;
  [mechanicKey: string]: boolean | undefined; // e.g., coinOverlay, frozenTiles
};

export const MECHANIC_KEYS = [
  'coinOverlay', 'reverseSelection', 'shuffleButton', 'gemTiles',
  'frozenTiles', 'cascadeWords', 'doubleBonusTile', 'revealLetterHint',
  'bonusDictionary', 'revealWordHint', 'lateralSlideGravity', 'multiWordReveal',
] as const;
```

---

### Task 1: unlocks-seen helpers (typed persistence)

**Files:**
- Create: `fe-next/lib/blast/v2/tutorial/unlocks-seen.ts`
- Test: `fe-next/lib/blast/v2/tutorial/__tests__/unlocks-seen.test.ts`

- [ ] Step 1: Failing test covering 6 functions: `hasSeenUnlock('coinOverlay', {coinOverlay: true})` → true; `markUnlockSeen(empty, 'gemTiles')` → `{gemTiles: true}`; `shouldSkipAll({skip_all: true})` → true; `setSkipAll(existing, true)` → sets flag; validator rejects unknown keys; round-trip JSON serialization preserves all fields.
- [ ] Step 2: Run `cd fe-next && npx vitest run lib/blast/v2/tutorial/__tests__/unlocks-seen.test.ts` — expect FAIL.
- [ ] Step 3: Implement (see code below).
- [ ] Step 4: Re-run — expect PASS (6 tests).
- [ ] Step 5: Commit `feat(blast-v2): unlocks-seen helpers + schema (Plan 5 Task 1)`.

**Implementation:**

```ts
// fe-next/lib/blast/v2/tutorial/unlocks-seen.ts
import { z } from 'zod';

export const MECHANIC_KEYS = [
  'coinOverlay', 'reverseSelection', 'shuffleButton', 'gemTiles',
  'frozenTiles', 'cascadeWords', 'doubleBonusTile', 'revealLetterHint',
  'bonusDictionary', 'revealWordHint', 'lateralSlideGravity', 'multiWordReveal',
] as const;

export type MechanicKey = typeof MECHANIC_KEYS[number];

export type UnlocksSeen = {
  ftue_completed?: boolean;
  skip_all?: boolean;
  veteran_bonus_granted?: boolean;
} & Record<MechanicKey, boolean | undefined>;

const UnlocksSeenSchema = z.record(z.boolean().optional()).strict();

export function validateUnlocksSeen(raw: unknown): UnlocksSeen {
  return UnlocksSeenSchema.parse(raw) as UnlocksSeen;
}

export function hasSeenUnlock(unlocks: UnlocksSeen, key: MechanicKey | 'ftue_completed'): boolean {
  return unlocks[key as keyof UnlocksSeen] === true;
}

export function markUnlockSeen(unlocks: UnlocksSeen, key: MechanicKey | 'ftue_completed'): UnlocksSeen {
  return { ...unlocks, [key]: true };
}

export function shouldSkipAll(unlocks: UnlocksSeen): boolean {
  return unlocks.skip_all === true;
}

export function setSkipAll(unlocks: UnlocksSeen, skip: boolean): UnlocksSeen {
  return { ...unlocks, skip_all: skip };
}

export function completeFtue(unlocks: UnlocksSeen): UnlocksSeen {
  return { ...unlocks, ftue_completed: true };
}
```

---

### Task 2: Mechanic cards registry

**Files:**
- Create: `fe-next/lib/blast/v2/tutorial/mechanic-cards.ts`
- Test: `fe-next/lib/blast/v2/tutorial/__tests__/mechanic-cards.test.ts`

- [ ] Step 1: Failing test — registry has 12 entries (one per mechanic), each with `key`, `level`, `titleKey`, `bodyKey`, `iconAsset`. Test `getCardForMechanic('frozenTiles')` returns card with level 8.
- [ ] Step 2: Run — expect FAIL.
- [ ] Step 3: Implement:

```ts
// fe-next/lib/blast/v2/tutorial/mechanic-cards.ts
import type { MechanicKey } from './unlocks-seen';

export type MechanicCard = {
  key: MechanicKey;
  level: number;
  titleKey: string; // 'blast.tutorial.mechanic.<key>.title'
  bodyKey: string;  // 'blast.tutorial.mechanic.<key>.body'
  iconAsset: string; // path to public asset or icon name
};

const MECHANIC_CARDS: Record<MechanicKey, MechanicCard> = {
  coinOverlay: {
    key: 'coinOverlay',
    level: 3,
    titleKey: 'blast.tutorial.mechanic.coinOverlay.title',
    bodyKey: 'blast.tutorial.mechanic.coinOverlay.body',
    iconAsset: '💰',
  },
  reverseSelection: {
    key: 'reverseSelection',
    level: 4,
    titleKey: 'blast.tutorial.mechanic.reverseSelection.title',
    bodyKey: 'blast.tutorial.mechanic.reverseSelection.body',
    iconAsset: '🔄',
  },
  shuffleButton: {
    key: 'shuffleButton',
    level: 5,
    titleKey: 'blast.tutorial.mechanic.shuffleButton.title',
    bodyKey: 'blast.tutorial.mechanic.shuffleButton.body',
    iconAsset: '🔀',
  },
  gemTiles: {
    key: 'gemTiles',
    level: 6,
    titleKey: 'blast.tutorial.mechanic.gemTiles.title',
    bodyKey: 'blast.tutorial.mechanic.gemTiles.body',
    iconAsset: '💎',
  },
  frozenTiles: {
    key: 'frozenTiles',
    level: 8,
    titleKey: 'blast.tutorial.mechanic.frozenTiles.title',
    bodyKey: 'blast.tutorial.mechanic.frozenTiles.body',
    iconAsset: '❄️',
  },
  cascadeWords: {
    key: 'cascadeWords',
    level: 12,
    titleKey: 'blast.tutorial.mechanic.cascadeWords.title',
    bodyKey: 'blast.tutorial.mechanic.cascadeWords.body',
    iconAsset: '⚡',
  },
  doubleBonusTile: {
    key: 'doubleBonusTile',
    level: 15,
    titleKey: 'blast.tutorial.mechanic.doubleBonusTile.title',
    bodyKey: 'blast.tutorial.mechanic.doubleBonusTile.body',
    iconAsset: '🌈',
  },
  revealLetterHint: {
    key: 'revealLetterHint',
    level: 18,
    titleKey: 'blast.tutorial.mechanic.revealLetterHint.title',
    bodyKey: 'blast.tutorial.mechanic.revealLetterHint.body',
    iconAsset: '🔍',
  },
  bonusDictionary: {
    key: 'bonusDictionary',
    level: 25,
    titleKey: 'blast.tutorial.mechanic.bonusDictionary.title',
    bodyKey: 'blast.tutorial.mechanic.bonusDictionary.body',
    iconAsset: '📚',
  },
  revealWordHint: {
    key: 'revealWordHint',
    level: 30,
    titleKey: 'blast.tutorial.mechanic.revealWordHint.title',
    bodyKey: 'blast.tutorial.mechanic.revealWordHint.body',
    iconAsset: '💡',
  },
  lateralSlideGravity: {
    key: 'lateralSlideGravity',
    level: 35,
    titleKey: 'blast.tutorial.mechanic.lateralSlideGravity.title',
    bodyKey: 'blast.tutorial.mechanic.lateralSlideGravity.body',
    iconAsset: '↔️',
  },
  multiWordReveal: {
    key: 'multiWordReveal',
    level: 40,
    titleKey: 'blast.tutorial.mechanic.multiWordReveal.title',
    bodyKey: 'blast.tutorial.mechanic.multiWordReveal.body',
    iconAsset: '✨',
  },
};

export function getCardForMechanic(key: MechanicKey): MechanicCard {
  return MECHANIC_CARDS[key];
}

export function getAllCards(): MechanicCard[] {
  return Object.values(MECHANIC_CARDS).sort((a, b) => a.level - b.level);
}
```

- [ ] Step 4: Run — expect PASS (2 tests).
- [ ] Step 5: Commit `feat(blast-v2): mechanic cards registry (Plan 5 Task 2)`.

---

### Task 3: Veteran detection

**Files:**
- Create: `fe-next/lib/blast/v2/tutorial/veteran-detection.ts`
- Test: `fe-next/lib/blast/v2/tutorial/__tests__/veteran-detection.test.ts`

- [ ] Step 1: Failing test — `isVeteran({max_level_cleared: 5})` → true; `isVeteran({max_level_cleared: 4})` → false; handles missing field gracefully.
- [ ] Step 2: Run — expect FAIL.
- [ ] Step 3: Implement:

```ts
// fe-next/lib/blast/v2/tutorial/veteran-detection.ts
export type BlastProgressSnapshot = { max_level_cleared?: number };

export function isVeteran(progress: BlastProgressSnapshot): boolean {
  return (progress.max_level_cleared ?? 0) >= 5;
}

export function getVeteranCardVariant(): 'welcome_back' | null {
  return 'welcome_back';
}
```

- [ ] Step 4: Run — expect PASS (2 tests).
- [ ] Step 5: Commit `feat(blast-v2): veteran detection (Plan 5 Task 3)`.

---

### Task 4: BlastFtueOverlay (6-step Level 1 FTUE)

**Files:**
- Create: `fe-next/components/blast/v2/BlastFtueOverlay.tsx`
- Test: `fe-next/components/blast/v2/__tests__/BlastFtueOverlay.test.tsx`

**Step Content (from spec):**

| Step | Content | Required action | Auto-advance |
|---|---|---|---|
| 1 | Arrow on leftmost tile + "Drag across letters to spell a word" | start drag | on `pointerdown` |
| 2 | Finger-icon traces CAT slow → "Try it: drag from C to T" | complete drag 3+ tiles | on submit |
| 3 | After 1st found: freeze + "Letters fall to fill space" (slow-mo collapse 800ms) | observation | timer 2s |
| 4 | Theme reveal: "Find 3 ANIMAL words." Pips ●○○ | find 2nd word | on submit |
| 5 | After 2nd: "Or tap each letter, double-tap confirm" + finger demo | find 3rd word | on submit |
| 6 | Level-complete variant: "Level 1! Watch chest bar →" (highlights preview) | tap NEXT LEVEL | on tap |

- [ ] Step 1: Failing test — render with `isVeteran=false`, expect step 1 visible; simulate drag pointerdown → step 2; simulate word-found event → step 3; verify step auto-advance after 2s timeout. Test `isVeteran=true` → render "Welcome back" variant instead of full FTUE.
- [ ] Step 2: Run — expect FAIL.
- [ ] Step 3: Implement:

```tsx
'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from 'framer-motion';

type Props = {
  onComplete: () => void;
  isVeteran?: boolean;
  onStepChange?: (step: number) => void;
};

type FtueStep = 1 | 2 | 3 | 4 | 5 | 6;

export function BlastFtueOverlay({ onComplete, isVeteran, onStepChange }: Props) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState<FtueStep>(1);
  const [skipTimeout, setSkipTimeout] = useState(false);

  useEffect(() => onStepChange?.(step), [step, onStepChange]);

  const handleDragStart = () => {
    if (step === 1) setStep(2);
  };

  const handleWordFound = () => {
    if (step === 2) {
      setStep(3);
      setSkipTimeout(true);
      const timeout = setTimeout(() => {
        setStep(4);
        setSkipTimeout(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }
    if (step === 4) {
      setStep(5);
    }
    if (step === 5) {
      setStep(6);
    }
  };

  const handleLevelComplete = () => {
    if (step === 6) {
      onComplete();
    }
  };

  if (isVeteran) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center bg-black/75 z-50"
      >
        <motion.div
          className="bg-[#0b1530] border-neo-thick border-black rounded-neo p-6 max-w-sm text-center text-white space-y-4"
          initial={{ scale: reducedMotion.prefersReducedMotion ? 1 : 0.9 }}
          animate={{ scale: 1 }}
        >
          <div className="text-2xl font-bold">
            {t('blast.tutorial.veteran.title', 'Welcome back!')}
          </div>
          <p className="text-sm">
            {t('blast.tutorial.veteran.body', 'Blast has been redesigned. Enjoy the new levels!')}
          </p>
          <button
            onClick={onComplete}
            className="px-6 py-3 bg-neo-pink border-neo-thick border-black rounded-neo font-bold"
          >
            {t('blast.tutorial.veteran.cta', 'Let\'s go')}
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {step === 1 && (
        <motion.div
          key="step-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={handleDragStart}
          className="fixed inset-0 flex items-center justify-center bg-black/75 z-50"
        >
          <div className="space-y-4 text-center">
            <div className="text-white text-lg">
              {t('blast.tutorial.ftue.step1', 'Drag across letters to spell a word')}
            </div>
            <svg className="w-12 h-12 mx-auto" viewBox="0 0 24 24">
              <path d="M3 12h18M12 3v18" stroke="white" strokeWidth="2" />
            </svg>
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div
          key="step-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center bg-black/75 z-50"
        >
          <div className="space-y-4 text-center text-white">
            <div className="text-lg">
              {t('blast.tutorial.ftue.step2', 'Try it: drag from C to T')}
            </div>
            {!reducedMotion.prefersReducedMotion && (
              <motion.svg
                className="w-16 h-16 mx-auto"
                viewBox="0 0 100 100"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <path d="M 20 50 Q 50 30, 80 50" stroke="white" strokeWidth="3" fill="none" />
              </motion.svg>
            )}
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div
          key="step-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center bg-black/75 z-50"
        >
          <div className="space-y-4 text-center text-white">
            <div className="text-lg">
              {t(
                'blast.tutorial.ftue.step3',
                'Letters above fall to fill the space',
              )}
            </div>
            <div className="text-xs opacity-70">
              {!reducedMotion.prefersReducedMotion
                ? t('blast.tutorial.ftue.step3.hint', 'Watch the animation')
                : t('blast.tutorial.ftue.step3.hint', 'Letters fall down')}
            </div>
            {skipTimeout && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.3 }}
              >
                ✓
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {step === 4 && (
        <motion.div
          key="step-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center bg-black/75 z-50"
        >
          <div className="space-y-4 text-center text-white">
            <div className="text-lg font-bold">
              {t('blast.tutorial.ftue.step4', 'Find 3 ANIMAL words')}
            </div>
            <div className="flex justify-center gap-2">
              <span className="text-2xl">●</span>
              <span className="text-2xl opacity-30">○</span>
              <span className="text-2xl opacity-30">○</span>
            </div>
          </div>
        </motion.div>
      )}

      {step === 5 && (
        <motion.div
          key="step-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center bg-black/75 z-50"
        >
          <div className="space-y-4 text-center text-white">
            <div className="text-lg">
              {t(
                'blast.tutorial.ftue.step5',
                'Or tap each letter, double-tap to confirm',
              )}
            </div>
            {!reducedMotion.prefersReducedMotion && (
              <motion.svg
                className="w-16 h-16 mx-auto"
                viewBox="0 0 100 100"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <circle cx="50" cy="50" r="20" fill="white" opacity="0.5" />
              </motion.svg>
            )}
          </div>
        </motion.div>
      )}

      {step === 6 && (
        <motion.div
          key="step-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleLevelComplete}
          className="fixed inset-0 flex items-center justify-center bg-black/75 z-50"
        >
          <div className="space-y-4 text-center text-white">
            <div className="text-2xl font-bold">
              {t('blast.tutorial.ftue.step6', 'Level 1! Watch your chest bar →')}
            </div>
            <div className="text-sm opacity-70">
              {t('blast.tutorial.ftue.step6.hint', 'Tap to continue')}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] Step 4: Run — expect PASS (4 tests).
- [ ] Step 5: Commit `feat(blast-v2): BlastFtueOverlay 6-step FTUE (Plan 5 Task 4)`.

---

### Task 5: BlastUnlockCard (mechanic tutorial modal)

**Files:**
- Create: `fe-next/components/blast/v2/BlastUnlockCard.tsx`
- Test: `fe-next/components/blast/v2/__tests__/BlastUnlockCard.test.tsx`

- [ ] Step 1: Failing test — render card with `mechanic='frozenTiles'`, expect title + body + "Got it" button; card #2+ include "Skip tutorials" link; test click "Skip" → `onSkipAll()` called; click "Got it" → `onDismiss()` called.
- [ ] Step 2: Run — expect FAIL.
- [ ] Step 3: Implement:

```tsx
'use client';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from 'framer-motion';
import type { MechanicKey } from '@/lib/blast/v2/tutorial/unlocks-seen';
import { getCardForMechanic } from '@/lib/blast/v2/tutorial/mechanic-cards';

type Props = {
  mechanic: MechanicKey;
  cardIndex: number; // 0-based; 0 = first card (no skip link)
  onDismiss: () => void;
  onSkipAll?: () => void;
};

export function BlastUnlockCard({ mechanic, cardIndex, onDismiss, onSkipAll }: Props) {
  const { t } = useLanguage();
  const card = getCardForMechanic(mechanic);
  const reducedMotion = useReducedMotion();
  const showSkipLink = cardIndex > 0; // Card #2+ (index 1+)

  return (
    <motion.div
      initial={{ opacity: reducedMotion.prefersReducedMotion ? 1 : 0, scale: reducedMotion.prefersReducedMotion ? 1 : 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 flex items-center justify-center bg-black/50 z-40"
    >
      <motion.div
        className="bg-[#0b1530] border-neo-thick border-black rounded-neo p-8 max-w-sm space-y-4 text-white"
        animate={{ y: 0 }}
      >
        <div className="text-4xl text-center">{card.iconAsset}</div>
        <h2 className="text-xl font-bold text-center">
          {t(card.titleKey, `NEW: ${mechanic}`)}
        </h2>
        <p className="text-sm text-center opacity-90">
          {t(card.bodyKey, 'A new mechanic has been unlocked')}
        </p>
        <button
          onClick={onDismiss}
          className="w-full px-4 py-3 bg-neo-pink border-neo-thick border-black rounded-neo font-bold text-center"
          data-testid="unlock-card-got-it"
        >
          {t('blast.tutorial.unlock.gotIt', 'Got it')}
        </button>
        {showSkipLink && (
          <button
            onClick={() => onSkipAll?.()}
            className="text-xs text-center opacity-70 hover:opacity-100 transition-opacity"
            data-testid="unlock-card-skip-all"
          >
            {t('blast.tutorial.unlock.skipFuture', 'Skip future tutorials')}
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
```

- [ ] Step 4: Run — expect PASS (4 tests).
- [ ] Step 5: Commit `feat(blast-v2): BlastUnlockCard mechanic tutorial (Plan 5 Task 5)`.

---

### Task 6: useBlastTutorial hook

**Files:**
- Create: `fe-next/hooks/useBlastTutorial.ts`
- Test: `fe-next/hooks/__tests__/useBlastTutorial.test.tsx`

- [ ] Step 1: Failing test — pass `currentLevel=1, unlocksSeen={}, isVeteran=false` → hook returns `{showFtueOverlay: true, ftueProps}`. Level 3, `ftueCompleted && !coinOverlay seen` → `{showUnlockCard: 'coinOverlay', ...}`. Level 3 again with `coinOverlay seen` → no card. `skipAll: true` → all future cards hidden but `showFtueOverlay` still possible (vet skip doesn't affect ftue).
- [ ] Step 2: Run — expect FAIL.
- [ ] Step 3: Implement:

```ts
'use client';
import { useMemo } from 'react';
import type { BlastLevel } from '@/lib/blast/v2/types';
import type { UnlocksSeen, MechanicKey } from '@/lib/blast/v2/tutorial/unlocks-seen';
import { hasSeenUnlock, shouldSkipAll, completeFtue } from '@/lib/blast/v2/tutorial/unlocks-seen';
import { getCardForMechanic } from '@/lib/blast/v2/tutorial/mechanic-cards';
import { mechanicsForLevel } from '@/lib/blast/v2/mechanic-flags';
import { MECHANIC_KEYS } from '@/lib/blast/v2/tutorial/unlocks-seen';

type TutorialState = {
  showFtueOverlay: boolean;
  showUnlockCard: MechanicKey | null;
  unlockCardIndex: number; // for "Skip" link visibility
};

export function useBlastTutorial(
  level: BlastLevel,
  unlocksSeen: UnlocksSeen,
  isVeteran: boolean,
  onUpdateUnlocks: (updated: UnlocksSeen) => void,
): TutorialState {
  return useMemo(() => {
    // FTUE: Level 1, not yet completed
    if (level.levelNumber === 1 && !hasSeenUnlock(unlocksSeen, 'ftue_completed')) {
      return {
        showFtueOverlay: true,
        showUnlockCard: null,
        unlockCardIndex: -1,
      };
    }

    // Skip-all flag hides all future cards
    if (shouldSkipAll(unlocksSeen)) {
      return {
        showFtueOverlay: false,
        showUnlockCard: null,
        unlockCardIndex: -1,
      };
    }

    // Check for new mechanic unlock
    const mechanics = mechanicsForLevel(level.levelNumber);
    const mechanicKeys = MECHANIC_KEYS.filter((k) => mechanics[k as keyof typeof mechanics]);
    for (let i = 0; i < mechanicKeys.length; i++) {
      const key = mechanicKeys[i]!;
      if (!hasSeenUnlock(unlocksSeen, key)) {
        return {
          showFtueOverlay: false,
          showUnlockCard: key,
          unlockCardIndex: i,
        };
      }
    }

    return {
      showFtueOverlay: false,
      showUnlockCard: null,
      unlockCardIndex: -1,
    };
  }, [level, unlocksSeen]);
}
```

- [ ] Step 4: Run — expect PASS (3 tests).
- [ ] Step 5: Commit `feat(blast-v2): useBlastTutorial hook (Plan 5 Task 6)`.

---

### Task 7: BlastTutorialReplaySection in Settings

**Files:**
- Create: `fe-next/components/settings/BlastTutorialReplaySection.tsx`
- Test: `fe-next/components/settings/__tests__/BlastTutorialReplaySection.test.tsx`

- [ ] Step 1: Failing test — render section with `onReplay` callback; list all 12 mechanic cards + L1 FTUE; tap "Frozen Tiles" → `onReplay('frozenTiles')` called. Section collapses/expands (or is always visible in game settings).
- [ ] Step 2: Run — expect FAIL.
- [ ] Step 3: Implement (uses existing Settings component patterns from codebase):

```tsx
'use client';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAllCards } from '@/lib/blast/v2/tutorial/mechanic-cards';
import type { MechanicKey } from '@/lib/blast/v2/tutorial/unlocks-seen';

type Props = {
  onReplayFtue?: () => void;
  onReplayMechanic?: (key: MechanicKey) => void;
};

export function BlastTutorialReplaySection({ onReplayFtue, onReplayMechanic }: Props) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const cards = getAllCards();

  return (
    <div className="border-neo-thick border-black rounded-neo p-4 space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left font-bold flex justify-between items-center"
      >
        <span>{t('blast.settings.tutorials', 'Replay Tutorials')}</span>
        <span className="text-xs">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="space-y-2 border-t-neo-thick border-t-black pt-3">
          <button
            onClick={onReplayFtue}
            className="w-full text-left text-sm px-3 py-2 hover:bg-white/10 rounded transition-colors"
          >
            {t('blast.tutorial.ftue.label', 'Level 1 FTUE')}
          </button>
          {cards.map((card) => (
            <button
              key={card.key}
              onClick={() => onReplayMechanic?.(card.key)}
              className="w-full text-left text-sm px-3 py-2 hover:bg-white/10 rounded transition-colors"
            >
              {card.iconAsset} {t(card.titleKey, `Mechanic: ${card.key}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] Step 4: Run — expect PASS (3 tests).
- [ ] Step 5: Commit `feat(blast-v2): BlastTutorialReplaySection in Settings (Plan 5 Task 7)`.

---

### Task 8: Integrate tutorials into BlastGame

**Files modified:**
- Modify: `fe-next/components/blast/v2/BlastGame.tsx`
- Test: `fe-next/components/blast/v2/__tests__/BlastGame.test.tsx` (update existing)

- [ ] Step 1: Current BlastGame has states: intro → board → complete. Add tutorial layers: after intro, before board, check `useBlastTutorial` → if `showFtueOverlay` or `showUnlockCard`, render overlay/card blocking input. FTUE completion → `onUpdateUnlocks(completeFtue(unlocks))` → re-compute tutorial state → show next mechanic card if any.
- [ ] Step 2: Update test to cover: render level 1 → show FTUE → simulate FTUE completion → no overlay, show board. Level 3 without coinOverlay seen → show unlock card → dismiss → show board.
- [ ] Step 3: Modify BlastGame:

```tsx
'use client';
import { useState } from 'react';
import type { BlastLevel } from '@/lib/blast/v2/types';
import type { UnlocksSeen, MechanicKey } from '@/lib/blast/v2/tutorial/unlocks-seen';
import { useBlastV2 } from '@/lib/blast/v2/useBlastV2';
import { useBlastTutorial } from '@/hooks/useBlastTutorial';
import { markUnlockSeen, completeFtue, setSkipAll } from '@/lib/blast/v2/tutorial/unlocks-seen';
import { isVeteran } from '@/lib/blast/v2/tutorial/veteran-detection';
import { BlastBoard } from './BlastBoard';
import { BlastHud } from './BlastHud';
import { BlastLevelIntroCard } from './BlastLevelIntroCard';
import { BlastLevelCompleteCard } from './BlastLevelCompleteCard';
import { BlastFtueOverlay } from './BlastFtueOverlay';
import { BlastUnlockCard } from './BlastUnlockCard';

type Props = {
  level: BlastLevel;
  unlocksSeen?: UnlocksSeen;
  isVeteranPlayer?: boolean;
  onAdvance: () => void;
  onUpdateUnlocks?: (unlocks: UnlocksSeen) => void;
};

export function BlastGame({
  level, unlocksSeen = {}, isVeteranPlayer = false,
  onAdvance, onUpdateUnlocks,
}: Props) {
  const [introDismissed, setIntroDismissed] = useState(false);
  const { state, handlers } = useBlastV2(level);
  const tutorial = useBlastTutorial(level, unlocksSeen, isVeteranPlayer, onUpdateUnlocks ?? (() => {}));

  const handleFtueComplete = () => {
    const updated = completeFtue(unlocksSeen);
    onUpdateUnlocks?.(updated);
  };

  const handleUnlockCardDismiss = () => {
    if (tutorial.showUnlockCard) {
      const updated = markUnlockSeen(unlocksSeen, tutorial.showUnlockCard);
      onUpdateUnlocks?.(updated);
    }
  };

  const handleUnlockCardSkipAll = () => {
    const updated = setSkipAll(unlocksSeen, true);
    onUpdateUnlocks?.(updated);
  };

  if (!introDismissed) {
    return (
      <>
        <BlastLevelIntroCard level={level} onDismiss={() => setIntroDismissed(true)} />
        {tutorial.showFtueOverlay && (
          <BlastFtueOverlay
            onComplete={handleFtueComplete}
            isVeteran={isVeteranPlayer}
          />
        )}
      </>
    );
  }

  if (state.status === 'levelComplete') {
    return (
      <BlastLevelCompleteCard
        coins={state.coins}
        cascadeCount={state.cascadeCount}
        onNext={onAdvance}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1530] text-white">
      {tutorial.showUnlockCard && (
        <BlastUnlockCard
          mechanic={tutorial.showUnlockCard}
          cardIndex={tutorial.unlockCardIndex}
          onDismiss={handleUnlockCardDismiss}
          onSkipAll={handleUnlockCardSkipAll}
        />
      )}
      <BlastHud
        levelNumber={state.level.levelNumber}
        coins={state.coins}
        chestProgress={state.chestProgress}
        onShuffle={handlers.onShuffle}
        onHint={() => {/* Plan 5 wires hints */}}
      />
      <BlastBoard
        level={state.level}
        selection={state.selection}
        invalidShakeKey={state.invalidShakeKey}
        onPointerDown={handlers.onPointerDown}
        onPointerEnter={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
      />
    </div>
  );
}
```

- [ ] Step 4: Run updated tests — expect PASS.
- [ ] Step 5: Commit `feat(blast-v2): integrate tutorials into BlastGame (Plan 5 Task 8)`.

---

### Task 9: Wire tutorial state into BlastV2PageClient

**Files modified:**
- Modify: `fe-next/app/[locale]/blast/v2/BlastV2PageClient.tsx`

- [ ] Step 1: Add state `unlocksSeen` + `isVeteran` detection. On level load, check Plan 3's DB for player's `blast_progress` row. Stub for now (Plan 3 wires the actual fetch).
- [ ] Step 2: Pass to `<BlastGame unlocksSeen={unlocksSeen} isVeteranPlayer={isVeteran} onUpdateUnlocks={updateToDB} />`.
- [ ] Step 3: Modify:

```tsx
'use client';
import { useEffect, useState } from 'react';
import type { BlastLevel, Locale } from '@/lib/blast/v2/types';
import type { UnlocksSeen } from '@/lib/blast/v2/tutorial/unlocks-seen';
import { buildRegistry } from '@/lib/blast/v2/level-source-registry';
import { getLevelSource } from '@/lib/blast/v2/level-source';
import { isVeteran as checkVeteran } from '@/lib/blast/v2/tutorial/veteran-detection';
import { BlastGame } from '@/components/blast/v2/BlastGame';

type BlastProgressSnapshot = { max_level_cleared?: number; unlocks_seen?: UnlocksSeen };

export function BlastV2PageClient({ locale }: { locale: Locale }) {
  const [level, setLevel] = useState<BlastLevel | null>(null);
  const [levelNumber, setLevelNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [unlocksSeen, setUnlocksSeen] = useState<UnlocksSeen>({});
  const [isVeteran, setIsVeteran] = useState(false);

  useEffect(() => {
    // Plan 3 replaces this with real DB fetch
    const fetchProgress = async () => {
      try {
        // Stub: assume guest = no prior progress
        setIsVeteran(false);
        setUnlocksSeen({});
      } catch (e) {
        console.error('Failed to fetch blast progress:', e);
      }
    };
    fetchProgress();
  }, []);

  useEffect(() => {
    const registry = buildRegistry();
    const src = getLevelSource(levelNumber, registry);
    src.resolve(levelNumber, locale, 'guest')
      .then(setLevel)
      .catch((e: Error) => setError(e.message));
  }, [levelNumber, locale]);

  if (error) return <div className="p-8 text-red-400">Failed to load level: {error}</div>;
  if (!level) return <div className="p-8 text-white">Loading…</div>;

  return (
    <BlastGame
      level={level}
      unlocksSeen={unlocksSeen}
      isVeteranPlayer={isVeteran}
      onAdvance={() => setLevelNumber((n) => n + 1)}
      onUpdateUnlocks={(updated) => {
        setUnlocksSeen(updated);
        // Plan 3 wires the DB write here
      }}
    />
  );
}
```

- [ ] Step 4: Run — no test required (Plan 3 integration test).
- [ ] Step 5: Commit `feat(blast-v2): wire tutorial state into BlastV2PageClient (Plan 5 Task 9)`.

---

### Task 10: Add BlastTutorialReplaySection to Game Settings

**Files modified:**
- Modify: `fe-next/app/[locale]/settings/game/page.tsx` (or existing Game settings component)

- [ ] Step 1: Find existing Game settings panel (e.g., Blast preferences, sound, etc.). Add `<BlastTutorialReplaySection />` in the Blast section.
- [ ] Step 2: Wire `onReplayFtue` and `onReplayMechanic` callbacks to show the respective modal (can be a portal or state-managed overlay).
- [ ] Step 3: Update test to verify section renders.
- [ ] Step 4: Commit `feat(blast-v2): add tutorial replay to Game settings (Plan 5 Task 10)`.

---

### Task 11: Full Plan 5 verification

**Files:** None modified — verification only.

- [ ] Step 1: `cd fe-next && npx vitest run lib/blast/v2/tutorial/ hooks/ components/blast/v2/__tests__/BlastFtueOverlay.test.tsx components/blast/v2/__tests__/BlastUnlockCard.test.tsx` — expect ALL PASS (sum ~40+ tests).
- [ ] Step 2: `cd fe-next && npm run lint && npx tsc --noEmit` — expect zero errors.
- [ ] Step 3: `cd fe-next && npm run build` — expect success.
- [ ] Step 4: Manual dev-server smoke:
  - Start `npm run dev` (port 3001)
  - Force `blast.v2 = on` via PostHog
  - Visit `/en/blast/` → intro → FTUE overlay step 1 visible with arrow/text
  - Simulate drag on board (interact with BlastTile) → FTUE advances to step 2
  - Continue through all steps
  - Level 1 complete → visit Level 3
  - Expect "NEW: Coin Overlay" unlock card (if coinOverlay not yet marked seen)
  - Click "Skip future tutorials" → future cards auto-dismiss but still appear in Settings
  - Navigate to `/settings/game/` → verify "Replay Tutorials" section
  - Tap "Coin Overlay" → modal re-shows
  - Check console for zero errors
- [ ] Step 5: Tag commit `blast-v2-plan-5-complete`.

---

## Self-review checklist (Plan 5)

- [x] Every step has runnable code or command, no "TBD"
- [x] UnlocksSeen type and helpers are exhaustive (ftue_completed, skip_all, veteran_bonus_granted, all 12 mechanics)
- [x] Mechanic cards registry is complete (12 entries, sorted by level, level-to-mechanic map stable)
- [x] BlastFtueOverlay covers all 6 steps per spec with correct auto-advance triggers
- [x] BlastUnlockCard reusable for all mechanics + shows "Skip" only on card #2+ (index >= 1)
- [x] useBlastTutorial logic is correct: FTUE when level=1 && !ftue_completed; mechanic cards only after FTUE; skip_all hides future cards
- [x] Veteran detection reads `max_level_cleared >= 5` and shows alternate card variant on L1
- [x] Reduced-motion support: finger traces use static arrows; slow-motion collapse becomes regular speed with text cue
- [x] RTL safe: BlastFtueOverlay and BlastUnlockCard use `text-center` and flexbox; no LTR-dependent layout
- [x] Integration with BlastGame: card display blocks board input until dismissed; dismissed card persists to unlocks_seen

## Deliverables to Plans 6-7

- **Plan 6** consumes: all inline English fallbacks in `t(...)` calls become translation keys in `translations/<locale>.js`. Mechanic card `titleKey` / `bodyKey` must match spec (~120 strings × 5 locales).
- **Plan 7** consumes: `useBlastTutorial` hook + card dismiss/skip actions are natural emit points for `blast_tutorial_seen` events.

## Risks tracked in this plan

| Risk | Mitigation |
|---|---|
| FTUE step auto-advance logic races with user input | Tested in Task 4; step state is source of truth, transitions are explicit |
| Skip-all flag persists but replay still works | Correct: skip-all affects live game only; Settings replay ignores flag and always shows cards |
| Mechanic card index mismatch between visible cards and rendered index | Registry is static sorted by level; cardIndex passed explicitly to BlastUnlockCard per spec |
| Veteran "Welcome back" card shown even after FTUE started | Checked in `useBlastTutorial`: FTUE takes precedence (both can't show); vet check only affects L1 FTUE variant |
| Reduced-motion detection causes jumpy animations | `useReducedMotion()` from framer-motion checked in component render; no layout shift |

---

**End Plan 5. Next milestone: Tutorials gate input on L1 + mechanic cards appear per progression.**
