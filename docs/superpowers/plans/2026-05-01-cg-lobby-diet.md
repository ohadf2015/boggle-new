# CrazyGames Lobby Diet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the noisy multiplayer lobby first-paint for CrazyGames players with a single neo-brutalist hero card (mascot + "Welcome back" speech bubble + Quick Play CTA), collapsing the existing room list / season banner / admin button behind a "Browse rooms" disclosure. Pure FE diet — no backend, no Supabase identity, no streak counters.

**Architecture:** New `CgLobbyHero` component rendered from `MultiplayerFlow` only when `isOnCrazyGamesPlatform === true` and the first-session auto-join is no longer pending. Variant (first-timer / returning-named / returning-anon) derived once on mount via `useCgLobbyHeroVariant` hook from CG SDK's `getUser()` + a localStorage `lexiclash_cg_seen` flag. When hero is present, existing lobby chrome is hidden until the user taps "Browse rooms".

**Tech Stack:** Next.js 16 + React + TypeScript + Tailwind (neo-brutalist tokens) + Framer Motion + Vitest + @testing-library/react. Translations across 5 locales (en/he/sv/ja/es) — Hebrew is RTL.

**Spec:** `docs/superpowers/specs/2026-05-01-cg-lobby-diet-design.md` (commit `bf79a7caa`)

**Project rules in force:**
- TDD-strict (`.claude/rules/22-tdd-strict.md`) — RED-GREEN-REFACTOR; never write impl before test; if you do, delete and start over.
- Phase commits (`.claude/rules/10-git.md`) — ONE commit at end of implementation phase covering all TDD cycles. **ASK user before committing.**
- All UI text via `t('key')` — never `.replace('{{var}}', val)` (project memory: i18n strips `{{}}` → `{}` at load).
- 500-line file cap.
- Master branch direct (no feature branches).

---

## File Structure

**Create (5 files):**
- `fe-next/hooks/useCgLobbyHeroVariant.ts` — variant derivation (~40 lines)
- `fe-next/hooks/__tests__/useCgLobbyHeroVariant.test.ts` — hook tests (~120 lines)
- `fe-next/components/multiplayer/CgLobbyHero.tsx` — hero component (~250 lines, target ≤300; if pushed near cap, split SVGs out)
- `fe-next/components/multiplayer/__tests__/CgLobbyHero.test.tsx` — component tests (~250 lines)
- `fe-next/components/multiplayer/__tests__/MultiplayerFlow.cgLobbyDiet.test.tsx` — integration tests (~200 lines, copies fixture pattern from existing `cgArrival.test.tsx`)

**Modify (8 files):**
- `fe-next/utils/growthTracking.ts` — add 3 events to `GrowthEvent` union
- `fe-next/components/multiplayer/MultiplayerFlow.tsx` — render hero + collapsed/expanded chrome
- `fe-next/translations/en.js` — `cg.hero.*` keys
- `fe-next/translations/he.js` — Hebrew (commit body must flag "needs native review")
- `fe-next/translations/sv.js` — Swedish
- `fe-next/translations/ja.js` — Japanese
- `fe-next/translations/es.js` — Spanish
- `fe-next/components/CrazyGamesSDK.tsx` — verify `getUser()` exposed on hook return; add if missing (read-first)

---

## Phase 1: Plan commit (DONE)

Spec already committed at `bf79a7caa`. No action.

---

## Phase 2: Implementation (TDD cycles → ONE commit at end)

### Task 1: Add GrowthEvent types + verify CG SDK hook exposes `getUser`

**Files:**
- Modify: `fe-next/utils/growthTracking.ts:100-102` (add 3 union members)
- Read-first then maybe modify: `fe-next/components/CrazyGamesSDK.tsx`

- [ ] **Step 1: Add new events to `GrowthEvent` union**

In `fe-next/utils/growthTracking.ts`, find the existing CG event lines (around line 100-102):

```ts
  | 'cg_welcome_view'
  | 'cg_welcome_play'
  | 'cg_lobby_arrival'
```

Append three new lines immediately after `'cg_lobby_arrival'`:

```ts
  | 'cg_welcome_view'
  | 'cg_welcome_play'
  | 'cg_lobby_arrival'
  | 'cg_lobby_hero_view'
  | 'cg_lobby_hero_play'
  | 'cg_lobby_hero_browse'
```

- [ ] **Step 2: Verify CG SDK hook exposes `getUser` or username**

Read `fe-next/components/CrazyGamesSDK.tsx` and confirm the `useCrazyGames()` return value includes a way to access the current CG user (`user`, `cgUser`, or a `getUser()` async accessor). The hook must surface `{ username: string | null, profilePictureUrl?: string | null }` synchronously *after SDK ready*. If it currently only exposes `getSystemInfo` (per the existing `CrazyGamesWelcome.tsx:34` usage), add a `cgUser` field to the context value, populated when the SDK init completes via `cgSdk.user.getUser()`.

If the hook already exposes `cgUser` (or equivalent) — record the exact field name and skip ahead.

If it does NOT — add it minimally:

```ts
type CgUserSnapshot = { username: string | null } | null;

// inside CrazyGamesProvider state:
const [cgUser, setCgUser] = useState<CgUserSnapshot>(null);

// inside SDK init effect, after handshake resolves:
try {
  const u = await cgSdk.user.getUser();
  setCgUser(u ? { username: u.username ?? null } : null);
} catch {
  setCgUser(null);
}

// in the provider value:
const value = useMemo(
  () => ({ ...existing, cgUser }),
  [/* existing deps */, cgUser],
);
```

- [ ] **Step 3: Lint + type-check**

Run: `cd fe-next && npm run lint`

Expected: zero new lint errors. Type-check piggybacks on lint (next-lint with `--strict`).

No commit yet — Task 1 is type-system + provider plumbing only. Continue to Task 2.

---

### Task 2: `useCgLobbyHeroVariant` hook (TDD)

**Files:**
- Create: `fe-next/hooks/__tests__/useCgLobbyHeroVariant.test.ts`
- Create: `fe-next/hooks/useCgLobbyHeroVariant.ts`

- [ ] **Step 1: Write the failing tests (RED)**

Create `fe-next/hooks/__tests__/useCgLobbyHeroVariant.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCgLobbyHeroVariant } from '../useCgLobbyHeroVariant';

const SEEN_KEY = 'lexiclash_cg_seen';

describe('useCgLobbyHeroVariant', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns first-timer when cgUser=null and seen-flag absent', () => {
    const { result } = renderHook(() => useCgLobbyHeroVariant(null));
    expect(result.current.variant).toBe('first-timer');
    expect(result.current.displayName).toBe(null);
  });

  it('returns returning-named when cgUser has username', () => {
    const { result } = renderHook(() =>
      useCgLobbyHeroVariant({ username: 'OhadF' }),
    );
    expect(result.current.variant).toBe('returning-named');
    expect(result.current.displayName).toBe('OhadF');
  });

  it('returns returning-anon when cgUser=null but seen-flag is set', () => {
    localStorage.setItem(SEEN_KEY, '1');
    const { result } = renderHook(() => useCgLobbyHeroVariant(null));
    expect(result.current.variant).toBe('returning-anon');
    expect(result.current.displayName).toBe(null);
  });

  it('falls back to first-timer when localStorage access throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useCgLobbyHeroVariant(null));
    expect(result.current.variant).toBe('first-timer');
    spy.mockRestore();
  });

  it('exposes a markSeen() that writes the flag without throwing on storage failure', () => {
    const { result } = renderHook(() => useCgLobbyHeroVariant(null));
    expect(() => result.current.markSeen()).not.toThrow();
    expect(localStorage.getItem(SEEN_KEY)).toBe('1');
  });

  it('markSeen swallows storage errors', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useCgLobbyHeroVariant(null));
    expect(() => result.current.markSeen()).not.toThrow();
    spy.mockRestore();
  });

  it('does not re-evaluate variant on rerender (variant is computed once on mount)', () => {
    const { result, rerender } = renderHook(
      ({ user }: { user: { username: string } | null }) => useCgLobbyHeroVariant(user),
      { initialProps: { user: null } },
    );
    expect(result.current.variant).toBe('first-timer');
    rerender({ user: { username: 'LateBinding' } });
    // Variant is sticky — locked at mount.
    expect(result.current.variant).toBe('first-timer');
  });
});
```

- [ ] **Step 2: Run tests and confirm they FAIL**

Run: `cd fe-next && npm run test -- useCgLobbyHeroVariant`

Expected: ALL 7 tests fail with "Cannot find module '../useCgLobbyHeroVariant'".

- [ ] **Step 3: Implement the hook (GREEN)**

Create `fe-next/hooks/useCgLobbyHeroVariant.ts`:

```ts
import { useRef } from 'react';

const SEEN_KEY = 'lexiclash_cg_seen';

export type CgLobbyHeroVariant = 'first-timer' | 'returning-named' | 'returning-anon';

export interface CgLobbyHeroVariantResult {
  variant: CgLobbyHeroVariant;
  displayName: string | null;
  markSeen: () => void;
}

interface CgUserLike {
  username: string | null;
}

/**
 * Computes the CrazyGames lobby hero variant ONCE on mount. The variant is
 * intentionally sticky for the lifetime of the hero — mid-session SDK
 * resolutions or storage writes do not re-trigger a variant change, which
 * would cause the greeting copy to flash mid-render.
 */
export function useCgLobbyHeroVariant(
  cgUser: CgUserLike | null,
): CgLobbyHeroVariantResult {
  const computed = useRef<CgLobbyHeroVariantResult | null>(null);

  if (computed.current === null) {
    let seen = false;
    try {
      seen = typeof window !== 'undefined' && window.localStorage.getItem(SEEN_KEY) === '1';
    } catch {
      seen = false;
    }

    let variant: CgLobbyHeroVariant;
    let displayName: string | null = null;

    if (cgUser?.username) {
      variant = 'returning-named';
      displayName = cgUser.username;
    } else if (seen) {
      variant = 'returning-anon';
    } else {
      variant = 'first-timer';
    }

    const markSeen = () => {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(SEEN_KEY, '1');
        }
      } catch {
        /* storage blocked — degrade silently */
      }
    };

    computed.current = { variant, displayName, markSeen };
  }

  return computed.current;
}
```

- [ ] **Step 4: Run tests and confirm they PASS**

Run: `cd fe-next && npm run test -- useCgLobbyHeroVariant`

Expected: 7/7 PASS.

---

### Task 3: Add `cg.hero.*` translation keys (5 locales)

**Files:**
- Modify: `fe-next/translations/en.js`
- Modify: `fe-next/translations/he.js`
- Modify: `fe-next/translations/sv.js`
- Modify: `fe-next/translations/ja.js`
- Modify: `fe-next/translations/es.js`

- [ ] **Step 1: Locate the `cg` namespace**

Search each translation file for an existing `cg:` or `crazygames:` key block. The existing CG welcome strings live under `onboarding.crazygames.*`. The new namespace is independent: top-level `cg.hero.*`.

If no `cg` top-level key exists, add it. If a `cg` key already exists, add a nested `hero` block.

- [ ] **Step 2: Add the keys to `en.js`**

In `fe-next/translations/en.js`, add a top-level `cg` block (or extend if present):

```js
"cg": {
  "hero": {
    "firstGreeting": "WELCOME TO LEXICLASH!",
    "firstSub": "Find words. Beat the clock.",
    "welcomeBack": "WELCOME BACK, {name}!",
    "welcomeBackAnon": "WELCOME BACK!",
    "returnSub": "Quick word battle?",
    "playCta": "PLAY NOW",
    "playMicrocopy": "GO!",
    "browseRooms": "Or browse rooms ↓",
    "aria": {
      "section": "CrazyGames welcome"
    }
  }
}
```

- [ ] **Step 3: Add the keys to `he.js` (RTL — flag for native review)**

```js
"cg": {
  "hero": {
    "firstGreeting": "ברוכים הבאים ל־LEXICLASH!",
    "firstSub": "מצא מילים. נצח את השעון.",
    "welcomeBack": "ברוך שובך, {name}!",
    "welcomeBackAnon": "ברוך שובך!",
    "returnSub": "סיבוב מילים מהיר?",
    "playCta": "שחק עכשיו",
    "playMicrocopy": "קדימה!",
    "browseRooms": "או דפדף בחדרים ↓",
    "aria": {
      "section": "ברוכים הבאים ל־CrazyGames"
    }
  }
}
```

Note: commit body must include "Hebrew strings need native review" per project memory rule.

- [ ] **Step 4: Add the keys to `sv.js`**

```js
"cg": {
  "hero": {
    "firstGreeting": "VÄLKOMMEN TILL LEXICLASH!",
    "firstSub": "Hitta ord. Slå klockan.",
    "welcomeBack": "VÄLKOMMEN TILLBAKA, {name}!",
    "welcomeBackAnon": "VÄLKOMMEN TILLBAKA!",
    "returnSub": "Snabb ordmatch?",
    "playCta": "SPELA NU",
    "playMicrocopy": "KÖR!",
    "browseRooms": "Eller bläddra i rum ↓",
    "aria": {
      "section": "CrazyGames-välkomst"
    }
  }
}
```

- [ ] **Step 5: Add the keys to `ja.js`**

```js
"cg": {
  "hero": {
    "firstGreeting": "LEXICLASHへようこそ！",
    "firstSub": "単語を見つけて、時間との勝負。",
    "welcomeBack": "おかえり、{name}さん！",
    "welcomeBackAnon": "おかえりなさい！",
    "returnSub": "1ラウンドどうぞ？",
    "playCta": "プレイ",
    "playMicrocopy": "GO!",
    "browseRooms": "ルームを見る ↓",
    "aria": {
      "section": "CrazyGamesウェルカム"
    }
  }
}
```

- [ ] **Step 6: Add the keys to `es.js`**

```js
"cg": {
  "hero": {
    "firstGreeting": "¡BIENVENIDO A LEXICLASH!",
    "firstSub": "Encuentra palabras. Vence al reloj.",
    "welcomeBack": "¡BIENVENIDO DE VUELTA, {name}!",
    "welcomeBackAnon": "¡BIENVENIDO DE VUELTA!",
    "returnSub": "¿Una rápida?",
    "playCta": "JUGAR YA",
    "playMicrocopy": "¡VAMOS!",
    "browseRooms": "O explora salas ↓",
    "aria": {
      "section": "Bienvenida de CrazyGames"
    }
  }
}
```

- [ ] **Step 7: Verify lint passes after translation edits**

Run: `cd fe-next && npm run lint`

Expected: clean. Translation files use plain JS object literal — likely no lint issues, but a stray comma or quote can break the build.

---

### Task 4: `CgLobbyHero` component (TDD)

**Files:**
- Create: `fe-next/components/multiplayer/__tests__/CgLobbyHero.test.tsx`
- Create: `fe-next/components/multiplayer/CgLobbyHero.tsx`

- [ ] **Step 1: Write the failing tests (RED)**

Create `fe-next/components/multiplayer/__tests__/CgLobbyHero.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

const trackGrowthEventMock = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEventMock(...args),
}));

const tMock = vi.fn((key: string, params?: Record<string, unknown>) => {
  if (params && key === 'cg.hero.welcomeBack') return `WELCOME BACK, ${params.name}!`;
  return key;
});
let mockDir: 'ltr' | 'rtl' = 'ltr';
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: tMock, dir: mockDir, language: 'en' }),
}));

import CgLobbyHero from '../CgLobbyHero';

describe('CgLobbyHero', () => {
  beforeEach(() => {
    trackGrowthEventMock.mockClear();
    tMock.mockClear();
    mockDir = 'ltr';
  });
  afterEach(() => {
    cleanup();
  });

  it('renders first-timer copy', () => {
    render(
      <CgLobbyHero
        variant="first-timer"
        displayName={null}
        onPlay={vi.fn()}
        onBrowse={vi.fn()}
      />,
    );
    expect(screen.getByText('cg.hero.firstGreeting')).toBeTruthy();
    expect(screen.getByText('cg.hero.firstSub')).toBeTruthy();
  });

  it('renders returning-named copy with interpolated name', () => {
    render(
      <CgLobbyHero
        variant="returning-named"
        displayName="OhadF"
        onPlay={vi.fn()}
        onBrowse={vi.fn()}
      />,
    );
    expect(screen.getByText('WELCOME BACK, OhadF!')).toBeTruthy();
    expect(tMock).toHaveBeenCalledWith('cg.hero.welcomeBack', { name: 'OhadF' });
  });

  it('renders returning-anon copy when no name', () => {
    render(
      <CgLobbyHero
        variant="returning-anon"
        displayName={null}
        onPlay={vi.fn()}
        onBrowse={vi.fn()}
      />,
    );
    expect(screen.getByText('cg.hero.welcomeBackAnon')).toBeTruthy();
  });

  it('emits cg_lobby_hero_view on mount with variant', () => {
    render(
      <CgLobbyHero
        variant="returning-named"
        displayName="X"
        onPlay={vi.fn()}
        onBrowse={vi.fn()}
      />,
    );
    expect(trackGrowthEventMock).toHaveBeenCalledWith('cg_lobby_hero_view', {
      variant: 'returning-named',
    });
  });

  it('calls onPlay and emits cg_lobby_hero_play on PLAY click', () => {
    const onPlay = vi.fn();
    render(
      <CgLobbyHero
        variant="first-timer"
        displayName={null}
        onPlay={onPlay}
        onBrowse={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('cg-lobby-hero-play'));
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(trackGrowthEventMock).toHaveBeenCalledWith('cg_lobby_hero_play', {
      variant: 'first-timer',
    });
  });

  it('calls onBrowse and emits cg_lobby_hero_browse on Browse click', () => {
    const onBrowse = vi.fn();
    render(
      <CgLobbyHero
        variant="first-timer"
        displayName={null}
        onPlay={vi.fn()}
        onBrowse={onBrowse}
      />,
    );
    fireEvent.click(screen.getByTestId('cg-lobby-hero-browse'));
    expect(onBrowse).toHaveBeenCalledTimes(1);
    expect(trackGrowthEventMock).toHaveBeenCalledWith('cg_lobby_hero_browse', {
      variant: 'first-timer',
    });
  });

  it('uses play.webp mascot for first-timer', () => {
    render(
      <CgLobbyHero
        variant="first-timer"
        displayName={null}
        onPlay={vi.fn()}
        onBrowse={vi.fn()}
      />,
    );
    const img = screen.getByTestId('cg-lobby-hero-mascot') as HTMLImageElement;
    expect(img.src).toContain('/mascot/play.webp');
  });

  it('uses waving.webp mascot for returning variants', () => {
    render(
      <CgLobbyHero
        variant="returning-named"
        displayName="X"
        onPlay={vi.fn()}
        onBrowse={vi.fn()}
      />,
    );
    const img = screen.getByTestId('cg-lobby-hero-mascot') as HTMLImageElement;
    expect(img.src).toContain('/mascot/waving.webp');
  });

  it('renders aria-label on section from t()', () => {
    render(
      <CgLobbyHero
        variant="first-timer"
        displayName={null}
        onPlay={vi.fn()}
        onBrowse={vi.fn()}
      />,
    );
    const section = screen.getByLabelText('cg.hero.aria.section');
    expect(section).toBeTruthy();
  });

  it('sets dir attribute from LanguageContext (RTL)', () => {
    mockDir = 'rtl';
    render(
      <CgLobbyHero
        variant="first-timer"
        displayName={null}
        onPlay={vi.fn()}
        onBrowse={vi.fn()}
      />,
    );
    const section = screen.getByLabelText('cg.hero.aria.section');
    expect(section.getAttribute('dir')).toBe('rtl');
  });
});
```

- [ ] **Step 2: Run tests and confirm they FAIL**

Run: `cd fe-next && npm run test -- CgLobbyHero`

Expected: ALL fail with "Cannot find module '../CgLobbyHero'".

- [ ] **Step 3: Implement the component (GREEN)**

Create `fe-next/components/multiplayer/CgLobbyHero.tsx`:

```tsx
'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { CgLobbyHeroVariant } from '@/hooks/useCgLobbyHeroVariant';

interface CgLobbyHeroProps {
  variant: CgLobbyHeroVariant;
  displayName: string | null;
  onPlay: () => void;
  onBrowse: () => void;
}

const DECEL = [0.22, 1, 0.36, 1] as const;

const MASCOT: Record<CgLobbyHeroVariant, string> = {
  'first-timer': '/mascot/play.webp',
  'returning-named': '/mascot/waving.webp',
  'returning-anon': '/mascot/waving.webp',
};

/**
 * CrazyGames lobby hero — Comic Panel Cover variant. Mascot speaks via SVG
 * speech bubble; PLAY CTA sits inside an 8-pointed action burst. Suppresses
 * lobby chrome until "Browse rooms" disclosure tap.
 *
 * Anti-patterns avoided: glassmorphism, soft gradients, generic lobby UI.
 * Personality lives in: speech bubble, action burst, kawaii mascot, halftone
 * dot overlay, corner staples.
 */
const CgLobbyHero: React.FC<CgLobbyHeroProps> = ({ variant, displayName, onPlay, onBrowse }) => {
  const { t, dir } = useLanguage();
  const isRTL = dir === 'rtl';

  useEffect(() => {
    trackGrowthEvent('cg_lobby_hero_view', { variant });
  }, [variant]);

  const greeting =
    variant === 'returning-named' && displayName
      ? t('cg.hero.welcomeBack', { name: displayName })
      : variant === 'returning-anon'
        ? t('cg.hero.welcomeBackAnon')
        : t('cg.hero.firstGreeting');

  const sub = variant === 'first-timer' ? t('cg.hero.firstSub') : t('cg.hero.returnSub');

  const handlePlay = () => {
    trackGrowthEvent('cg_lobby_hero_play', { variant });
    onPlay();
  };

  const handleBrowse = () => {
    trackGrowthEvent('cg_lobby_hero_browse', { variant });
    onBrowse();
  };

  return (
    <section
      aria-label={t('cg.hero.aria.section')}
      dir={dir}
      data-testid="cg-lobby-hero"
      className="relative mx-3 sm:mx-4 mt-3 mb-4 rounded-neo border-neo-thick border-black bg-neo-navy-light shadow-hard-lg overflow-hidden texture-halftone"
    >
      {/* Corner staples */}
      <span aria-hidden className="absolute top-2 left-2 w-2 h-1 bg-black rotate-12" />
      <span aria-hidden className="absolute top-2 right-2 w-2 h-1 bg-black -rotate-12" />

      <div className="relative grid grid-cols-1 sm:grid-cols-[1.1fr_1fr] gap-4 sm:gap-6 p-5 sm:p-6 items-center">
        {/* LEFT — speech-bubble greeting + sub + CTA */}
        <div className={`flex flex-col gap-3 ${isRTL ? 'sm:items-end sm:text-right' : 'sm:items-start sm:text-left'} items-center text-center`}>
          {/* Speech bubble */}
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: DECEL }}
            className="relative max-w-[28ch]"
          >
            <div className="relative px-4 py-3 bg-neo-cream text-black border-neo-thick border-black rounded-neo shadow-hard">
              <p className="font-neo-display uppercase leading-tight tracking-tight text-2xl sm:text-3xl">
                {greeting}
              </p>
            </div>
            {/* Bubble tail — flips for RTL via scaleX */}
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className={`absolute -bottom-3 ${isRTL ? 'right-6' : 'left-6'} w-6 h-6 ${isRTL ? '-scale-x-100' : ''}`}
            >
              <path d="M0 0 L20 0 L8 18 Z" fill="#FFFEF0" stroke="#000" strokeWidth="2.5" />
            </svg>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="font-neo-body text-base sm:text-lg text-neo-cream/85 max-w-[36ch]"
          >
            {sub}
          </motion.p>

          <div className="relative w-full max-w-md mt-1">
            {/* Action burst (decorative, behind CTA) */}
            <svg
              aria-hidden
              viewBox="0 0 200 100"
              className="absolute inset-0 w-full h-full -z-0 pointer-events-none"
              preserveAspectRatio="none"
            >
              <polygon
                points="20,20 50,5 80,25 110,0 140,22 170,8 195,28 175,55 198,80 165,90 135,72 105,98 75,75 45,95 20,75 0,55"
                fill="#FFE135"
                stroke="#000"
                strokeWidth="3"
              />
            </svg>
            <button
              data-testid="cg-lobby-hero-play"
              onClick={handlePlay}
              className="relative z-[1] w-full py-4 px-5 rounded-neo border-neo-thick border-black bg-neo-lime text-black font-neo-display uppercase text-2xl tracking-tight shadow-hard-lg active:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-transform duration-100 flex items-center justify-center gap-2"
            >
              <span aria-hidden className="text-2xl">{isRTL ? '◀' : '▶'}</span>
              <span>{t('cg.hero.playCta')}</span>
            </button>
            <span
              aria-hidden
              className="absolute -top-2 -right-2 z-[2] inline-block bg-black text-neo-yellow font-neo-display text-xs uppercase px-2 py-0.5 border-2 border-black -rotate-6"
            >
              {t('cg.hero.playMicrocopy')}
            </span>
          </div>

          <button
            data-testid="cg-lobby-hero-browse"
            onClick={handleBrowse}
            className="mt-1 font-neo-body text-sm text-neo-cream/70 hover:text-neo-cream underline-offset-4 hover:underline transition-colors"
          >
            {t('cg.hero.browseRooms')}
          </button>
        </div>

        {/* RIGHT — mascot on plinth */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: DECEL }}
          className="relative w-full max-w-[260px] mx-auto"
        >
          <div className="relative aspect-square rounded-neo border-neo-thick border-black bg-neo-navy overflow-hidden">
            <motion.img
              src={MASCOT[variant]}
              alt=""
              data-testid="cg-lobby-hero-mascot"
              className="w-full h-full object-contain motion-reduce:!animate-none"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CgLobbyHero;
```

- [ ] **Step 4: Run tests and confirm they PASS**

Run: `cd fe-next && npm run test -- CgLobbyHero`

Expected: 10/10 PASS.

- [ ] **Step 5: Verify line count under cap**

Run: `wc -l fe-next/components/multiplayer/CgLobbyHero.tsx`

Expected: < 300. If pushed past 280, extract the burst `<svg polygon>` and bubble `<svg path>` to `components/multiplayer/CgLobbyHero/SpeechBubble.tsx` + `ActionBurst.tsx`.

---

### Task 5: Wire `CgLobbyHero` into `MultiplayerFlow` (TDD)

**Files:**
- Create: `fe-next/components/multiplayer/__tests__/MultiplayerFlow.cgLobbyDiet.test.tsx`
- Modify: `fe-next/components/multiplayer/MultiplayerFlow.tsx`

- [ ] **Step 1: Write the failing integration tests (RED)**

Create `fe-next/components/multiplayer/__tests__/MultiplayerFlow.cgLobbyDiet.test.tsx`. **Copy the mock fixture pattern from `MultiplayerFlow.cgArrival.test.tsx`** — same mocks for profileStorage, useCrazyGamesInvite, avatarConfig, growthTracking. Then add this test body:

```tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('@/utils/profileStorage', () => ({
  getStoredUsername: () => 'CGPlayer',
  getStoredAvatarId: () => 'avatar-1',
  hasCompleteStoredProfile: () => true,
}));

vi.mock('@/hooks/useCrazyGamesInvite', () => ({
  useCrazyGamesInvite: () => ({
    isReady: true,
    inviteRoomId: null,
    isInstantMultiplayer: false,
    showInviteButton: vi.fn(),
    hideInviteButton: vi.fn(),
    createInviteLink: vi.fn(),
    isInviteButtonVisible: false,
    isInviteJoin: false,
  }),
}));

let mockIsOnCrazyGamesPlatform = false;
let mockCgUser: { username: string | null } | null = null;
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isOnCrazyGamesPlatform: mockIsOnCrazyGamesPlatform,
    cgUser: mockCgUser,
    getSystemInfo: vi.fn().mockResolvedValue(null),
  }),
}));

const trackGrowthEventMock = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEventMock(...args),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}|${JSON.stringify(params)}` : key,
    dir: 'ltr',
    language: 'en',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, profile: null }),
}));

vi.mock('@/hooks/useMatchmaking', () => ({
  useMatchmaking: () => ({
    status: 'idle',
    roomId: null,
    eloRange: 0,
    queueSize: 0,
    waitTime: 0,
    opponent: null,
    joinQueue: vi.fn(),
    leaveQueue: vi.fn(),
  }),
}));

vi.mock('../RoomListView', () => ({
  __esModule: true,
  default: () => <div data-testid="room-list-view">RoomListView</div>,
}));
vi.mock('../JoinRoomModal', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('../CreateRoomModal', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('../SeasonBanner', () => ({
  SeasonBanner: () => <div data-testid="season-banner">SeasonBanner</div>,
}));
vi.mock('../MatchmakingOverlay', () => ({
  MatchmakingOverlay: () => null,
}));

import MultiplayerFlow from '../MultiplayerFlow';
import type { Language } from '@/shared/types/game';

const baseProps = {
  handleJoin: vi.fn(),
  refreshRooms: vi.fn(),
  activeRooms: [],
  roomsLoading: false,
  isJoining: false,
  isAuthenticated: false,
  displayName: '',
  prefilledRoom: undefined,
  defaultLanguage: 'en' as Language,
  setGameCode: vi.fn(),
  setUsername: vi.fn(),
  setRoomName: vi.fn(),
  setHostUsername: vi.fn(),
};

describe('MultiplayerFlow — CG lobby diet', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    trackGrowthEventMock.mockClear();
    mockCgUser = null;
  });
  afterEach(() => {
    cleanup();
  });

  it('does NOT render hero when isOnCrazyGamesPlatform=false', () => {
    mockIsOnCrazyGamesPlatform = false;
    render(<MultiplayerFlow {...baseProps} />);
    expect(screen.queryByTestId('cg-lobby-hero')).toBeNull();
    expect(screen.getByTestId('room-list-view')).toBeTruthy();
  });

  it('renders hero on CG when first-session auto-join already fired', () => {
    mockIsOnCrazyGamesPlatform = true;
    sessionStorage.setItem('boggle_cg_auto_joined', '1');
    render(<MultiplayerFlow {...baseProps} />);
    expect(screen.getByTestId('cg-lobby-hero')).toBeTruthy();
  });

  it('hides RoomListView and SeasonBanner when hero is collapsed', () => {
    mockIsOnCrazyGamesPlatform = true;
    sessionStorage.setItem('boggle_cg_auto_joined', '1');
    render(<MultiplayerFlow {...baseProps} />);
    expect(screen.queryByTestId('room-list-view')).toBeNull();
    expect(screen.queryByTestId('season-banner')).toBeNull();
  });

  it('shows RoomListView and SeasonBanner after Browse-rooms tap', () => {
    mockIsOnCrazyGamesPlatform = true;
    sessionStorage.setItem('boggle_cg_auto_joined', '1');
    render(<MultiplayerFlow {...baseProps} />);
    fireEvent.click(screen.getByTestId('cg-lobby-hero-browse'));
    expect(screen.getByTestId('room-list-view')).toBeTruthy();
    expect(screen.getByTestId('season-banner')).toBeTruthy();
  });

  it('PLAY CTA fires Quick Play (calls handleJoin with quickPlay flag)', () => {
    mockIsOnCrazyGamesPlatform = true;
    sessionStorage.setItem('boggle_cg_auto_joined', '1');
    const handleJoin = vi.fn();
    render(<MultiplayerFlow {...baseProps} handleJoin={handleJoin} />);
    fireEvent.click(screen.getByTestId('cg-lobby-hero-play'));
    expect(handleJoin).toHaveBeenCalledWith(
      true,
      'en',
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ quickPlay: true }),
    );
  });

  it('renders returning-named greeting when cgUser has username', () => {
    mockIsOnCrazyGamesPlatform = true;
    mockCgUser = { username: 'OhadF' };
    sessionStorage.setItem('boggle_cg_auto_joined', '1');
    render(<MultiplayerFlow {...baseProps} />);
    // greeting key is interpolated via t() mock as `key|{json}`
    expect(screen.getByText(/cg\.hero\.welcomeBack\|.*OhadF/)).toBeTruthy();
  });

  it('does NOT render hero in classroom mode', () => {
    mockIsOnCrazyGamesPlatform = true;
    sessionStorage.setItem('boggle_cg_auto_joined', '1');
    render(<MultiplayerFlow {...baseProps} isClassroomMode />);
    expect(screen.queryByTestId('cg-lobby-hero')).toBeNull();
  });

  it('regression: first-session auto-join still fires (auto_join_room or quick_play telemetry)', () => {
    mockIsOnCrazyGamesPlatform = true;
    // sessionStorage flag NOT set — this is first session
    render(<MultiplayerFlow {...baseProps} activeRooms={[]} />);
    // The cg_lobby_arrival event still fires from the existing auto-join effect.
    const calls = trackGrowthEventMock.mock.calls.map((c) => c[0]);
    expect(calls).toContain('cg_lobby_arrival');
  });
});
```

- [ ] **Step 2: Run tests and confirm they FAIL**

Run: `cd fe-next && npm run test -- MultiplayerFlow.cgLobbyDiet`

Expected: ALL fail — hero not yet wired.

- [ ] **Step 3: Modify `MultiplayerFlow.tsx` to render the hero**

Edit `fe-next/components/multiplayer/MultiplayerFlow.tsx`. Make these specific changes:

**3a.** Add imports at the top of the file (after existing imports):

```tsx
import CgLobbyHero from './CgLobbyHero';
import { useCgLobbyHeroVariant } from '@/hooks/useCgLobbyHeroVariant';
```

**3b.** Update the destructure of `useCrazyGames()` (currently `const { isOnCrazyGamesPlatform } = useCrazyGames();` at line ~111) to also pull `cgUser`:

```tsx
const { isOnCrazyGamesPlatform, cgUser } = useCrazyGames();
```

**3c.** Add hero state + variant near the other `useState` calls (around line 125):

```tsx
const [heroExpanded, setHeroExpanded] = useState(false);
const heroVariant = useCgLobbyHeroVariant(cgUser ?? null);
```

**3d.** Add a derived boolean for "should we show the hero?" right before the classroom-mode branch (around line 399):

```tsx
const cgAutoJoinPending =
  isOnCrazyGamesPlatform &&
  !cgAutoJoinHandledRef.current &&
  (typeof window === 'undefined' || !window.sessionStorage.getItem('boggle_cg_auto_joined'));

const showCgHero = isOnCrazyGamesPlatform && !isClassroomMode && !cgAutoJoinPending;
```

**3e.** Modify the final return block. Wrap the existing chrome behind a `{showCgHero ? heroExpanded : true}` gate. Replace the existing `return (<>...</>);` (lines 411-489) with:

```tsx
return (
  <>
    {showCgHero && (
      <CgLobbyHero
        variant={heroVariant.variant}
        displayName={heroVariant.displayName}
        onPlay={() => {
          heroVariant.markSeen();
          handleQuickPlay();
        }}
        onBrowse={() => {
          heroVariant.markSeen();
          setHeroExpanded(true);
        }}
      />
    )}

    {(!showCgHero || heroExpanded) && (
      <>
        <SeasonBanner />
        {isAdmin && (
          <div className="px-4 pt-3">
            <button
              onClick={() => matchmaking.joinQueue('classic', defaultLanguage)}
              disabled={matchmaking.status !== 'idle'}
              className="w-full rounded-neo border-neo bg-neo-pink px-4 py-3 font-neo-display text-neo-white shadow-hard-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed disabled:opacity-50"
            >
              ⚔️ {t('matchmaking.rankedMatch')}
            </button>
          </div>
        )}

        {roomFetchTimedOut && !roomsLoading && activeRooms.length === 0 && (
          <div className="mx-4 mb-3 p-3 bg-neo-red/20 border-2 border-neo-red rounded-neo flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-neo-white">
              {t('multiplayerFlow.roomList.fetchTimeout')}
            </p>
            <button
              onClick={refreshRooms}
              className="text-sm font-black uppercase text-neo-red border-2 border-neo-red rounded-neo px-3 py-1 hover:bg-neo-red/30 transition-colors"
            >
              {t('multiplayerFlow.roomList.retry')}
            </button>
          </div>
        )}

        <RoomListView
          activeRooms={activeRooms}
          roomsLoading={roomsLoading}
          onRefreshRooms={refreshRooms}
          onRoomClick={handleRoomClick}
          onCreateRoom={handleCreateClick}
          onQuickPlay={handleQuickPlay}
          isQuickPlayLoading={!!joiningRoomCode || isJoining}
        />
      </>
    )}

    <MatchmakingOverlay
      status={matchmaking.status}
      elo={profile?.ranked_mmr ?? 1000}
      eloRange={matchmaking.eloRange}
      queueSize={matchmaking.queueSize}
      waitTime={matchmaking.waitTime}
      opponent={matchmaking.opponent}
      onCancel={matchmaking.leaveQueue}
      onCreateRoom={() => {
        matchmaking.leaveQueue();
        setFlowState('create-modal');
      }}
      t={t as (key: string, params?: Record<string, unknown>) => string}
    />

    <JoinRoomModal
      isOpen={flowState === 'join-modal'}
      onClose={handleModalClose}
      room={selectedRoom}
      isJoining={isJoining}
      onJoin={handleJoinFromModal}
      isAuthenticated={isAuthenticated}
      displayName={displayName || null}
      profileAvatar={profileAvatar}
    />

    <CreateRoomModal
      isOpen={flowState === 'create-modal'}
      onClose={handleModalClose}
      isCreating={isJoining}
      onCreate={handleCreateFromModal}
      defaultLanguage={defaultLanguage}
      isAuthenticated={isAuthenticated}
      displayName={displayName || null}
      profileAvatar={profileAvatar}
    />
  </>
);
```

Note: `MatchmakingOverlay`, `JoinRoomModal`, `CreateRoomModal` are kept ALWAYS-mounted (outside the `heroExpanded` gate) so existing behavior of overlay/modal flows is preserved.

- [ ] **Step 4: Run integration tests and confirm they PASS**

Run: `cd fe-next && npm run test -- MultiplayerFlow.cgLobbyDiet`

Expected: 8/8 PASS.

- [ ] **Step 5: Verify existing `MultiplayerFlow.cgArrival.test.tsx` still passes (regression)**

Run: `cd fe-next && npm run test -- MultiplayerFlow.cgArrival`

Expected: still PASSes. The auto-join effect is unchanged.

- [ ] **Step 6: Check line count on MultiplayerFlow**

Run: `wc -l fe-next/components/multiplayer/MultiplayerFlow.tsx`

Expected: < 500. If it crosses, extract the lobby chrome (`<SeasonBanner /> + admin button + retry banner + RoomListView`) into a private `LobbyChrome` sub-component file.

---

### Task 6: Full-suite verification

- [ ] **Step 1: Run lint**

Run: `cd fe-next && npm run lint`

Expected: clean (or at most pre-existing unrelated warnings).

- [ ] **Step 2: Run all tests**

Run: `cd fe-next && npm run test`

Expected: all green. Pay attention to any newly broken snapshot or RTL test.

- [ ] **Step 3: Run fast build**

Run: `cd fe-next && npm run build:fast`

Expected: clean build, no type errors, no missing translation key warnings.

- [ ] **Step 4: Manual smoke (optional, dev server)**

Run: `cd fe-next && npm run dev` (port 3001 — never 3000 per project memory).

Open: `http://localhost:3001/en/multiplayer?cg=1`. Auto-join may bounce you on first visit; navigate back to `/en/multiplayer?cg=1` to see the hero. Verify:
- Speech bubble + mascot + PLAY + Browse render.
- Tap Browse → rooms list appears below.
- Tap PLAY → Quick Play kicks off (handleJoin called).
- `?locale=he&cg=1` → RTL flip, bubble tail mirrors, chevron flips.

- [ ] **Step 5: Phase commit (ASK USER FIRST per project rule)**

**Before committing, ask the user:**

> "Implementation phase complete. All tests green, build clean. About to commit as `feat(cg): add lobby diet hero on /multiplayer`. Hebrew strings included but flagged for native review per project rule. OK to commit?"

Wait for user confirmation. On approval, run:

```bash
git add fe-next/components/multiplayer/CgLobbyHero.tsx \
        fe-next/components/multiplayer/__tests__/CgLobbyHero.test.tsx \
        fe-next/components/multiplayer/__tests__/MultiplayerFlow.cgLobbyDiet.test.tsx \
        fe-next/components/multiplayer/MultiplayerFlow.tsx \
        fe-next/components/CrazyGamesSDK.tsx \
        fe-next/hooks/useCgLobbyHeroVariant.ts \
        fe-next/hooks/__tests__/useCgLobbyHeroVariant.test.ts \
        fe-next/utils/growthTracking.ts \
        fe-next/translations/en.js \
        fe-next/translations/he.js \
        fe-next/translations/sv.js \
        fe-next/translations/ja.js \
        fe-next/translations/es.js
```

Then:

```bash
git commit -m "$(cat <<'EOF'
feat(cg): add lobby diet hero on /multiplayer

CrazyGames players returning to /multiplayer (after first-session
auto-join consumed the sessionStorage gate) now see a single
neo-brutalist hero card — mascot + speech-bubble greeting + big
PLAY CTA + collapsed rooms list. Existing chrome (SeasonBanner,
admin Ranked button, RoomListView) hides behind a "Browse rooms"
disclosure.

- New CgLobbyHero (Comic Panel Cover direction): mascot, speech
  bubble (RTL-mirrored tail), 8-pointed yellow action burst behind
  the lime PLAY CTA, "GO!" microcopy.
- Three variants: first-timer, returning-named (CG signed-in),
  returning-anon (localStorage flag).
- New useCgLobbyHeroVariant hook computes variant once on mount,
  exposes markSeen() to set the localStorage flag.
- 3 new analytics events: cg_lobby_hero_view/play/browse.
- First-session auto-join behavior unchanged (regression test
  added).

Hebrew strings included but need native review.

Spec: docs/superpowers/specs/2026-05-01-cg-lobby-diet-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Validation fixes (only if Phase 2 verification fails)

If lint or build flags issues post-commit, fix in a follow-up commit `chore: fix cg lobby diet validation issues` per project git rule. Skip this phase if Phase 2 came out clean.

---

## Phase 4: Simplify (only if needed)

After live verification, if any duplication crept in or if `MultiplayerFlow.tsx` lobby-chrome block looks ripe for extraction, do a `refactor: extract lobby chrome from MultiplayerFlow` pass. Skip if the file is comfortably under cap and reads cleanly.

---

## Self-Review

**Spec coverage check:**
- ✅ Subsystem A scope (lobby diet) — Tasks 4 + 5
- ✅ Two-file change architecture — confirmed in File Structure
- ✅ Three hero variants (first-timer / returning-named / returning-anon) — Task 4 component + Task 2 hook
- ✅ localStorage `lexiclash_cg_seen` set on action only, not mount — Task 5 (`onPlay` / `onBrowse` call `markSeen`)
- ✅ Auto-join window suppression — Task 5 step 3d (`cgAutoJoinPending` derivation)
- ✅ Disclosure default collapsed, no persistence — Task 5 step 3c (`useState(false)`)
- ✅ Variant computed once on mount — Task 2 step 3 (`useRef`)
- ✅ Analytics events (3) — Task 1 + Task 4
- ✅ All 5 locale strings — Task 3
- ✅ RTL mirroring (bubble tail, chevron) — Task 4 component
- ✅ Reduced-motion guard — Task 4 component (`motion-reduce:!animate-none`)
- ✅ `t()` interpolation, no `.replace` — Task 4 (`t('cg.hero.welcomeBack', { name })`)
- ✅ 500-line cap — Task 5 step 6 escape hatch
- ✅ TDD strict — RED-GREEN flow in every task
- ✅ Phase commit at end — Task 6 step 5
- ✅ Existing first-session auto-join unchanged — Task 5 step 3 (`MultiplayerFlow.tsx:348-389` untouched), Task 5 step 5 regression test

**Type consistency check:**
- `CgLobbyHeroVariant` defined in Task 2 hook, imported in Task 4 component. ✅
- `markSeen` in Task 2 hook return matches `heroVariant.markSeen()` call site in Task 5 step 3e. ✅
- `displayName` (string | null) consistent across hook return + component prop. ✅
- `cgUser` field on `useCrazyGames()` return — defined in Task 1 step 2 (or verified pre-existing), consumed in Task 5 step 3b. ✅

**Placeholder scan:**
- No "TBD", "TODO", "implement later", or vague "handle edge cases".
- All code blocks contain actual code.
- All test cases include assertions, not "// add assertions".

Plan is complete.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-01-cg-lobby-diet.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
