# MP → Daily Challenge Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the post-MP-game `DailyChallengeInvite` into a behaviorally-targeted, fully-instrumented Daily Challenge conversion surface.

**Architecture:** A pure, fully-tested pitch selector (`lib/growth/dailyConversionPitch.ts`) decides whether and what to pitch from a small input bag. The `DailyChallengeInvite` component gathers live state (auth, daily status, platform, MP placement), calls the selector, renders the chosen variant, and fires PostHog impression/click/dismiss events. `ResultsPage` feeds the component the placement data it already has in scope.

**Tech Stack:** Next.js 16 / React / TypeScript, Tailwind (neo-brutalist), Vitest + React Testing Library, PostHog (`posthog-js`).

**Spec:** `fe-next/docs/superpowers/specs/2026-05-24-mp-to-daily-conversion-design.md`

**Conventions:** All paths are relative to repo root. Run commands from `fe-next/`. TDD strict (RED → GREEN → REFACTOR). One commit per phase; **ask the user before each `git commit`**.

---

## File Structure

| Action | Path | Responsibility |
|---|---|---|
| Create | `fe-next/lib/growth/dailyConversionPitch.ts` | Pure pitch selector + priority ladder + constants |
| Create | `fe-next/lib/growth/__tests__/dailyConversionPitch.test.ts` | Unit tests for the selector |
| Modify | `fe-next/components/growth/DailyChallengeInvite.tsx` | Gather state, call selector, render variant, instrument |
| Create | `fe-next/components/growth/__tests__/DailyChallengeInvite.test.tsx` | Gating + event-firing + variant render tests |
| Modify | `fe-next/components/views/ResultsPage.tsx` | Pass placement props at 2 render sites (~205, ~1083) |
| Modify | `fe-next/translations/en.js` | New `dailyInvite.*` keys (authoritative) |
| Modify | `fe-next/translations/{he,sv,ja,es}.js` | Parallel keys (native review pending) |

---

# PHASE 1 — Foundation + instrumentation

Shippable measurement win: leaky-gate fix, canonical streak source, the complete pure
selector, and impression/click/dismiss events on the three context-free variants.

## Task 1: Pure pitch selector

**Files:**
- Create: `fe-next/lib/growth/dailyConversionPitch.ts`
- Test: `fe-next/lib/growth/__tests__/dailyConversionPitch.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `fe-next/lib/growth/__tests__/dailyConversionPitch.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  selectDailyConversionPitch,
  CLOSE_LOSS_POINTS,
  type DailyPitchInput,
} from '../dailyConversionPitch';

const base: DailyPitchInput = {
  hasPlayedToday: false,
  currentStreak: 0,
  missedDays: 0,
  isWinner: false,
  marginToNext: null,
  isOnCrazyGames: false,
};

describe('selectDailyConversionPitch', () => {
  it('suppresses (null) when already played today', () => {
    expect(selectDailyConversionPitch({ ...base, hasPlayedToday: true, currentStreak: 5 })).toBeNull();
  });

  it('streak_at_risk wins over a win when streak is alive', () => {
    const pitch = selectDailyConversionPitch({ ...base, currentStreak: 6, isWinner: true });
    expect(pitch?.variant).toBe('streak_at_risk');
    expect(pitch?.accent).toBe('orange');
    expect(pitch?.showCountdown).toBe(true);
  });

  it('catchup fires when streak is 0 and a recent day was missed', () => {
    const pitch = selectDailyConversionPitch({ ...base, missedDays: 1 });
    expect(pitch?.variant).toBe('catchup');
    expect(pitch?.showCountdown).toBe(true);
  });

  it('an alive streak overrides catchup', () => {
    const pitch = selectDailyConversionPitch({ ...base, currentStreak: 2, missedDays: 1 });
    expect(pitch?.variant).toBe('streak_at_risk');
  });

  it('win_momentum fires only when winner with no streak and no missed days', () => {
    const pitch = selectDailyConversionPitch({ ...base, isWinner: true });
    expect(pitch?.variant).toBe('win_momentum');
    expect(pitch?.accent).toBe('yellow');
    expect(pitch?.showCountdown).toBe(false);
  });

  it('close_loss fires for a near-miss loss within the threshold', () => {
    const pitch = selectDailyConversionPitch({ ...base, marginToNext: CLOSE_LOSS_POINTS - 1 });
    expect(pitch?.variant).toBe('close_loss');
    expect(pitch?.accent).toBe('cyan');
  });

  it('loss_redirect fires for a blowout loss beyond the threshold', () => {
    const pitch = selectDailyConversionPitch({ ...base, marginToNext: CLOSE_LOSS_POINTS + 25 });
    expect(pitch?.variant).toBe('loss_redirect');
  });

  it('unknown placement (null margin) never picks close_loss', () => {
    const pitch = selectDailyConversionPitch({ ...base, marginToNext: null });
    expect(pitch?.variant).toBe('loss_redirect');
  });

  it('returns i18n keys, never literal English', () => {
    const pitch = selectDailyConversionPitch({ ...base, isWinner: true });
    expect(pitch?.titleKey.startsWith('dailyInvite.')).toBe(true);
    expect(pitch?.bodyKey.startsWith('dailyInvite.')).toBe(true);
    expect(pitch?.ctaKey).toBe('dailyInvite.playNow');
  });

  it('on CrazyGames the body swaps to the come-back key but keeps the analytics variant', () => {
    const pitch = selectDailyConversionPitch({ ...base, isWinner: true, isOnCrazyGames: true });
    expect(pitch?.variant).toBe('win_momentum');
    expect(pitch?.bodyKey).toBe('dailyInvite.bodyCgComeBack');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:frontend -- dailyConversionPitch`
Expected: FAIL — `Cannot find module '../dailyConversionPitch'`.

- [ ] **Step 3: Write the selector**

Create `fe-next/lib/growth/dailyConversionPitch.ts`:

```ts
/**
 * Pure selector that decides whether — and how — to pitch the Daily Challenge
 * at the post-multiplayer-game results screen. No React, no I/O: fully testable.
 *
 * Priority ladder (first match wins). Higher lanes are stronger conversion levers:
 *   1. streak_at_risk  — loss aversion on an alive daily streak
 *   2. catchup         — loss aversion + concrete recovery (a recent day was missed)
 *   3. win_momentum    — ride the win
 *   4. close_loss      — redirect a near-miss competitive sting to a fresh board
 *   5. loss_redirect   — default fresh-slate pitch for any other loss
 */

export type DailyPitchVariant =
  | 'streak_at_risk'
  | 'catchup'
  | 'win_momentum'
  | 'close_loss'
  | 'loss_redirect';

export interface DailyPitchInput {
  /** Completed today's daily already → suppress entirely. */
  hasPlayedToday: boolean;
  /** Canonical daily-challenge consecutive-day streak. */
  currentStreak: number;
  /** Count of recent missed days inside the catch-up window (0 if none/unknown). */
  missedDays: number;
  /** Won the just-finished MP match (top placement). */
  isWinner: boolean;
  /** Points behind the player ranked immediately above; null if 1st/unknown. */
  marginToNext: number | null;
  /** On the CrazyGames platform — swap body copy for the come-back message. */
  isOnCrazyGames: boolean;
}

export interface DailyPitch {
  variant: DailyPitchVariant;
  accent: 'orange' | 'yellow' | 'cyan';
  /** i18n keys only — never English strings. */
  titleKey: string;
  bodyKey: string;
  ctaKey: string;
  /** Render a live reset countdown only where urgency has a payoff. */
  showCountdown: boolean;
}

/** A loss within this many points reads as a near-miss ("close_loss"). Tunable. */
export const CLOSE_LOSS_POINTS = 15;

const CTA_KEY = 'dailyInvite.playNow';

export function selectDailyConversionPitch(input: DailyPitchInput): DailyPitch | null {
  const { hasPlayedToday, currentStreak, missedDays, isWinner, marginToNext, isOnCrazyGames } = input;

  // Already played today → never pitch.
  if (hasPlayedToday) return null;

  // On CrazyGames every body collapses to the come-back message (preserves D1 behavior).
  const body = (key: string): string => (isOnCrazyGames ? 'dailyInvite.bodyCgComeBack' : key);

  // 1. Streak at risk — strongest lever.
  if (currentStreak >= 1) {
    return {
      variant: 'streak_at_risk',
      accent: 'orange',
      titleKey: 'dailyInvite.streakAtRiskTitle',
      bodyKey: body('dailyInvite.streakAtRiskBody'),
      ctaKey: CTA_KEY,
      showCountdown: true,
    };
  }

  // 2. Catch-up available (streak already 0, a recent puzzle was missed).
  if (missedDays > 0) {
    return {
      variant: 'catchup',
      accent: 'orange',
      titleKey: 'dailyInvite.catchupTitle',
      bodyKey: body('dailyInvite.catchupBody'),
      ctaKey: CTA_KEY,
      showCountdown: true,
    };
  }

  // 3. Win momentum.
  if (isWinner) {
    return {
      variant: 'win_momentum',
      accent: 'yellow',
      titleKey: 'dailyInvite.winMomentumTitle',
      bodyKey: body('dailyInvite.winMomentumBody'),
      ctaKey: CTA_KEY,
      showCountdown: false,
    };
  }

  // 4. Close loss — near miss.
  if (marginToNext !== null && marginToNext <= CLOSE_LOSS_POINTS) {
    return {
      variant: 'close_loss',
      accent: 'cyan',
      titleKey: 'dailyInvite.closeLossTitle',
      bodyKey: body('dailyInvite.closeLossBody'),
      ctaKey: CTA_KEY,
      showCountdown: false,
    };
  }

  // 5. Default loss redirect.
  return {
    variant: 'loss_redirect',
    accent: 'cyan',
    titleKey: 'dailyInvite.lossRedirectTitle',
    bodyKey: body('dailyInvite.lossRedirectBody'),
    ctaKey: CTA_KEY,
    showCountdown: false,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:frontend -- dailyConversionPitch`
Expected: PASS — all 11 cases green.

## Task 2: Add the new i18n keys

**Files:**
- Modify: `fe-next/translations/en.js` (the `dailyInvite` object, ~line 11964)
- Modify: `fe-next/translations/{he,sv,ja,es}.js` (same object)

- [ ] **Step 1: Extend the English `dailyInvite` object**

Replace the existing `dailyInvite` object in `fe-next/translations/en.js` with (keep existing keys, add the new ones):

```javascript
"dailyInvite": {
  "titleWon": "Sharp brain today",
  "titleLost": "Shake it off",
  "bodyWon": "Daily Challenge waiting — one puzzle, one shot.",
  "bodyLost": "Daily Challenge — your redemption shot.",
  "bodyCgComeBack": "New puzzle every day. Bookmark and come back tomorrow.",
  "streak": "Day {{count}} streak — keep it alive",
  "playNow": "Play Daily",
  "dismiss": "Maybe later",
  "streakAtRiskTitle": "🔥 {{count}}-day streak",
  "streakAtRiskBody": "Ends in {{countdown}} — one puzzle keeps it alive.",
  "catchupTitle": "Don't break the chain",
  "catchupBody": "You missed a puzzle — catch up before today's resets in {{countdown}}.",
  "winMomentumTitle": "You're on fire",
  "winMomentumBody": "Ride the win — start a daily streak while you're hot.",
  "closeLossTitle": "So close",
  "closeLossBody": "That was tight. The Daily's a clean slate — climb the global board.",
  "lossRedirectTitle": "Fresh start",
  "lossRedirectBody": "Tough match. On the Daily everyone starts equal — take your shot."
}
```

- [ ] **Step 2: Add parallel keys to he/sv/ja/es**

Add the same eight new keys (`streakAtRiskTitle`, `streakAtRiskBody`, `catchupTitle`,
`catchupBody`, `winMomentumTitle`, `winMomentumBody`, `closeLossTitle`, `closeLossBody`,
`lossRedirectTitle`, `lossRedirectBody`) to the `dailyInvite` object in each of
`translations/he.js`, `translations/sv.js`, `translations/ja.js`, `translations/es.js`.
Use a faithful translation of the English; preserve the `{{count}}` and `{{countdown}}`
placeholders exactly. These need native review — note it in the commit body.

- [ ] **Step 3: Type-check translations**

Run: `npx tsc --noEmit`
Expected: No new errors. (`next build` OOMs on this repo — prefer `tsc`.)

## Task 3: Rewire the component — gate fix, selector, instrumentation

**Files:**
- Modify: `fe-next/components/growth/DailyChallengeInvite.tsx`
- Create: `fe-next/components/growth/__tests__/DailyChallengeInvite.test.tsx`

- [ ] **Step 1: Write the failing component tests**

Create `fe-next/components/growth/__tests__/DailyChallengeInvite.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DailyChallengeInvite } from '../DailyChallengeInvite';

const capture = vi.fn();
const trackCta = vi.fn();

vi.mock('posthog-js', () => ({ default: { capture: (...a: unknown[]) => capture(...a) } }));
vi.mock('@/utils/posthogEngagement', () => ({
  trackCtaClicked: (...a: unknown[]) => trackCta(...a),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string, vars?: Record<string, unknown>) => (vars ? `${k}:${JSON.stringify(vars)}` : k) }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }) }));

const dailyStatus = {
  hasPlayed: false,
  currentStreak: 0,
  loading: false,
};
vi.mock('@/hooks/useDailyChallengeStatus', () => ({
  useDailyChallengeStatus: () => dailyStatus,
}));

beforeEach(() => {
  capture.mockClear();
  trackCta.mockClear();
  dailyStatus.hasPlayed = false;
  dailyStatus.currentStreak = 0;
  dailyStatus.loading = false;
  try { sessionStorage.clear(); } catch { /* noop */ }
});

describe('DailyChallengeInvite', () => {
  it('renders nothing when the player already played today', () => {
    dailyStatus.hasPlayed = true;
    const { container } = render(<DailyChallengeInvite isWinner={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('fires a single impression event with the selected variant on mount', () => {
    dailyStatus.currentStreak = 4;
    render(<DailyChallengeInvite isWinner={false} />);
    const shown = capture.mock.calls.filter((c) => c[0] === 'growth:daily_conversion_shown');
    expect(shown).toHaveLength(1);
    expect(shown[0][1]).toMatchObject({ variant: 'streak_at_risk', surface: 'mp_results', streak: 4 });
  });

  it('CTA click fires trackCtaClicked with the variant and an attributed href', () => {
    render(<DailyChallengeInvite isWinner={true} />);
    const cta = screen.getByTestId('daily-challenge-invite-cta');
    expect(cta.getAttribute('href')).toContain('from=mp_results');
    fireEvent.click(cta);
    expect(trackCta).toHaveBeenCalledWith(
      expect.objectContaining({ ctaId: 'mp_to_daily', location: 'mp_results', metadata: expect.objectContaining({ variant: 'win_momentum' }) }),
    );
  });

  it('dismiss fires a dismissed event and hides the card', () => {
    const { container } = render(<DailyChallengeInvite isWinner={false} />);
    fireEvent.click(screen.getByTestId('daily-challenge-invite-dismiss'));
    expect(capture.mock.calls.some((c) => c[0] === 'growth:daily_conversion_dismissed')).toBe(true);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:frontend -- DailyChallengeInvite`
Expected: FAIL — current component imports `useWordOfTheDay`/`useEngagementStatus`, has no events, and no `from=mp_results` href.

- [ ] **Step 3: Rewrite the component**

Replace the entire contents of `fe-next/components/growth/DailyChallengeInvite.tsx`:

```tsx
'use client';

/**
 * DailyChallengeInvite — post-MP-game conversion surface.
 *
 * Behaviorally targeted: a pure selector (lib/growth/dailyConversionPitch) ranks
 * the strongest pitch from the player's live state (alive streak, win/loss, near-miss).
 * Fully instrumented: impression / click / dismiss events feed PostHog so conversion
 * is measurable per variant.
 *
 * Gating: hidden if unauthenticated, daily status still loading, already played today
 * (canonical useDailyChallengeStatus.hasPlayed — NOT WOTD `playerFound`), dismissed,
 * or the selector returns null.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import posthog from 'posthog-js';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyChallengeStatus } from '@/hooks/useDailyChallengeStatus';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { trackCtaClicked } from '@/utils/posthogEngagement';
import {
  selectDailyConversionPitch,
  type DailyPitchVariant,
} from '@/lib/growth/dailyConversionPitch';

const DISMISS_KEY = 'dailyChallengeInvite:dismissed';

const ACCENT = {
  orange: { border: 'border-neo-orange/40', bg: 'bg-neo-orange/15', ring: 'border-neo-orange/30', text: 'text-neo-orange', btn: 'bg-neo-orange text-neo-navy' },
  yellow: { border: 'border-neo-yellow/40', bg: 'bg-neo-yellow/15', ring: 'border-neo-yellow/30', text: 'text-neo-yellow', btn: 'bg-neo-yellow text-neo-navy' },
  cyan: { border: 'border-neo-cyan/40', bg: 'bg-neo-cyan/15', ring: 'border-neo-cyan/30', text: 'text-neo-cyan', btn: 'bg-neo-cyan text-neo-navy' },
} as const;

interface Props {
  isWinner: boolean;
  className?: string;
}

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function DailyChallengeInvite({ isWinner, className }: Props) {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { hasPlayed, currentStreak, loading } = useDailyChallengeStatus(language);
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const [dismissed, setDismissed] = useState<boolean>(readDismissed);
  const shownRef = useRef(false);

  const pitch = !isAuthenticated || loading
    ? null
    : selectDailyConversionPitch({
        hasPlayedToday: hasPlayed,
        currentStreak: currentStreak ?? 0,
        missedDays: 0, // Phase 3 supplies real missed-day count.
        isWinner,
        marginToNext: null, // Phase 2 supplies real placement margin.
        isOnCrazyGames: isOnCrazyGamesPlatform,
      });

  const variant: DailyPitchVariant | undefined = pitch?.variant;

  // Impression — once per mount, after status settles.
  useEffect(() => {
    if (!pitch || dismissed || shownRef.current) return;
    shownRef.current = true;
    posthog.capture('growth:daily_conversion_shown', {
      variant: pitch.variant,
      surface: 'mp_results',
      streak: currentStreak ?? 0,
    });
  }, [pitch, dismissed, currentStreak]);

  const handleDismiss = useCallback(() => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* noop */ }
    setDismissed(true);
    posthog.capture('growth:daily_conversion_dismissed', { variant, surface: 'mp_results' });
  }, [variant]);

  const handleCtaClick = useCallback(() => {
    trackCtaClicked({
      ctaId: 'mp_to_daily',
      location: 'mp_results',
      metadata: { variant, streak: currentStreak ?? 0 },
    });
  }, [variant, currentStreak]);

  if (!pitch || dismissed) return null;

  const accent = ACCENT[pitch.accent];
  const title = t(pitch.titleKey, { count: currentStreak ?? 0 });
  const body = t(pitch.bodyKey, { count: currentStreak ?? 0 });

  return (
    <div
      data-testid="daily-challenge-invite"
      data-variant={pitch.variant}
      className={cn(
        'relative flex items-stretch gap-3 w-full',
        'rounded-neo border-neo bg-neo-navy/80 p-4',
        'shadow-hard-sm hover:shadow-hard transition-shadow',
        accent.border,
        className,
      )}
    >
      <button
        type="button"
        data-testid="daily-challenge-invite-dismiss"
        onClick={handleDismiss}
        aria-label={t('dailyInvite.dismiss')}
        className="absolute top-1 end-1 p-1 rounded-md text-white/40 hover:text-white/80 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className={cn('shrink-0 w-10 h-10 rounded-neo border-neo flex items-center justify-center', accent.bg, accent.ring)}>
        <Sparkles className={cn('w-5 h-5', accent.text)} />
      </div>

      <div className="flex-1 min-w-0 pe-4">
        <p className={cn('text-xs font-neo-display font-bold uppercase tracking-wider mb-0.5', accent.text)}>
          {title}
        </p>
        <p className="text-sm font-neo-body text-neo-white/90 leading-snug">
          {body}
        </p>
      </div>

      <Link
        href="/daily?from=mp_results"
        onClick={handleCtaClick}
        data-testid="daily-challenge-invite-cta"
        className={cn(
          'self-center shrink-0 px-3 py-2 rounded-neo border-neo border-black',
          'text-xs font-neo-display font-bold uppercase tracking-wider',
          'shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed transition-shadow',
          accent.btn,
        )}
      >
        {t(pitch.ctaKey)}
      </Link>
    </div>
  );
}

export default DailyChallengeInvite;
```

- [ ] **Step 4: Run the component tests to verify they pass**

Run: `npm run test:frontend -- DailyChallengeInvite`
Expected: PASS — all 4 cases green.

- [ ] **Step 5: Lint + type-check + full targeted test run**

Run: `npm run lint && npx tsc --noEmit && npm run test:frontend -- dailyConversionPitch DailyChallengeInvite`
Expected: lint clean, no type errors, all tests pass.

- [ ] **Step 6: Commit (ASK THE USER FIRST)**

```bash
git add fe-next/lib/growth/dailyConversionPitch.ts \
        fe-next/lib/growth/__tests__/dailyConversionPitch.test.ts \
        fe-next/components/growth/DailyChallengeInvite.tsx \
        fe-next/components/growth/__tests__/DailyChallengeInvite.test.tsx \
        fe-next/translations/en.js fe-next/translations/he.js \
        fe-next/translations/sv.js fe-next/translations/ja.js fe-next/translations/es.js \
        fe-next/docs/superpowers/specs/2026-05-24-mp-to-daily-conversion-design.md \
        fe-next/docs/superpowers/plans/2026-05-24-mp-to-daily-conversion.md
git commit -m "feat(growth): behaviorally-targeted, instrumented MP→Daily invite

Pure dailyConversionPitch selector (streak-at-risk > win-momentum > loss-redirect),
fixes leaky WOTD gate (now useDailyChallengeStatus.hasPlayed), adds PostHog
impression/click/dismiss events with variant tagging + ?from=mp_results attribution.
he/sv/ja/es strings need native review."
```

---

# PHASE 2 — Urgency countdown + placement nuance

## Task 4: Live reset countdown for urgency variants

**Files:**
- Modify: `fe-next/components/growth/DailyChallengeInvite.tsx`
- Modify: `fe-next/components/growth/__tests__/DailyChallengeInvite.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `DailyChallengeInvite.test.tsx` inside the `describe` block:

```tsx
it('shows a countdown for the streak_at_risk variant', () => {
  dailyStatus.currentStreak = 3;
  render(<DailyChallengeInvite isWinner={false} />);
  // body is interpolated with a {{countdown}} HH:MM:SS value → contains a digit:two-digit pattern
  const body = screen.getByTestId('daily-challenge-invite-body').textContent ?? '';
  expect(body).toMatch(/\d+:\d{2}/);
});

it('does not show a countdown for the win_momentum variant', () => {
  render(<DailyChallengeInvite isWinner={true} />);
  const body = screen.getByTestId('daily-challenge-invite-body').textContent ?? '';
  expect(body).not.toMatch(/\d+:\d{2}/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:frontend -- DailyChallengeInvite`
Expected: FAIL — no countdown wired; body `<p>` lacks `data-testid`.

- [ ] **Step 3: Add the countdown**

In `DailyChallengeInvite.tsx`, add the import:

```tsx
import { getSecondsUntilNextDaily, formatCountdown } from '@/utils/dailyChallenge/dateUtils';
```

Add countdown state + ticker (place after the `shownRef` line):

```tsx
  const [secondsLeft, setSecondsLeft] = useState<number>(() => getSecondsUntilNextDaily());

  useEffect(() => {
    if (!pitch?.showCountdown) return;
    const id = setInterval(() => setSecondsLeft(getSecondsUntilNextDaily()), 1000);
    return () => clearInterval(id);
  }, [pitch?.showCountdown]);
```

Update the `body` interpolation to include the countdown, and tag the body `<p>`:

```tsx
  const countdown = pitch.showCountdown ? formatCountdown(secondsLeft) : '';
  const body = t(pitch.bodyKey, { count: currentStreak ?? 0, countdown });
```

```tsx
        <p data-testid="daily-challenge-invite-body" className="text-sm font-neo-body text-neo-white/90 leading-snug">
          {body}
        </p>
```

> Note: `pitch` is non-null past the `if (!pitch || dismissed) return null;` guard, so
> `pitch.showCountdown` is safe in the `countdown`/`body` lines. The effect uses optional
> chaining because it runs before that guard.

- [ ] **Step 4: Run to verify pass**

Run: `npm run test:frontend -- DailyChallengeInvite`
Expected: PASS.

## Task 5: Wire MP placement → close_loss

**Files:**
- Modify: `fe-next/components/growth/DailyChallengeInvite.tsx` (accept props, feed selector)
- Modify: `fe-next/components/views/ResultsPage.tsx` (compute + pass at 2 sites)
- Modify: `fe-next/components/growth/__tests__/DailyChallengeInvite.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `DailyChallengeInvite.test.tsx`:

```tsx
it('renders close_loss for a near-miss loss (small margin)', () => {
  render(<DailyChallengeInvite isWinner={false} marginToNext={8} />);
  expect(screen.getByTestId('daily-challenge-invite').getAttribute('data-variant')).toBe('close_loss');
});

it('renders loss_redirect for a blowout loss (large margin)', () => {
  render(<DailyChallengeInvite isWinner={false} marginToNext={120} />);
  expect(screen.getByTestId('daily-challenge-invite').getAttribute('data-variant')).toBe('loss_redirect');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:frontend -- DailyChallengeInvite`
Expected: FAIL — `marginToNext` is not a prop yet.

- [ ] **Step 3: Add placement props to the component**

In `DailyChallengeInvite.tsx`, extend `Props` and the selector call:

```tsx
interface Props {
  isWinner: boolean;
  className?: string;
  placement?: number | null;
  totalPlayers?: number;
  marginToNext?: number | null;
}
```

```tsx
export function DailyChallengeInvite({ isWinner, className, placement = null, totalPlayers, marginToNext = null }: Props) {
```

Feed `marginToNext` into the selector call (replace the placeholder line):

```tsx
        marginToNext,
```

Enrich the impression event with placement context:

```tsx
    posthog.capture('growth:daily_conversion_shown', {
      variant: pitch.variant,
      surface: 'mp_results',
      streak: currentStreak ?? 0,
      placement: placement ?? null,
      total_players: totalPlayers ?? null,
    });
```

(Add `placement`, `totalPlayers` to that effect's dependency array.)

- [ ] **Step 4: Wire ResultsPage**

In `fe-next/components/views/ResultsPage.tsx`, compute the margin once near where
`sortedScores`/`currentPlayerRank`/`currentPlayerData` are destructured (~line 381-385):

```tsx
  const marginToNext =
    currentPlayerRank > 1 && currentPlayerData
      ? sortedScores[currentPlayerRank - 2].score - currentPlayerData.score
      : null;
```

Update BOTH `<DailyChallengeInvite ... />` render sites (desktop ~205, mobile ~1083):

```tsx
            <DailyChallengeInvite
              isWinner={isCurrentUserWinner}
              placement={currentPlayerRank}
              totalPlayers={sortedScores.length}
              marginToNext={marginToNext}
            />
```

> Verify against `useResultsData`: with 1-based `currentPlayerRank`, the player ranked
> immediately above sits at `sortedScores[currentPlayerRank - 2]`. If `useResultsData`
> sorts ascending instead of descending, flip the index and adjust the test margins.
> Confirm `PlayerScore` exposes `.score` (it does per the results hook).

- [ ] **Step 5: Run tests + lint + types**

Run: `npm run lint && npx tsc --noEmit && npm run test:frontend -- DailyChallengeInvite`
Expected: lint clean, no type errors, all cases pass.

- [ ] **Step 6: Commit (ASK THE USER FIRST)**

```bash
git add fe-next/components/growth/DailyChallengeInvite.tsx \
        fe-next/components/growth/__tests__/DailyChallengeInvite.test.tsx \
        fe-next/components/views/ResultsPage.tsx
git commit -m "feat(growth): reset-countdown urgency + placement-aware close_loss pitch

streak_at_risk/catchup now show a live HH:MM:SS countdown to the next puzzle; near-miss
losses (within CLOSE_LOSS_POINTS of the player above) get a tailored close_loss pitch.
ResultsPage feeds placement/margin to the invite."
```

---

# PHASE 3 — Catch-up lane

## Task 6: Lazy-fetch missed days → catchup variant

**Files:**
- Modify: `fe-next/components/growth/DailyChallengeInvite.tsx`
- Modify: `fe-next/components/growth/__tests__/DailyChallengeInvite.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a fetch mock + tests to `DailyChallengeInvite.test.tsx`. At the top of the file, after
the other mocks:

```tsx
const fetchMock = vi.fn();
vi.stubGlobal('fetch', (...a: unknown[]) => fetchMock(...a));
```

Reset it in `beforeEach`: `fetchMock.mockReset();`

Add tests:

```tsx
it('fetches missed days and renders catchup when streak is 0 and a day was missed', async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ today: '2026-05-24', missed: [{ date: '2026-05-23', puzzleNumber: 100 }] }),
  });
  render(<DailyChallengeInvite isWinner={false} />);
  const card = await screen.findByTestId('daily-challenge-invite');
  expect(card.getAttribute('data-variant')).toBe('catchup');
  const cta = screen.getByTestId('daily-challenge-invite-cta');
  expect(cta.getAttribute('href')).toContain('date=2026-05-23');
  expect(cta.getAttribute('href')).toContain('from=mp_results');
});

it('does not fetch missed days when a streak is alive', () => {
  dailyStatus.currentStreak = 5;
  render(<DailyChallengeInvite isWinner={false} />);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('falls back gracefully when the missed-days fetch fails', async () => {
  fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
  render(<DailyChallengeInvite isWinner={false} marginToNext={120} />);
  const card = await screen.findByTestId('daily-challenge-invite');
  expect(card.getAttribute('data-variant')).toBe('loss_redirect');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:frontend -- DailyChallengeInvite`
Expected: FAIL — component never calls `fetch`; no catchup wiring.

- [ ] **Step 3: Add the lazy fetch + dated deep-link**

In `DailyChallengeInvite.tsx`, add missed-day state (after the countdown state):

```tsx
  const [missed, setMissed] = useState<{ count: number; date: string | null }>({ count: 0, date: null });

  // Only the catchup branch needs this, and only when there's no alive streak.
  const shouldCheckMissed = isAuthenticated && !loading && !hasPlayed && (currentStreak ?? 0) === 0;

  useEffect(() => {
    if (!shouldCheckMissed) return;
    let cancelled = false;
    fetch('/api/daily/missed')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.missed?.length) return;
        setMissed({ count: data.missed.length, date: data.missed[0].date ?? null });
      })
      .catch(() => { /* graceful: catchup simply won't fire */ });
    return () => { cancelled = true; };
  }, [shouldCheckMissed]);
```

Feed `missedDays` into the selector (replace the `missedDays: 0` placeholder):

```tsx
        missedDays: missed.count,
```

Make the CTA href catchup-aware (replace the literal `href="/daily?from=mp_results"`):

```tsx
  const ctaHref =
    pitch.variant === 'catchup' && missed.date
      ? `/daily?from=mp_results&date=${missed.date}`
      : '/daily?from=mp_results';
```

```tsx
      <Link
        href={ctaHref}
        ...
```

> Impression timing: the selector may briefly resolve to `loss_redirect`/`win_momentum`
> before the fetch upgrades it to `catchup`. The `shownRef` guard fires once on the first
> non-null pitch. Acceptable: the upgrade window is sub-second and only affects streak-0
> players. Do not add re-fire logic — one impression per mount is the contract.

- [ ] **Step 4: Run to verify pass**

Run: `npm run test:frontend -- DailyChallengeInvite`
Expected: PASS — all cases (including the three new ones) green.

- [ ] **Step 5: Lint + types + both suites**

Run: `npm run lint && npx tsc --noEmit && npm run test:frontend -- dailyConversionPitch DailyChallengeInvite`
Expected: clean.

- [ ] **Step 6: Commit (ASK THE USER FIRST)**

```bash
git add fe-next/components/growth/DailyChallengeInvite.tsx \
        fe-next/components/growth/__tests__/DailyChallengeInvite.test.tsx
git commit -m "feat(growth): catch-up conversion lane for missed-day recovery

Streak-0, not-played players lazily check /api/daily/missed; when a recent puzzle was
missed, the invite pitches a dated catch-up deep-link (loss aversion + concrete recovery).
Graceful no-op on fetch failure."
```

---

## Final verification (after all phases)

- [ ] Run the full frontend suite: `npm run test:frontend`
- [ ] Confirm no regressions in ResultsPage tests.
- [ ] Manually sanity-check copy in Hebrew (`?locale=he`) for RTL — the card already uses
      logical `end-1`/`pe-4` so it should flip cleanly.
- [ ] Verify PostHog receives `growth:daily_conversion_shown` with a `variant` breakdown.

## Notes for the implementer

- **TDD strict:** every step's test must fail before you write the implementation.
- **`next build` OOMs** on this repo — verify types with `npx tsc --noEmit`, not a full build.
- **Frontend test runner is Vitest** (`vi.mock`, `vi.stubGlobal`). Mock factories must
  export every symbol the component imports, or the import throws.
- **i18n native review:** he/sv/ja/es strings are machine-faithful placeholders — flag in
  each commit body; a native pass is a separate follow-up.
- **Do not** touch `RoomChat`/`MessageComposer` or other results widgets — out of scope.
```
