# Tutorial Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ModeCoach's non-blocking overlay the sole *automatic* "how to play" moment for wordHunt, classic, and adventure — removing the duplicate blocking pre-game tutorial popups without deleting the on-demand help features that aren't actually duplicates.

**Architecture:** Three independent, mode-scoped changes. (A) wordHunt: stop auto-firing `DailyChallengeTutorial`, keep it as an on-demand "How to Play" reference (it has its own Help button — not a duplicate), fold its unique free-bonus-word teaching into ModeCoach's wordHunt content. (B) classic: trim `PreGameTutorial` down to its non-tutorial CTA screen only (avatar builder / boost / start) — its teaching content duplicates ModeCoach's classic overlay. (C) adventure: delete `AdventureTutorial` outright (pure auto-fire FTUE, no on-demand reuse) and mount `ModeCoach mode="adventure"` for the first time — completing a migration the 2026-06-19 spec deferred.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest + React Testing Library, framer-motion, i18n via `useLanguage().t()` across 6 locale files (`en`, `es`, `he`, `ja`, `ru`, `sv`).

## Global Constraints

- ALL UI text via `t('key')` — never hardcode strings (project CLAUDE.md).
- Every new/changed component needs test coverage (project CLAUDE.md: "MANDATORY TESTING").
- TDD strict: write the failing test first, watch it fail, then implement (`.claude/rules/22-tdd-strict.md`). For deletions/trims, the "failing test" asserts the *new* desired behavior against the *old* code.
- If an old test asserts behavior this plan intentionally removes (e.g. "shows welcome mascot"), deleting/rewriting that assertion is correct here — it is not "fixing a test to hide a bug," it's updating the spec of the component per the approved design (`docs/superpowers/specs/2026-07-07-tutorial-consolidation-design.md`).
- Run `npm run lint && npm run test && npm run build` after each task (project CLAUDE.md).
- Commits happen after each task, but this project's git rules require asking the user before running `git commit` — prepare the commit, then ask, don't run it unprompted.
- Max 500 lines per file; components < 300 lines.

---

### Task A: wordHunt — stop auto-firing DailyChallengeTutorial, enrich ModeCoach

**Files:**
- Modify: `fe-next/components/daily/DailyChallenge.tsx`
- Modify: `fe-next/components/daily/DailyReadyScreen.tsx`
- Delete: `fe-next/components/daily/tutorial/shouldAutoShowTutorial.ts`
- Delete: `fe-next/components/daily/tutorial/__tests__/shouldAutoShowTutorial.test.ts`
- Delete: `fe-next/components/daily/tutorial/markWordHuntTutorialSeen.ts`
- Delete: `fe-next/components/daily/tutorial/__tests__/markWordHuntTutorialSeen.test.ts`
- Modify: `fe-next/utils/dailyChallenge/constants.ts` (remove `getWordHuntTutorialKey`)
- Modify: `fe-next/utils/dailyChallenge.ts` (remove its re-export)
- Modify: `fe-next/components/daily/__tests__/DailyChallenge.adFailureFreePlay.test.tsx`
- Modify: `fe-next/components/daily/__tests__/DailyChallenge.completedTracking.test.tsx`
- Modify: `fe-next/components/daily/__tests__/DailyChallenge.audioUnlock.test.tsx`
- Modify: `fe-next/components/daily/__tests__/DailyReadyScreen.stickyButton.test.tsx`
- Modify: `fe-next/components/daily/__tests__/DailyReadyScreen.musicPreload.test.tsx`
- Modify: `fe-next/components/daily/__tests__/DailyReadyScreen.howToPlay.test.tsx`
- Modify: `fe-next/lib/tutorial/modeCoachContent.ts`
- Modify: `fe-next/components/tutorial/ModeCoach.test.tsx`
- Modify: `fe-next/translations/en.js`, `es.js`, `he.js`, `ja.js`, `ru.js`, `sv.js`

**Do NOT touch:** `DailyChallengeTutorial.tsx` and `DailyChallengeTutorial.test.tsx` — the component stays, unmodified, as the on-demand reference opened by the "How to Play" (`HelpCircle`) button in `DailyReadyScreen.tsx` (lines 311-316, 342-348). Only its *automatic* first-visit trigger is being removed.

**Interfaces:**
- Produces: `MODE_COACH.wordHunt.steps` gains a 3rd `CoachStep` (`{ demo: 'icon', emoji: '💚', captionKey: 'modeCoach.wordHunt.step3' }`).
- Consumes: `useModeCoach`/`ModeCoach` unchanged — no signature changes.

- [ ] **Step 1: Write the failing test — tutorial no longer auto-shows on ready phase**

Add to `fe-next/components/daily/__tests__/DailyChallenge.completedTracking.test.tsx` (it already mocks `DailyChallengeTutorial` as a visible test div, so this is the right file):

```typescript
it('does NOT auto-show the tutorial when the ready phase loads', async () => {
  // ... reuse this file's existing render/setup helper to reach phase === 'ready' ...
  expect(screen.queryByTestId('tutorial')).toBeNull();
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npm run test -- DailyChallenge.completedTracking`
Expected: FAIL — `shouldAutoShowTutorial` still fires the effect, tutorial div is present.

- [ ] **Step 3: Remove the auto-show effect and its dead dependencies from `DailyChallenge.tsx`**

Remove the import:
```typescript
import { shouldAutoShowTutorial } from './tutorial/shouldAutoShowTutorial';
```

Remove the effect (was lines 104-108):
```typescript
useEffect(() => {
  if (shouldAutoShowTutorial({ phase, tutorialCompleted, showTutorial })) {
    setShowTutorial(true);
  }
}, [phase, tutorialCompleted, showTutorial]);
```

Remove the `tutorialCompleted` state declaration (was line 102):
```typescript
const [tutorialCompleted, setTutorialCompleted] = useState(false);
```

Remove the import and the localStorage read block (was lines ~188-191):
```typescript
      const tutorialKey = getWordHuntTutorialKey(gameLanguage);
      const hasCompletedTutorial = typeof window !== 'undefined' && localStorage.getItem(tutorialKey) === 'true';
      setTutorialCompleted(hasCompletedTutorial);
```
and remove `getWordHuntTutorialKey` from the `import { ... } from '@/utils/dailyChallenge'` (or wherever it's imported at the top) list.

Remove the import:
```typescript
import { markWordHuntTutorialSeen } from './tutorial/markWordHuntTutorialSeen';
```

Simplify the two handlers (was lines ~555-566) from:
```typescript
const handleTutorialComplete = useCallback(() => {
  markWordHuntTutorialSeen(gameLanguage);
  setTutorialCompleted(true);
  setShowTutorial(false);
}, [gameLanguage]);

const handleTutorialSkip = useCallback(() => {
  markWordHuntTutorialSeen(gameLanguage);
  setTutorialCompleted(true);
  setShowTutorial(false);
}, [gameLanguage]);
```
to:
```typescript
const handleTutorialComplete = useCallback(() => {
  setShowTutorial(false);
}, []);

const handleTutorialSkip = useCallback(() => {
  setShowTutorial(false);
}, []);
```
(Keep both handlers separately — even though they're now identical, `DailyChallengeTutorial`'s `onComplete`/`onSkip` props expect two callbacks; collapsing them into one shared reference is fine too, either is acceptable. Prefer keeping two named callbacks for clarity at the call site.)

Remove the `tutorialCompleted={tutorialCompleted}` prop passed to `<DailyReadyScreen ... />` (was line 610).

Leave untouched: the `showTutorial` state declaration, `handleShowTutorial` (`() => setShowTutorial(true)`), and the `{showTutorial && <DailyChallengeTutorial onComplete={handleTutorialComplete} onSkip={handleTutorialSkip} />}` render block.

- [ ] **Step 4: Remove the now-dead `tutorialCompleted` prop from `DailyReadyScreen.tsx`**

Remove from the props interface:
```typescript
tutorialCompleted: boolean;
```
Remove from the destructured props:
```typescript
tutorialCompleted,
```
(It was never read in the component body — confirmed via grep — so no JSX changes needed here.)

- [ ] **Step 5: Delete the two now-unused utility files and their tests**

```bash
git rm fe-next/components/daily/tutorial/shouldAutoShowTutorial.ts
git rm fe-next/components/daily/tutorial/__tests__/shouldAutoShowTutorial.test.ts
git rm fe-next/components/daily/tutorial/markWordHuntTutorialSeen.ts
git rm fe-next/components/daily/tutorial/__tests__/markWordHuntTutorialSeen.test.ts
```

- [ ] **Step 6: Remove `getWordHuntTutorialKey` from `utils/dailyChallenge/constants.ts` and its re-export**

In `fe-next/utils/dailyChallenge/constants.ts`, remove:
```typescript
export const getWordHuntTutorialKey = (lang: Language): string =>
  /* ... existing body ... */;
```
In `fe-next/utils/dailyChallenge.ts`, remove the re-export line:
```typescript
  getWordHuntTutorialKey,
```
from its `export { ... } from './dailyChallenge/constants'` block.

- [ ] **Step 7: Remove the dead mock lines from the 3 DailyChallenge test files**

In each of `DailyChallenge.adFailureFreePlay.test.tsx`, `DailyChallenge.completedTracking.test.tsx`, `DailyChallenge.audioUnlock.test.tsx`, remove this line from the `vi.mock('@/utils/dailyChallenge/constants', ...)` (or wherever it lives) mock object:
```typescript
  getWordHuntTutorialKey: vi.fn(() => 'word_hunt_tutorial_en'),
```

- [ ] **Step 8: Remove the dead `tutorialCompleted: true,` line from the 3 DailyReadyScreen test files**

In each of `DailyReadyScreen.stickyButton.test.tsx`, `DailyReadyScreen.musicPreload.test.tsx`, `DailyReadyScreen.howToPlay.test.tsx`, remove the line:
```typescript
tutorialCompleted: true,
```
from the shared default-props object.

- [ ] **Step 9: Run the Step-1 test again, confirm it passes**

Run: `npm run test -- DailyChallenge.completedTracking`
Expected: PASS.

- [ ] **Step 10: Run the full daily test suite to confirm no regressions**

Run: `npm run test -- daily`
Expected: all PASS.

- [ ] **Step 11: Write the failing test — ModeCoach wordHunt needs a 3rd step for the free-bonus-word mechanic**

Add to `fe-next/components/tutorial/ModeCoach.test.tsx`:

```typescript
it('wordHunt reaches a 3rd step teaching the free-bonus-word mechanic', () => {
  render(<ModeCoach mode="wordHunt" graceMs={300} />);
  act(() => {
    vi.advanceTimersByTime(700 + 300);
  });
  fireEvent.click(screen.getByText('modeCoach.next')); // step1 -> step2
  fireEvent.click(screen.getByText('modeCoach.next')); // step2 -> step3
  expect(screen.getByText('modeCoach.wordHunt.step3')).toBeInTheDocument();
});
```

- [ ] **Step 12: Run it, confirm it fails**

Run: `npm run test -- ModeCoach`
Expected: FAIL — wordHunt only has 2 steps, the 2nd click closes the coach (`isLastStep` at step2) instead of revealing a step3 caption.

- [ ] **Step 13: Add the 3rd step to the wordHunt entry in `modeCoachContent.ts`**

In `fe-next/lib/tutorial/modeCoachContent.ts`, change:
```typescript
  wordHunt: {
    mode: 'wordHunt',
    tier: 'rich',
    accent: 'cyan',
    titleKey: 'modeCoach.wordHunt.title',
    steps: [
      { demo: 'tapClue', captionKey: 'modeCoach.wordHunt.step1' },
      { demo: 'drag', captionKey: 'modeCoach.wordHunt.step2' },
    ],
    scoreTipKey: 'modeCoach.wordHunt.scoreTip',
  },
```
to:
```typescript
  wordHunt: {
    mode: 'wordHunt',
    tier: 'rich',
    accent: 'cyan',
    titleKey: 'modeCoach.wordHunt.title',
    steps: [
      { demo: 'tapClue', captionKey: 'modeCoach.wordHunt.step1' },
      { demo: 'drag', captionKey: 'modeCoach.wordHunt.step2' },
      { demo: 'icon', emoji: '💚', captionKey: 'modeCoach.wordHunt.step3' },
    ],
    scoreTipKey: 'modeCoach.wordHunt.scoreTip',
  },
```

- [ ] **Step 14: Add the `modeCoach.wordHunt.step3` translation key to all 6 locale files**

English source text: `"Short words cost no try"` (matches this mode's existing caption tone — short, imperative, ≤6 words). It teaches exactly what `DailyChallengeTutorial`'s Step 2 ("Free bonus words") taught, condensed to a caption.

In `fe-next/translations/en.js`, inside `modeCoach.wordHunt`, change:
```javascript
    "wordHunt": {
      "title": "Crack the Word",
      "step1": "Find the hidden word",
      "step2": "Spell words to reveal clues",
      "scoreTip": "Crack it first for big points!"
    },
```
to:
```javascript
    "wordHunt": {
      "title": "Crack the Word",
      "step1": "Find the hidden word",
      "step2": "Spell words to reveal clues",
      "step3": "Short words cost no try",
      "scoreTip": "Crack it first for big points!"
    },
```

In `fe-next/translations/es.js`, inside `modeCoach.wordHunt` (currently `"title": "Adivina la Palabra"`, `step1`/`step2`/`scoreTip` as shown above), add after `step2`:
```javascript
      "step3": "Las palabras cortas no gastan intentos",
```

In `fe-next/translations/sv.js`, inside `modeCoach.wordHunt` (currently `"title": "Gissa ordet"`), add after `step2`:
```javascript
      "step3": "Korta ord kostar inget försök",
```

For `he.js`, `ja.js`, and `ru.js`: invoke the `fe-next:ux-writer` skill (`Skill({skill: "fe-next:ux-writer"})`) to translate `"Short words cost no try"` into Hebrew, Japanese, and Russian respectively — give it the English source plus each language's existing sibling captions (shown in the research above, e.g. Hebrew: `"step1": "מצא את המילה הנסתרת"`, `"step2": "אייתו מילים כדי לחשוף רמזים"`) as the tone/style reference, and the exact insertion point (`modeCoach.wordHunt`, after `step2`, before `scoreTip`, in each respective locale file). Do not hand-author these three yourself — the project has a documented failure mode where non-native-checked he/ja/ru copy ships wrong (see project memory `education-pages-full-i18n-2026-07-04`).

- [ ] **Step 15: Run the Step-11 test again, confirm it passes**

Run: `npm run test -- ModeCoach`
Expected: PASS.

- [ ] **Step 16: Run lint, full test suite, and build**

Run: `npm run lint && npm run test && npm run build`
Expected: all green.

- [ ] **Step 17: Prepare the commit — ASK the user before running it**

```bash
git add fe-next/components/daily fe-next/utils/dailyChallenge.ts fe-next/utils/dailyChallenge/constants.ts fe-next/lib/tutorial/modeCoachContent.ts fe-next/components/tutorial/ModeCoach.test.tsx fe-next/translations/en.js fe-next/translations/es.js fe-next/translations/he.js fe-next/translations/ja.js fe-next/translations/ru.js fe-next/translations/sv.js
git commit -m "fix(tutorial): stop auto-firing Daily's blocking tutorial, teach free-bonus mechanic in ModeCoach overlay instead"
```

---

### Task B: classic — trim PreGameTutorial to its CTA screen only

**Files:**
- Modify: `fe-next/components/singleplayer/PreGameTutorial.tsx`
- Modify: `fe-next/components/singleplayer/__tests__/PreGameTutorial.test.tsx`

**Do NOT touch:** `fe-next/components/singleplayer/SinglePlayerView.tsx` — `PreGameTutorial`'s external contract (`onComplete`, `sessionId` props) is unchanged, so its render site needs no edits. `fe-next/components/singleplayer/SinglePlayerGame.tsx`'s existing `<ModeCoach mode="classic" />` mount is unchanged — `modeCoachContent.ts`'s classic entry (drag + longWord demos) already teaches what the deleted practice-grid step taught; no content addition needed here (confirmed via research: classic's ModeCoach content already covers dragging to trace words).

**Interfaces:**
- Consumes: nothing new.
- Produces: `PreGameTutorial` keeps the exact same exported signature — `React.FC<{ onComplete: () => void; sessionId: string }>` — so no caller changes.

- [ ] **Step 1: Write the failing tests for the new single-screen behavior**

Replace the entire contents of `fe-next/components/singleplayer/__tests__/PreGameTutorial.test.tsx` with:

```typescript
/**
 * PreGameTutorial Tests
 *
 * Single CTA screen (avatar builder / boost / start) shown before a
 * singleplayer game begins. The "how to play" teaching that used to live
 * here now happens via ModeCoach's in-game overlay instead — this component
 * is just the pre-game gate.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => {
  const React = require('react');
  const motion = new Proxy({}, {
    get: (_target: unknown, prop: string) => {
      const MotionComponent = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
        const { children, initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props;
        return React.createElement(prop, { ...rest, ref }, children);
      });
      MotionComponent.displayName = `m.${prop}`;
      return MotionComponent;
    },
  });
  return {
    motion,
    m: motion,
    LazyMotion: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    domAnimation: {},
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

vi.mock('@/components/boosts/BoostButton', () => ({ BoostButton: () => null }));
vi.mock('@/components/boosts/BoostPicker', () => ({ BoostPicker: () => null }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
}));

vi.mock('@/components/avatar/AvatarBuilderModal', () => {
  const MockAvatarBuilderModal = ({ isOpen }: { isOpen: boolean }) => {
    return isOpen ? <div data-testid="avatar-builder-modal" /> : null;
  };
  return { default: MockAvatarBuilderModal };
});

import PreGameTutorial from '../PreGameTutorial';

describe('PreGameTutorial', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the CTA screen immediately, with no welcome or practice step', () => {
    render(<PreGameTutorial onComplete={mockOnComplete} sessionId="s1" />);

    expect(screen.getByText('preGameTutorial.tips.title')).toBeInTheDocument();
    expect(screen.getByTestId('mascot-celebration')).toBeInTheDocument();
    expect(screen.queryByText('preGameTutorial.welcome.title')).toBeNull();
    expect(screen.queryByText('preGameTutorial.practice.instruction')).toBeNull();
    expect(screen.queryByTestId('mini-grid')).toBeNull();
  });

  it('has no back/forward navigation or progress dots (single screen)', () => {
    render(<PreGameTutorial onComplete={mockOnComplete} sessionId="s1" />);

    expect(screen.queryAllByTestId(/^progress-dot-/)).toHaveLength(0);
    expect(screen.queryByText('preGameTutorial.skip')).toBeNull();
  });

  it('"Let\'s Play!" calls onComplete', () => {
    render(<PreGameTutorial onComplete={mockOnComplete} sessionId="s1" />);

    fireEvent.click(screen.getByText('preGameTutorial.letsPlay'));

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('avatar-builder CTA opens the avatar builder modal', () => {
    render(<PreGameTutorial onComplete={mockOnComplete} sessionId="s1" />);

    expect(screen.queryByTestId('avatar-builder-modal')).toBeNull();
    fireEvent.click(screen.getByText('preGameTutorial.buildAvatar'));
    expect(screen.getByTestId('avatar-builder-modal')).toBeInTheDocument();
  });

  it('all text uses translation keys (no hardcoded strings)', () => {
    render(<PreGameTutorial onComplete={mockOnComplete} sessionId="s1" />);

    expect(screen.getByText('preGameTutorial.tips.title')).toBeInTheDocument();
    expect(screen.getByText('preGameTutorial.tips.subtitle')).toBeInTheDocument();
    expect(screen.getByText('preGameTutorial.letsPlay')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npm run test -- PreGameTutorial`
Expected: FAIL — the current component renders the welcome step first (`preGameTutorial.tips.title` isn't reachable without clicking through steps 0 and 1), and `mascot-celebration`/`Let's Play`/avatar CTA aren't present on initial render.

- [ ] **Step 3: Replace `PreGameTutorial.tsx` with the trimmed single-screen version**

Replace the full contents of `fe-next/components/singleplayer/PreGameTutorial.tsx` with:

```tsx
'use client';

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { Pointer, Star, Zap, Play, Mouse, Palette } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { Mascot } from '@/components/ui/Mascot';
import { NeoPanel } from '@/components/ui/panel';
import AvatarBuilderModal from '@/components/avatar/AvatarBuilderModal';
import { useAuth } from '@/contexts/AuthContext';
import { BoostButton } from '@/components/boosts/BoostButton';

interface PreGameTutorialProps {
  onComplete: () => void;
  sessionId: string;
}

/** Shared spring configs */
const SPRING_POP = { type: 'spring' as const, stiffness: 500, damping: 22 };
const SPRING_SOFT = { type: 'spring' as const, stiffness: 300, damping: 26 };

/**
 * Pre-game CTA screen: quick tips + avatar-builder prompt + boost + start.
 * The "how to play" teaching this used to lead with now happens via
 * ModeCoach's in-game overlay (mounted in SinglePlayerGame) — this is just
 * the gate before a singleplayer round begins.
 */
const PreGameTutorial: React.FC<PreGameTutorialProps> = ({ onComplete, sessionId }) => {
  const { t } = useLanguage();
  const isDesktop = useIsDesktop();
  const [isAvatarBuilderOpen, setIsAvatarBuilderOpen] = useState(false);
  const { profile } = useAuth();

  const tips = [
    { icon: isDesktop ? Mouse : Pointer, titleKey: isDesktop ? 'onboarding.quickTips.tip1TitleDesktop' : 'onboarding.quickTips.tip1Title', textKey: isDesktop ? 'onboarding.quickTips.tip1TextDesktop' : 'onboarding.quickTips.tip1Text' },
    { icon: Star, titleKey: 'onboarding.quickTips.tip2Title', textKey: 'onboarding.quickTips.tip2Text' },
    { icon: Zap, titleKey: 'onboarding.quickTips.tip3Title', textKey: 'onboarding.quickTips.tip3Text' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-neo-navy flex flex-col items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(132,204,22,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-md mx-auto flex-1 flex flex-col items-center justify-center relative">
        <div className="flex flex-col items-center text-center space-y-4 w-full">
          <Mascot variant="celebration" size="lg" clipBorder="none" />

          <NeoPanel asChild tone="cream" className="relative p-4 max-w-sm">
            <m.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, ...SPRING_POP }}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-12 border-l-transparent border-r-12 border-r-transparent border-b-12 border-b-neo-black" />
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-10 border-l-transparent border-r-10 border-r-transparent border-b-10 border-b-neo-cream" />

              <h2 className="text-lg font-black text-neo-black">
                {t('preGameTutorial.tips.title')}
              </h2>
              <p className="text-xs text-neo-black/60 mt-0.5">
                {t('preGameTutorial.tips.subtitle')}
              </p>
            </m.div>
          </NeoPanel>

          <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
            {tips.map((tip, index) => {
              const Icon = tip.icon;
              return (
                <m.div
                  key={tip.titleKey}
                  initial={{ y: 30, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.1, ...SPRING_POP }}
                  whileHover={{ y: -2, scale: 1.03 }}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-neo border-2 border-neo-black shadow-hard-sm bg-neo-cream"
                >
                  <m.div
                    className="w-8 h-8 bg-neo-lime text-neo-black border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm"
                    initial={{ rotate: -20 }}
                    animate={{ rotate: 0 }}
                    transition={{ delay: 0.3 + index * 0.1, ...SPRING_POP }}
                  >
                    <Icon className="w-4 h-4" />
                  </m.div>
                  <div className="font-black text-[10px] text-neo-black leading-tight">
                    {t(tip.titleKey)}
                  </div>
                  <div className="text-[9px] text-neo-black/60 leading-snug">
                    {t(tip.textKey)}
                  </div>
                </m.div>
              );
            })}
          </div>

          <m.button
            onClick={() => setIsAvatarBuilderOpen(true)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, ...SPRING_SOFT }}
            whileHover={{ scale: 1.03, backgroundColor: 'rgba(139,92,246,0.2)' }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2 rounded-neo border-2 border-neo-white/20 bg-neo-white/5 hover:border-neo-purple/50 transition-colors text-neo-white hover:text-neo-white"
          >
            <Palette className="w-4 h-4" />
            <span className="text-xs font-bold">{t('preGameTutorial.buildAvatar')}</span>
          </m.button>
          <AvatarBuilderModal
            isOpen={isAvatarBuilderOpen}
            onClose={() => setIsAvatarBuilderOpen(false)}
            onSave={() => setIsAvatarBuilderOpen(false)}
            initialConfig={profile?.avatar_config ?? undefined}
            premium={null}
          />

          <div className="flex flex-col gap-2 items-center">
            <BoostButton mode="sp" sessionId={sessionId} />
            <m.button
              onClick={onComplete}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, ...SPRING_POP }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95, y: 2 }}
              className="bg-neo-lime border-3 border-neo-black rounded-neo px-8 py-3.5 font-black text-lg text-neo-black shadow-hard transition-shadow flex items-center gap-2"
            >
              <m.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Play className="w-5 h-5" fill="currentColor" />
              </m.div>
              {t('preGameTutorial.letsPlay')}
            </m.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreGameTutorial;
```

- [ ] **Step 4: Run the Step-1 tests again, confirm they pass**

Run: `npm run test -- PreGameTutorial`
Expected: PASS.

- [ ] **Step 5: Prune the now-unused translation keys**

`preGameTutorial.skip`, `preGameTutorial.welcome.title`, `preGameTutorial.welcome.subtitle`, `preGameTutorial.next`, `preGameTutorial.practice.instruction` are no longer read anywhere. Invoke the `clean-translations` skill (`Skill({skill: "clean-translations"})`) to remove unused translation keys across all 6 locale files rather than hand-editing each file — it's built exactly for this ("Finds keys defined but never used via t() calls"). Confirm afterward that it did NOT remove `preGameTutorial.tips.*`, `preGameTutorial.buildAvatar`, or `preGameTutorial.letsPlay` (still in use).

- [ ] **Step 6: Run lint, full test suite, and build**

Run: `npm run lint && npm run test && npm run build`
Expected: all green.

- [ ] **Step 7: Prepare the commit — ASK the user before running it**

```bash
git add fe-next/components/singleplayer/PreGameTutorial.tsx fe-next/components/singleplayer/__tests__/PreGameTutorial.test.tsx fe-next/translations/
git commit -m "refactor(singleplayer): trim PreGameTutorial to its CTA screen, teaching now happens via ModeCoach overlay"
```

---

### Task C: adventure — delete AdventureTutorial, mount ModeCoach

**Files:**
- Modify: `fe-next/components/adventure/AdventureGame.tsx`
- Modify: `fe-next/components/adventure/AdventureGameShell.tsx`
- Modify: `fe-next/components/adventure/AdventureTailOverlays.tsx`
- Modify: `fe-next/components/adventure/AdventureTailOverlays.test.tsx`
- Modify: `fe-next/components/adventure/__tests__/AdventureGameShell.test.tsx`
- Delete: `fe-next/components/adventure/AdventureTutorial.tsx`

**Do NOT touch:** `fe-next/components/adventure/boss/BossMechanicTutorial.tsx` — confirmed separate concern (teaches newly-unlocked boss twists mid-run, no localStorage key of its own, caller-managed visibility; not a duplicate of the base "how to play" this plan is deduplicating). `fe-next/lib/tutorial/modeCoachContent.ts`'s `adventure` entry — confirmed its existing 2 steps already conceptually cover `AdventureTutorial`'s 3 steps (movement/objectives → "Hit each goal to move on"; boss fight → "Take down bosses with big words"), no content addition needed.

**Interfaces:**
- Removes: `AdventureGame.tsx`'s `showTutorial`/`setShowTutorial` state and the `hasSeenTutorial` import; the `showTutorial`/`setShowTutorial` props on `AdventureGameShellProps`; the `showTutorial`/`onTutorialComplete` props on `AdventureTailOverlaysProps`.
- Produces: `AdventureTailOverlays.tsx` mounts `<ModeCoach mode="adventure" />` unconditionally (ModeCoach manages its own show-once visibility internally — no prop threading needed from parents).

- [ ] **Step 1: Write the failing test — AdventureTailOverlays mounts ModeCoach for adventure**

In `fe-next/components/adventure/AdventureTailOverlays.test.tsx`, replace the `vi.mock('./AdventureTutorial', ...)` block:
```typescript
vi.mock('./AdventureTutorial', () => ({
  AdventureTutorial: () => <div data-testid="tutorial" />,
}));
```
with:
```typescript
vi.mock('@/components/tutorial/ModeCoach', () => ({
  ModeCoach: ({ mode }: { mode: string }) => <div data-testid="mode-coach" data-mode={mode} />,
}));
```

Remove `showTutorial: false,` and `onTutorialComplete: vi.fn(),` from the `baseProps` object (these props are being removed from the component).

Replace the test:
```typescript
it('renders AdventureTutorial when showTutorial', () => {
  render(<AdventureTailOverlays {...baseProps} showTutorial />);
  expect(screen.getByTestId('tutorial')).toBeInTheDocument();
});
```
with:
```typescript
it('always mounts ModeCoach for adventure mode', () => {
  render(<AdventureTailOverlays {...baseProps} />);
  const coach = screen.getByTestId('mode-coach');
  expect(coach).toBeInTheDocument();
  expect(coach).toHaveAttribute('data-mode', 'adventure');
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npm run test -- AdventureTailOverlays`
Expected: FAIL — `AdventureTailOverlays` doesn't render `ModeCoach` yet, and `baseProps` no longer has `showTutorial`/`onTutorialComplete` (TS/prop-shape or missing-testid failure).

- [ ] **Step 3: Update `AdventureTailOverlays.tsx`**

Change the import:
```typescript
import { AdventureTutorial } from './AdventureTutorial';
```
to:
```typescript
import { ModeCoach } from '@/components/tutorial/ModeCoach';
```

Remove from `AdventureTailOverlaysProps`:
```typescript
  showTutorial: boolean;
  onTutorialComplete: () => void;
```

Remove from the destructured props (wherever `showTutorial,` and `onTutorialComplete,` appear in the function signature/destructure).

Change the render line:
```typescript
      {showTutorial && <AdventureTutorial onComplete={onTutorialComplete} />}
```
to:
```typescript
      <ModeCoach mode="adventure" />
```

- [ ] **Step 4: Remove `showTutorial`/`setShowTutorial` threading from `AdventureGameShell.tsx`**

Remove from its props interface:
```typescript
  showTutorial: boolean;
```
and
```typescript
  setShowTutorial: (v: boolean) => void;
```
Remove both from the destructured props.
Remove the two props passed down to `<AdventureTailOverlays ... />`:
```typescript
        showTutorial={showTutorial}
        onTutorialComplete={() => setShowTutorial(false)}
```

- [ ] **Step 5: Remove `showTutorial`/`setShowTutorial` state and its threading from `AdventureGame.tsx`**

Remove the import:
```typescript
import { hasSeenTutorial } from './AdventureTutorial';
```
(adjust to however it's actually imported — confirm the exact import line before removing; `hasSeenTutorial` is exported from `AdventureTutorial.tsx`, which this task deletes, so this import must go.)

Remove the state:
```typescript
const [showTutorial, setShowTutorial] = useState(() => !hasSeenTutorial());
```

Remove the two props passed to `<AdventureGameShell ... />`:
```typescript
        showTutorial={showTutorial}
```
and
```typescript
        setShowTutorial={setShowTutorial}
```

- [ ] **Step 6: Delete `AdventureTutorial.tsx`**

```bash
git rm fe-next/components/adventure/AdventureTutorial.tsx
```

- [ ] **Step 7: Update `AdventureGameShell.test.tsx`'s default props**

Remove the two now-invalid default prop lines:
```typescript
    showTutorial: false,
```
and
```typescript
    setShowTutorial: vi.fn(),
```

- [ ] **Step 8: Run the Step-1 test again, confirm it passes**

Run: `npm run test -- AdventureTailOverlays`
Expected: PASS.

- [ ] **Step 9: Run the full adventure test suite to confirm no regressions**

Run: `npm run test -- adventure`
Expected: all PASS (this catches any other `showTutorial`/`AdventureTutorial` reference this plan's greps might have missed).

- [ ] **Step 10: Run lint, full test suite, and build**

Run: `npm run lint && npm run test && npm run build`
Expected: all green.

- [ ] **Step 11: Prepare the commit — ASK the user before running it**

```bash
git add fe-next/components/adventure/
git commit -m "fix(adventure): complete the ModeCoach migration — delete AdventureTutorial's blocking modal, mount the overlay instead"
```

---

## Self-Review

**Spec coverage:** wordHunt (Task A), classic (Task B), adventure (Task C) — all 3 per-mode dispositions from the design spec are covered. Blast/BossMechanicTutorial/Practice/TV/onboarding/lobby/gesture-coachmark "no change" dispositions require no tasks — correctly absent from this plan. Storage cleanup is folded into Task A (deleting the two dead utility files + their storage-key export) and is NOT a broader namespace unification (per spec's explicit out-of-scope call).

**Placeholder scan:** no TBD/TODO. The one deliberately-deferred item (he/ja/ru translation text in Task A Step 14) is not a placeholder — it's a concrete instruction to invoke a specific, existing project skill with fully specified inputs (exact source string, exact sibling-caption context, exact file/insertion point), matching this project's own documented practice of routing non-English content through `fe-next:ux-writer` rather than hand-authoring it.

**Type consistency:** `PreGameTutorialProps` (`onComplete`, `sessionId`) unchanged across Task B — matches `SinglePlayerView.tsx`'s existing call site, so no cross-file signature drift. `AdventureTailOverlaysProps` loses `showTutorial`/`onTutorialComplete` in Task C Step 3, and both call sites (`AdventureGameShell.tsx` Step 4) are updated in the same task. `ModeCoachProps` (`mode`, `onShown?`, `graceMs?`) is not modified anywhere in this plan — Task C's new mount (`<ModeCoach mode="adventure" />`) uses it exactly as every other existing call site does.
