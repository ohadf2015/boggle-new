# MP Invite Onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give first-time users who landed via a MP-room invite link a dedicated 3-step onboarding (language → profile → minimal interactive teaser) with a sticky "Skip & Join now" CTA visible from the moment a profile exists, plus a fallback banner on the Practice hub when an invite is still pending.

**Architecture:** Extend existing `savePendingRoomInvite` storage to carry `hostName` + timestamp. Branch `OnboardingFlow.STEPS` based on `hasPendingRoomInvite()`. New `InviteTutorialTeaser` (one preset board, find any word, auto-advance ≤1.2s) replaces the full `TutorialGame` on the invite path. New `InviteContextBanner` (used inside profile + teaser) and `PendingRoomBanner` (mounted on `/practice` when invite pending) make social context visible. `getJoinUrl` gains an optional `hostName` so the share URL preserves it for the recipient.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest + React Testing Library, Tailwind (`shadow-hard`, `border-neo-thick`, neo-pink for MP accents), `framer-motion`/`AdaptiveMotion`, `@/contexts/LanguageContext` for i18n, PostHog for telemetry.

**Spec:** [`docs/superpowers/specs/2026-05-04-mp-invite-onboarding-design.md`](../specs/2026-05-04-mp-invite-onboarding-design.md)

---

## File Map

### Create
- `fe-next/utils/__tests__/onboardingStorage.invite.test.ts` — storage extension tests
- `fe-next/hooks/useInviteContext.ts` — SSR-safe pending-invite reader hook
- `fe-next/hooks/__tests__/useInviteContext.test.ts`
- `fe-next/components/onboarding/InviteContextBanner.tsx` — sticky banner (host + code + skip CTA)
- `fe-next/components/onboarding/__tests__/InviteContextBanner.test.tsx`
- `fe-next/components/onboarding/InviteTutorialTeaser.tsx` — one-moment interactive demo
- `fe-next/components/onboarding/__tests__/InviteTutorialTeaser.test.tsx`
- `fe-next/components/practice/PendingRoomBanner.tsx` — practice-hub fallback banner
- `fe-next/components/practice/__tests__/PendingRoomBanner.test.tsx`
- `fe-next/e2e/invite-onboarding.spec.ts` — Playwright happy-path

### Modify
- `fe-next/utils/onboardingStorage.ts` — extend invite payload to JSON, emit `'invite-changed'` event, add `getPendingRoomInvite()`
- `fe-next/app/[locale]/PageClient.tsx:30-40` — parse `?host=`, sanitise, pass to save
- `fe-next/components/onboarding/QuickProfileSetup.tsx` — accept `inviteContext` prop, render `InviteContextBanner`
- `fe-next/components/onboarding/OnboardingFlow.tsx` — invite-mode STEPS branch, route after teaser, telemetry
- `fe-next/app/[locale]/practice/PageClient.tsx` — mount `PendingRoomBanner` above hero
- `fe-next/utils/share.ts:46` — `getJoinUrl(code, utmSource?, hostName?)` appends `host` param
- `fe-next/translations/en.js` (+ `he.js`/`sv.js`/`ja.js`/`es.js`) — add `invite.*` namespace

---

## Task 1: Storage Extension — JSON payload + event

**Files:**
- Modify: `fe-next/utils/onboardingStorage.ts:96-120`
- Create: `fe-next/utils/__tests__/onboardingStorage.invite.test.ts`

The current storage saves a bare string. We need a JSON envelope `{code, hostName?, ts}` + 24h TTL + a `'invite-changed'` CustomEvent so consumers (`useInviteContext`) react without re-mount. Existing string callers must continue to work — `consumePendingRoomInvite()` returns the code string only (back-compat for `OnboardingFlow.tsx:143`/`193`/`221` which currently expect a string).

- [ ] **Step 1: Write failing tests**

Create `fe-next/utils/__tests__/onboardingStorage.invite.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  savePendingRoomInvite,
  consumePendingRoomInvite,
  hasPendingRoomInvite,
  getPendingRoomInvite,
} from '@/utils/onboardingStorage';

describe('Pending room invite', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('round-trips code only', () => {
    savePendingRoomInvite('ABC123');
    expect(hasPendingRoomInvite()).toBe(true);
    expect(getPendingRoomInvite()?.code).toBe('ABC123');
    expect(getPendingRoomInvite()?.hostName).toBeUndefined();
  });

  it('round-trips code + hostName', () => {
    savePendingRoomInvite('ABC123', 'Alice');
    expect(getPendingRoomInvite()).toEqual(
      expect.objectContaining({ code: 'ABC123', hostName: 'Alice' }),
    );
  });

  it('consume returns code string and clears storage', () => {
    savePendingRoomInvite('ABC123', 'Alice');
    expect(consumePendingRoomInvite()).toBe('ABC123');
    expect(hasPendingRoomInvite()).toBe(false);
    expect(getPendingRoomInvite()).toBeNull();
  });

  it('returns null when older than 24h', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    savePendingRoomInvite('ABC123', 'Alice');
    vi.setSystemTime(new Date('2026-01-02T00:01:00Z')); // 24h + 1min later
    expect(hasPendingRoomInvite()).toBe(false);
    expect(getPendingRoomInvite()).toBeNull();
  });

  it('emits invite-changed event on save and consume', () => {
    const handler = vi.fn();
    window.addEventListener('invite-changed', handler);
    savePendingRoomInvite('ABC123', 'Alice');
    expect(handler).toHaveBeenCalledTimes(1);
    consumePendingRoomInvite();
    expect(handler).toHaveBeenCalledTimes(2);
    window.removeEventListener('invite-changed', handler);
  });

  it('back-compat: legacy string payloads return code', () => {
    sessionStorage.setItem('lexiclash_pending_room_invite', 'LEGACY');
    expect(hasPendingRoomInvite()).toBe(true);
    expect(getPendingRoomInvite()?.code).toBe('LEGACY');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd fe-next && npx vitest run utils/__tests__/onboardingStorage.invite.test.ts
```

Expected: FAIL — `getPendingRoomInvite is not exported`.

- [ ] **Step 3: Implement extension**

Replace `fe-next/utils/onboardingStorage.ts` lines 96-120 with:

```ts
// ── Pending Room Invite ──────────────────────────────────────────────
// Preserves a multiplayer room code (and optional host name) across the
// onboarding flow so users who click an invite link before completing FTUE
// can join after. Stored as JSON with a 24h TTL.

const PENDING_ROOM_KEY = 'lexiclash_pending_room_invite';
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
const INVITE_EVENT = 'invite-changed';

export interface PendingRoomInvite {
  code: string;
  hostName?: string;
  ts: number;
}

const emitInviteChanged = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(INVITE_EVENT));
};

/** Save a room code (and optional host display name) so post-onboarding redirect can pick it up. */
export const savePendingRoomInvite = (roomCode: string, hostName?: string): void => {
  if (typeof window === 'undefined') return;
  const payload: PendingRoomInvite = { code: roomCode, hostName, ts: Date.now() };
  sessionStorage.setItem(PENDING_ROOM_KEY, JSON.stringify(payload));
  emitInviteChanged();
};

/** Read pending invite without consuming it. Returns null if expired or absent. */
export const getPendingRoomInvite = (): PendingRoomInvite | null => {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PENDING_ROOM_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingRoomInvite;
    if (parsed && typeof parsed === 'object' && parsed.code) {
      if (typeof parsed.ts === 'number' && Date.now() - parsed.ts > INVITE_TTL_MS) {
        sessionStorage.removeItem(PENDING_ROOM_KEY);
        return null;
      }
      return parsed;
    }
  } catch {
    // Legacy plain-string payload — wrap and return.
    return { code: raw, ts: Date.now() };
  }
  return null;
};

/** Retrieve (and clear) the pending invite room code. */
export const consumePendingRoomInvite = (): string | null => {
  const invite = getPendingRoomInvite();
  if (!invite) return null;
  sessionStorage.removeItem(PENDING_ROOM_KEY);
  emitInviteChanged();
  return invite.code;
};

/** Check if a (non-expired) pending room invite exists. */
export const hasPendingRoomInvite = (): boolean => {
  return getPendingRoomInvite() !== null;
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd fe-next && npx vitest run utils/__tests__/onboardingStorage.invite.test.ts
```

Expected: PASS — 6/6.

Then run the full storage test suite to catch regressions:

```bash
cd fe-next && npx vitest run utils/__tests__/onboardingStorage
```

Expected: PASS — including any pre-existing tests.

- [ ] **Step 5: Commit**

```bash
cd fe-next && git add utils/onboardingStorage.ts utils/__tests__/onboardingStorage.invite.test.ts
git commit -m "feat(invite): JSON-payload pending invite with hostName + TTL + event"
```

---

## Task 2: `useInviteContext` Hook

**Files:**
- Create: `fe-next/hooks/useInviteContext.ts`
- Create: `fe-next/hooks/__tests__/useInviteContext.test.ts`

SSR-safe reactive reader. Subscribes to the `'invite-changed'` window event from Task 1 so consumers re-render when the invite is saved or consumed without depending on remount.

- [ ] **Step 1: Write failing test**

Create `fe-next/hooks/__tests__/useInviteContext.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInviteContext } from '@/hooks/useInviteContext';
import { savePendingRoomInvite, consumePendingRoomInvite } from '@/utils/onboardingStorage';

describe('useInviteContext', () => {
  beforeEach(() => sessionStorage.clear());

  it('returns null when no invite pending', () => {
    const { result } = renderHook(() => useInviteContext());
    expect(result.current).toBeNull();
  });

  it('returns invite when present at mount', () => {
    savePendingRoomInvite('ABC123', 'Alice');
    const { result } = renderHook(() => useInviteContext());
    expect(result.current).toMatchObject({ code: 'ABC123', hostName: 'Alice' });
  });

  it('reacts to invite-changed event', () => {
    const { result } = renderHook(() => useInviteContext());
    expect(result.current).toBeNull();
    act(() => savePendingRoomInvite('XYZ789', 'Bob'));
    expect(result.current).toMatchObject({ code: 'XYZ789', hostName: 'Bob' });
    act(() => { consumePendingRoomInvite(); });
    expect(result.current).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd fe-next && npx vitest run hooks/__tests__/useInviteContext.test.ts
```

Expected: FAIL — `useInviteContext is not exported`.

- [ ] **Step 3: Implement hook**

Create `fe-next/hooks/useInviteContext.ts`:

```ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { getPendingRoomInvite, type PendingRoomInvite } from '@/utils/onboardingStorage';

/**
 * SSR-safe reactive reader for the pending MP-room invite.
 * Re-renders consumers when `'invite-changed'` is dispatched (save or consume).
 */
export const useInviteContext = (): PendingRoomInvite | null => {
  const [invite, setInvite] = useState<PendingRoomInvite | null>(null);

  const refresh = useCallback(() => {
    setInvite(getPendingRoomInvite());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('invite-changed', refresh);
    return () => window.removeEventListener('invite-changed', refresh);
  }, [refresh]);

  return invite;
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd fe-next && npx vitest run hooks/__tests__/useInviteContext.test.ts
```

Expected: PASS — 3/3.

- [ ] **Step 5: Commit**

```bash
cd fe-next && git add hooks/useInviteContext.ts hooks/__tests__/useInviteContext.test.ts
git commit -m "feat(invite): useInviteContext SSR-safe reactive hook"
```

---

## Task 3: Home gate parses `?host=`

**Files:**
- Modify: `fe-next/app/[locale]/PageClient.tsx:30-40`

Sanitise `?host=` to allow only Latin/accented/Hebrew/Hiragana/Katakana letters + space + apostrophe + hyphen, max 24 chars. Render-only field — no HTML interpolation anywhere — so the regex is the only safety needed beyond that.

- [ ] **Step 1: Write failing test**

Create `fe-next/app/[locale]/__tests__/PageClient.invite.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import HomePageClient from '@/app/[locale]/PageClient';
import { getPendingRoomInvite } from '@/utils/onboardingStorage';

vi.mock('next/dynamic', () => ({ default: () => () => <div data-testid="onboarding-flow" /> }));

describe('HomePageClient invite parsing', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  const setUrl = (search: string) => {
    Object.defineProperty(window, 'location', {
      value: { search, pathname: '/en', origin: 'http://localhost' },
      writable: true,
    });
  };

  it('saves room + hostName when both URL params present', () => {
    setUrl('?room=ABC123&host=Alice');
    render(<HomePageClient />);
    expect(getPendingRoomInvite()).toMatchObject({ code: 'ABC123', hostName: 'Alice' });
  });

  it('saves room with no host when host param missing', () => {
    setUrl('?room=ABC123');
    render(<HomePageClient />);
    expect(getPendingRoomInvite()?.hostName).toBeUndefined();
  });

  it('strips XSS attempt from host', () => {
    setUrl('?room=ABC123&host=' + encodeURIComponent('<script>alert(1)</script>'));
    render(<HomePageClient />);
    const invite = getPendingRoomInvite();
    expect(invite?.hostName ?? '').not.toContain('<');
    expect(invite?.hostName ?? '').not.toContain('>');
  });

  it('truncates long host names to 24 chars', () => {
    const longName = 'a'.repeat(40);
    setUrl(`?room=ABC123&host=${longName}`);
    render(<HomePageClient />);
    expect(getPendingRoomInvite()?.hostName?.length ?? 0).toBeLessThanOrEqual(24);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd fe-next && npx vitest run app/[locale]/__tests__/PageClient.invite.test.tsx
```

Expected: FAIL — host not saved.

- [ ] **Step 3: Implement extension**

Replace `fe-next/app/[locale]/PageClient.tsx` lines 33-40 with:

```tsx
  const [showFTUE, setShowFTUE] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (hasCompletedOnboarding() || hasSupabaseSession()) return false;
    // Save room invite (and optional host name) before onboarding replaces the view
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room');
    if (roomCode) {
      const rawHost = params.get('host') ?? '';
      const hostName = sanitizeHostName(rawHost) || undefined;
      savePendingRoomInvite(roomCode, hostName);
    }
    return true;
  });
```

Add at top of file (after imports):

```tsx
const HOST_NAME_ALLOWED = /[^A-Za-z0-9 '\-À-ɏ֐-׿぀-ヿ]/g;

const sanitizeHostName = (raw: string): string => {
  if (!raw) return '';
  return raw.replace(HOST_NAME_ALLOWED, '').trim().slice(0, 24);
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd fe-next && npx vitest run app/[locale]/__tests__/PageClient.invite.test.tsx
```

Expected: PASS — 4/4.

- [ ] **Step 5: Commit**

```bash
cd fe-next && git add "app/[locale]/PageClient.tsx" "app/[locale]/__tests__/PageClient.invite.test.tsx"
git commit -m "feat(invite): home gate parses + sanitises ?host= URL param"
```

---

## Task 4: `InviteContextBanner` component

**Files:**
- Create: `fe-next/components/onboarding/InviteContextBanner.tsx`
- Create: `fe-next/components/onboarding/__tests__/InviteContextBanner.test.tsx`

Sticky pink-accent banner that names the host and exposes a one-tap Skip CTA. Reused inside `QuickProfileSetup` and `InviteTutorialTeaser`. Falls back to `t('invite.banner.yourFriend')` when host name is missing. RTL-clean.

- [ ] **Step 1: Write failing tests**

Create `fe-next/components/onboarding/__tests__/InviteContextBanner.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InviteContextBanner from '@/components/onboarding/InviteContextBanner';
import { LanguageProvider } from '@/contexts/LanguageContext';

const wrap = (ui: React.ReactNode) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe('InviteContextBanner', () => {
  it('renders host name when provided', () => {
    wrap(<InviteContextBanner roomCode="ABC123" hostName="Alice" onSkip={() => {}} />);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/ABC123/)).toBeInTheDocument();
  });

  it('falls back to "Your friend" when hostName missing', () => {
    wrap(<InviteContextBanner roomCode="ABC123" onSkip={() => {}} />);
    // English fallback string
    expect(screen.getByText(/your friend/i)).toBeInTheDocument();
  });

  it('fires onSkip when CTA tapped', () => {
    const onSkip = vi.fn();
    wrap(<InviteContextBanner roomCode="ABC123" hostName="Alice" onSkip={onSkip} />);
    fireEvent.click(screen.getByTestId('invite-banner-skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd fe-next && npx vitest run components/onboarding/__tests__/InviteContextBanner.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement component**

Create `fe-next/components/onboarding/InviteContextBanner.tsx`:

```tsx
'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  roomCode: string;
  hostName?: string;
  onSkip: () => void;
}

/**
 * Sticky pink-accent banner shown to first-time invitees during onboarding.
 * Names the host (or falls back) and exposes a one-tap Skip-and-Join CTA.
 */
const InviteContextBanner: React.FC<Props> = ({ roomCode, hostName, onSkip }) => {
  const { t, dir } = useLanguage();
  const displayName = hostName?.trim() || t('invite.banner.yourFriend');

  return (
    <div
      data-testid="invite-banner"
      dir={dir}
      className="sticky top-0 z-30 w-full bg-neo-pink text-neo-black border-b-2 border-neo-black shadow-hard-sm px-4 py-2 flex items-center justify-between gap-3"
      role="status"
      aria-live="polite"
    >
      <p className="font-neo-display font-black text-sm uppercase tracking-wide truncate">
        <span aria-hidden>👋 </span>
        {t('invite.banner.host', { hostName: displayName })}{' '}
        <span className="font-mono bg-neo-black text-neo-cream px-1.5 py-0.5 rounded-sm">
          {roomCode}
        </span>
      </p>
      <button
        data-testid="invite-banner-skip"
        type="button"
        onClick={onSkip}
        className="shrink-0 min-h-[40px] px-3 py-2 rounded-neo bg-neo-black text-neo-pink border-2 border-neo-black font-neo-display font-black text-xs uppercase tracking-wide active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
      >
        {t('invite.banner.skipCTA')}
      </button>
    </div>
  );
};

export default InviteContextBanner;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd fe-next && npx vitest run components/onboarding/__tests__/InviteContextBanner.test.tsx
```

Expected: PASS — 3/3 (assumes Task 11 i18n keys are in place; if running in isolation, the tests may use raw key strings — that's acceptable for the unit-test gate).

- [ ] **Step 5: Commit**

```bash
cd fe-next && git add components/onboarding/InviteContextBanner.tsx components/onboarding/__tests__/InviteContextBanner.test.tsx
git commit -m "feat(invite): InviteContextBanner — pink sticky banner with host + skip CTA"
```

---

## Task 5: `QuickProfileSetup` accepts `inviteContext`

**Files:**
- Modify: `fe-next/components/onboarding/QuickProfileSetup.tsx`

Existing component already accepts `hasPendingInvite` boolean. Add `inviteContext?: { roomCode, hostName? }` and `onSkipInvite?: () => void` props; render `InviteContextBanner` above the form when both are set.

- [ ] **Step 1: Write failing test**

Append to `fe-next/components/onboarding/__tests__/QuickProfileSetup.test.tsx`:

```tsx
import InviteContextBanner from '@/components/onboarding/InviteContextBanner';

describe('QuickProfileSetup invite mode', () => {
  it('renders InviteContextBanner when inviteContext is provided', () => {
    render(
      <LanguageProvider>
        <QuickProfileSetup
          onComplete={() => {}}
          hasPendingInvite
          inviteContext={{ roomCode: 'ABC123', hostName: 'Alice' }}
          onSkipInvite={() => {}}
        />
      </LanguageProvider>,
    );
    expect(screen.getByTestId('invite-banner')).toBeInTheDocument();
    expect(screen.getByText(/ABC123/)).toBeInTheDocument();
  });

  it('does NOT render banner when inviteContext absent', () => {
    render(
      <LanguageProvider>
        <QuickProfileSetup onComplete={() => {}} />
      </LanguageProvider>,
    );
    expect(screen.queryByTestId('invite-banner')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd fe-next && npx vitest run components/onboarding/__tests__/QuickProfileSetup.test.tsx -t "invite mode"
```

Expected: FAIL — banner not rendered.

- [ ] **Step 3: Implement extension**

Add to the `QuickProfileSetup` props interface and component:

```tsx
import InviteContextBanner from './InviteContextBanner';

interface QuickProfileSetupProps {
  // ...existing props...
  hasPendingInvite?: boolean;
  inviteContext?: { roomCode: string; hostName?: string };
  onSkipInvite?: () => void;
}

// Inside the component's returned JSX, render at the top of the root element:
{inviteContext && onSkipInvite && (
  <InviteContextBanner
    roomCode={inviteContext.roomCode}
    hostName={inviteContext.hostName}
    onSkip={onSkipInvite}
  />
)}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd fe-next && npx vitest run components/onboarding/__tests__/QuickProfileSetup.test.tsx
```

Expected: PASS — including all pre-existing QuickProfileSetup tests.

- [ ] **Step 5: Commit**

```bash
cd fe-next && git add components/onboarding/QuickProfileSetup.tsx components/onboarding/__tests__/QuickProfileSetup.test.tsx
git commit -m "feat(invite): QuickProfileSetup renders InviteContextBanner when inviteContext set"
```

---

## Task 6: `InviteTutorialTeaser` component

**Files:**
- Create: `fe-next/components/onboarding/InviteTutorialTeaser.tsx`
- Create: `fe-next/components/onboarding/__tests__/InviteTutorialTeaser.test.tsx`

Single-screen interactive demo. Preset 4-cell letter row `['C','A','T','S']` (first iteration — playtest-tunable later, see spec out-of-scope). User taps tiles to spell any valid English word ≥3 letters from the dictionary, OR taps Skip in the banner. On a valid word: confetti pulse + "+10 nice!" toast (reduced-motion gated) + auto-advance after 1.2s via `onComplete()`. Dictionary check uses the existing client-side `validateWordClient` from `lib/clientWordValidator` — confirm import path during impl.

- [ ] **Step 1: Write failing test**

Create `fe-next/components/onboarding/__tests__/InviteTutorialTeaser.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import InviteTutorialTeaser from '@/components/onboarding/InviteTutorialTeaser';
import { LanguageProvider } from '@/contexts/LanguageContext';

vi.mock('@/lib/clientWordValidator', () => ({
  validateWordClient: vi.fn((w: string) => Promise.resolve(['CAT','CATS','AT','AS'].includes(w.toUpperCase()))),
}));

const setup = (overrides: Partial<React.ComponentProps<typeof InviteTutorialTeaser>> = {}) => {
  const props = {
    roomCode: 'ABC123',
    hostName: 'Alice',
    onComplete: vi.fn(),
    onSkip: vi.fn(),
    ...overrides,
  };
  render(
    <LanguageProvider>
      <InviteTutorialTeaser {...props} />
    </LanguageProvider>,
  );
  return props;
};

describe('InviteTutorialTeaser', () => {
  beforeEach(() => vi.useFakeTimers());

  it('renders preset 4-letter board and prompt', () => {
    setup();
    expect(screen.getByTestId('teaser-tile-C')).toBeInTheDocument();
    expect(screen.getByTestId('teaser-tile-A')).toBeInTheDocument();
    expect(screen.getByTestId('teaser-tile-T')).toBeInTheDocument();
    expect(screen.getByTestId('teaser-tile-S')).toBeInTheDocument();
  });

  it('always shows skip CTA in banner', () => {
    setup();
    expect(screen.getByTestId('invite-banner-skip')).toBeInTheDocument();
  });

  it('skip CTA fires onSkip', () => {
    const { onSkip } = setup();
    fireEvent.click(screen.getByTestId('invite-banner-skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('finding any valid word fires onComplete after 1.2s', async () => {
    const { onComplete } = setup();
    fireEvent.click(screen.getByTestId('teaser-tile-C'));
    fireEvent.click(screen.getByTestId('teaser-tile-A'));
    fireEvent.click(screen.getByTestId('teaser-tile-T'));
    fireEvent.click(screen.getByTestId('teaser-submit'));
    await act(async () => { await Promise.resolve(); });
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1200); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid words without firing onComplete', async () => {
    const { onComplete } = setup();
    // 'TC' is not in mocked dictionary
    fireEvent.click(screen.getByTestId('teaser-tile-T'));
    fireEvent.click(screen.getByTestId('teaser-tile-C'));
    fireEvent.click(screen.getByTestId('teaser-submit'));
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(onComplete).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd fe-next && npx vitest run components/onboarding/__tests__/InviteTutorialTeaser.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement component**

Create `fe-next/components/onboarding/InviteTutorialTeaser.tsx`:

```tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { validateWordClient } from '@/lib/clientWordValidator';
import InviteContextBanner from './InviteContextBanner';

interface Props {
  roomCode: string;
  hostName?: string;
  onComplete: () => void;
  onSkip: () => void;
}

const TEASER_LETTERS = ['C', 'A', 'T', 'S'] as const;
const ADVANCE_DELAY_MS = 1200;

/**
 * One-moment interactive demo for first-time invitees. Preset 4-letter row.
 * Tap to spell, submit. First valid word → +10 celebration → auto-advance to
 * the room. Skip is always one tap away in the sticky banner.
 */
const InviteTutorialTeaser: React.FC<Props> = ({ roomCode, hostName, onComplete, onSkip }) => {
  const { t, dir } = useLanguage();
  const [selected, setSelected] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'idle' | 'invalid' | 'celebrating'>('idle');

  const word = selected.map((i) => TEASER_LETTERS[i]).join('');

  const handleTap = useCallback((idx: number) => {
    if (feedback === 'celebrating') return;
    setSelected((cur) => (cur.includes(idx) ? cur : [...cur, idx]));
  }, [feedback]);

  const handleClear = useCallback(() => {
    setSelected([]);
    setFeedback('idle');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (word.length < 3) {
      setFeedback('invalid');
      return;
    }
    const valid = await validateWordClient(word, 'en');
    if (!valid) {
      setFeedback('invalid');
      return;
    }
    setFeedback('celebrating');
  }, [word]);

  // Auto-advance once celebrating
  useEffect(() => {
    if (feedback !== 'celebrating') return;
    const id = setTimeout(onComplete, ADVANCE_DELAY_MS);
    return () => clearTimeout(id);
  }, [feedback, onComplete]);

  return (
    <div dir={dir} className="flex flex-col w-full max-w-md mx-auto">
      <InviteContextBanner roomCode={roomCode} hostName={hostName} onSkip={onSkip} />

      <div className="px-6 py-8 flex flex-col items-center gap-6">
        <h2 className="text-xl font-neo-display font-black text-neo-cream uppercase tracking-wide text-center">
          {t('invite.tutorial.prompt')}
        </h2>

        <div
          data-testid="teaser-board"
          className="flex gap-2"
          role="group"
          aria-label={t('invite.tutorial.prompt')}
        >
          {TEASER_LETTERS.map((letter, idx) => {
            const isSelected = selected.includes(idx);
            return (
              <button
                key={idx}
                data-testid={`teaser-tile-${letter}`}
                type="button"
                onClick={() => handleTap(idx)}
                aria-pressed={isSelected}
                className={`min-w-[64px] min-h-[64px] rounded-neo border-neo-thick font-neo-display font-black text-2xl uppercase shadow-hard transition-transform active:translate-y-px ${
                  isSelected ? 'bg-neo-lime text-neo-black' : 'bg-neo-navy-light text-neo-cream'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>

        <p
          data-testid="teaser-current-word"
          className="font-mono text-xl text-neo-cream min-h-[2rem]"
          aria-live="polite"
        >
          {word || '—'}
        </p>

        <div className="flex gap-3">
          <button
            data-testid="teaser-clear"
            type="button"
            onClick={handleClear}
            className="px-4 py-2 rounded-neo border-2 border-neo-cream/30 text-neo-cream/80 font-neo-display text-sm uppercase tracking-wide active:translate-y-px"
          >
            {t('invite.tutorial.clear')}
          </button>
          <button
            data-testid="teaser-submit"
            type="button"
            onClick={handleSubmit}
            disabled={selected.length < 3 || feedback === 'celebrating'}
            className="px-5 py-2 rounded-neo border-neo-thick bg-neo-lime text-neo-black font-neo-display font-black text-sm uppercase tracking-wide shadow-hard active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('invite.tutorial.submit')}
          </button>
        </div>

        {feedback === 'invalid' && (
          <p data-testid="teaser-invalid" className="text-neo-red font-neo-body text-sm">
            {t('invite.tutorial.invalid')}
          </p>
        )}

        {feedback === 'celebrating' && (
          <AdaptiveMotion.div
            data-testid="teaser-celebrate"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="px-4 py-2 rounded-neo bg-neo-lime text-neo-black font-neo-display font-black uppercase shadow-hard"
            role="status"
            aria-live="assertive"
          >
            {t('invite.tutorial.celebrate', { hostName: hostName || t('invite.banner.yourFriend') })}
          </AdaptiveMotion.div>
        )}
      </div>
    </div>
  );
};

export default InviteTutorialTeaser;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd fe-next && npx vitest run components/onboarding/__tests__/InviteTutorialTeaser.test.tsx
```

Expected: PASS — 5/5.

- [ ] **Step 5: Commit**

```bash
cd fe-next && git add components/onboarding/InviteTutorialTeaser.tsx components/onboarding/__tests__/InviteTutorialTeaser.test.tsx
git commit -m "feat(invite): InviteTutorialTeaser — one-board interactive demo"
```

---

## Task 7: `OnboardingFlow` invite-mode branch

**Files:**
- Modify: `fe-next/components/onboarding/OnboardingFlow.tsx`

When `hasPendingRoomInvite()` is truthy at mount, switch to a 3-step invite path: `language → profile → inviteTutorial`. Skip `returningUser` (the user already has a destination), `tutorial` (replaced by teaser), and `scoreReveal` (no point — go straight to room). The non-invite 5-step flow stays untouched (covered by regression test).

- [ ] **Step 1: Write failing test**

Create `fe-next/components/onboarding/__tests__/OnboardingFlow.invite.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { savePendingRoomInvite } from '@/utils/onboardingStorage';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: false }) }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }) }));

describe('OnboardingFlow invite mode', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    pushMock.mockClear();
  });

  it('starts at language step in invite mode', () => {
    savePendingRoomInvite('ABC123', 'Alice');
    render(<LanguageProvider><OnboardingFlow onComplete={() => {}} /></LanguageProvider>);
    expect(screen.getByTestId('onboarding-language-step')).toBeInTheDocument();
  });

  it('skips returningUser step in invite mode', () => {
    savePendingRoomInvite('ABC123', 'Alice');
    render(<LanguageProvider><OnboardingFlow onComplete={() => {}} /></LanguageProvider>);
    fireEvent.click(screen.getByTestId('language-en'));
    // Should land on profile, NOT returningUser
    expect(screen.queryByTestId('returning-user-step')).not.toBeInTheDocument();
    expect(screen.getByTestId('quick-profile-setup')).toBeInTheDocument();
  });

  it('non-invite mode preserves 5-step path including returningUser', () => {
    render(<LanguageProvider><OnboardingFlow onComplete={() => {}} /></LanguageProvider>);
    fireEvent.click(screen.getByTestId('language-en'));
    expect(screen.getByTestId('returning-user-step')).toBeInTheDocument();
  });

  it('skip CTA from teaser routes to /multiplayer?room=…', async () => {
    savePendingRoomInvite('ABC123', 'Alice');
    render(<LanguageProvider><OnboardingFlow onComplete={() => {}} /></LanguageProvider>);
    // Walk through language → profile (mocked submit) → teaser → tap skip
    // Detailed step-walk wiring deferred to E2E (Task 13) — this unit test
    // asserts only the routing on direct skip-from-tutorial path:
    fireEvent.click(screen.getByTestId('language-en'));
    // Profile step: type + submit (use existing test ids in QuickProfileSetup)
    fireEvent.change(screen.getByTestId('profile-name-input'), { target: { value: 'Bob' } });
    fireEvent.click(screen.getByTestId('profile-submit'));
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByTestId('invite-banner-skip'));
    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('/multiplayer?room=ABC123'));
  });
});
```

> **Note for implementer:** The test ids `onboarding-language-step`, `language-en`, `returning-user-step`, `quick-profile-setup`, `profile-name-input`, `profile-submit` may need to be added to existing components if not present. Add them as part of this task's implementation step. If a referenced test id doesn't exist, find the equivalent element by accessible role/text and adapt the assertion — do not fabricate behaviour.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd fe-next && npx vitest run components/onboarding/__tests__/OnboardingFlow.invite.test.tsx
```

Expected: FAIL — invite mode not implemented.

- [ ] **Step 3: Implement branch**

Edit `fe-next/components/onboarding/OnboardingFlow.tsx`:

(a) Update `FlowStep` type and add an invite-mode STEPS constant:

```tsx
type FlowStep = 'returningUser' | 'language' | 'tutorial' | 'profile' | 'scoreReveal' | 'inviteTutorial';

const STEPS: FlowStep[] = ['language', 'returningUser', 'tutorial', 'profile', 'scoreReveal'];
const INVITE_STEPS: FlowStep[] = ['language', 'profile', 'inviteTutorial'];
```

(b) Add `inviteTutorial` to STEP_ACCENTS:

```tsx
const STEP_ACCENTS: Record<FlowStep, { color1: string; color2: string }> = {
  // ...existing keys...
  inviteTutorial: { color1: 'rgba(255,20,147,0.10)', color2: 'rgba(0,255,255,0.05)' },
};
```

(c) Inside the component, capture invite mode at mount and select STEPS:

```tsx
const inviteAtMountRef = useRef<{code: string; hostName?: string} | null>(null);
const [isInviteMode] = useState(() => {
  const inv = getPendingRoomInvite();
  if (inv) inviteAtMountRef.current = inv;
  return !!inv;
});
const activeSteps = isInviteMode ? INVITE_STEPS : STEPS;
```

(Add `getPendingRoomInvite` to imports from `@/utils/onboardingStorage`.)

(d) Update `handleLanguageSelect` to skip `returningUser` in invite mode (CG branch already short-circuits):

```tsx
const handleLanguageSelect = useCallback(() => {
  recordStep('language');
  if (isOnCrazyGamesPlatform) { setStep('tutorial'); return; }
  if (isInviteMode) { setStep('profile'); return; }
  setStep('returningUser');
}, [isOnCrazyGamesPlatform, isInviteMode, recordStep]);
```

(e) Update `handleProfileComplete` to advance to `inviteTutorial` instead of redirecting in invite mode:

```tsx
// Replace the existing if (pendingInvite) { ... } block:
if (pendingInvite && isInviteMode) {
  // Profile saved; user now plays the one-moment teaser before joining the room.
  // Navigation happens after teaser complete OR skip.
  setStep('inviteTutorial');
  return;
}
```

(f) Add a teaser-complete handler that consumes the invite and routes:

```tsx
const handleInviteTeaserComplete = useCallback(() => {
  if (isNavigating) return;
  setIsNavigating(true);
  markOnboardingComplete({
    avatarId: 'custom',
    displayName: playerName || 'Player',
    selectedMode: 'multi',
    nameEdited: playerNameEditedRef.current,
  });
  const roomCode = consumePendingRoomInvite();
  router.push(`/${language}/multiplayer?room=${roomCode}`);
  emitCompleted({ via: 'invite_tutorial' });
  onComplete();
}, [isNavigating, language, router, onComplete, playerName, emitCompleted]);
```

(g) Add a case to `renderStep`:

```tsx
case 'inviteTutorial': {
  const ctx = inviteAtMountRef.current;
  if (!ctx) { handleSkipOnboarding(); return null; }
  return (
    <InviteTutorialTeaser
      roomCode={ctx.code}
      hostName={ctx.hostName}
      onComplete={handleInviteTeaserComplete}
      onSkip={handleSkipOnboarding}
    />
  );
}
```

Add `import InviteTutorialTeaser from './InviteTutorialTeaser';` to the imports.

(h) Pass `inviteContext` + `onSkipInvite` to `QuickProfileSetup` when in invite mode:

```tsx
case 'profile':
  return (
    <QuickProfileSetup
      onComplete={handleProfileComplete}
      hasPendingInvite={hasPendingRoomInvite()}
      inviteContext={isInviteMode && inviteAtMountRef.current
        ? { roomCode: inviteAtMountRef.current.code, hostName: inviteAtMountRef.current.hostName }
        : undefined}
      onSkipInvite={isInviteMode ? handleSkipOnboarding : undefined}
    />
  );
```

(i) Update progress component to use `activeSteps.length`:

```tsx
<OnboardingProgress currentStep={activeSteps.indexOf(step)} totalSteps={activeSteps.length} />
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd fe-next && npx vitest run components/onboarding/__tests__/OnboardingFlow
```

Expected: PASS — invite mode tests + all pre-existing OnboardingFlow tests.

- [ ] **Step 5: Commit**

```bash
cd fe-next && git add components/onboarding/OnboardingFlow.tsx components/onboarding/__tests__/OnboardingFlow.invite.test.tsx
git commit -m "feat(invite): OnboardingFlow 3-step invite-mode branch (language→profile→teaser)"
```

---

## Task 8: `PendingRoomBanner` component

**Files:**
- Create: `fe-next/components/practice/PendingRoomBanner.tsx`
- Create: `fe-next/components/practice/__tests__/PendingRoomBanner.test.tsx`

Practice-hub fallback banner shown to users who have a pending invite but landed on `/practice` (e.g. they hit the existing tutorial-step skip pre-feature, or browsed away from the invite). Pink, dismissible per session, click consumes invite + navigates to the room.

- [ ] **Step 1: Write failing tests**

Create `fe-next/components/practice/__tests__/PendingRoomBanner.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PendingRoomBanner from '@/components/practice/PendingRoomBanner';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { savePendingRoomInvite } from '@/utils/onboardingStorage';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

const wrap = (ui: React.ReactNode) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe('PendingRoomBanner', () => {
  beforeEach(() => {
    sessionStorage.clear();
    pushMock.mockClear();
  });

  it('does not render when no invite pending', () => {
    wrap(<PendingRoomBanner locale="en" />);
    expect(screen.queryByTestId('pending-room-banner')).not.toBeInTheDocument();
  });

  it('renders host + code when invite pending', () => {
    savePendingRoomInvite('ABC123', 'Alice');
    wrap(<PendingRoomBanner locale="en" />);
    expect(screen.getByTestId('pending-room-banner')).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/ABC123/)).toBeInTheDocument();
  });

  it('click CTA navigates to MP room', () => {
    savePendingRoomInvite('ABC123', 'Alice');
    wrap(<PendingRoomBanner locale="en" />);
    fireEvent.click(screen.getByTestId('pending-room-banner-cta'));
    expect(pushMock).toHaveBeenCalledWith('/en/multiplayer?room=ABC123');
  });

  it('dismiss hides for session', () => {
    savePendingRoomInvite('ABC123', 'Alice');
    const { rerender } = wrap(<PendingRoomBanner locale="en" />);
    fireEvent.click(screen.getByTestId('pending-room-banner-dismiss'));
    rerender(<LanguageProvider><PendingRoomBanner locale="en" /></LanguageProvider>);
    expect(screen.queryByTestId('pending-room-banner')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd fe-next && npx vitest run components/practice/__tests__/PendingRoomBanner.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement component**

Create `fe-next/components/practice/PendingRoomBanner.tsx`:

```tsx
'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInviteContext } from '@/hooks/useInviteContext';
import { consumePendingRoomInvite } from '@/utils/onboardingStorage';

const DISMISS_KEY = 'lexiclash_invite_banner_dismissed';

interface Props {
  locale: string;
}

/**
 * Practice-hub fallback. Pink dismissible banner shown when user has a
 * pending MP-room invite but landed on /practice. Tap CTA to consume the
 * invite + navigate; dismiss persists for current session only.
 */
const PendingRoomBanner: React.FC<Props> = ({ locale }) => {
  const { t } = useLanguage();
  const router = useRouter();
  const invite = useInviteContext();
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1',
  );

  const handleClick = useCallback(() => {
    const code = consumePendingRoomInvite();
    if (code) router.push(`/${locale}/multiplayer?room=${code}`);
  }, [locale, router]);

  const handleDismiss = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }, []);

  if (!invite || dismissed) return null;

  const displayName = invite.hostName?.trim() || t('invite.banner.yourFriend');

  return (
    <div
      data-testid="pending-room-banner"
      className="mb-4 rounded-neo border-neo-thick bg-neo-pink text-neo-black shadow-hard px-4 py-3 flex items-center justify-between gap-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex-1 min-w-0">
        <p className="font-neo-display font-black text-sm uppercase tracking-wide truncate">
          <span aria-hidden>👋 </span>
          {t('invite.practice.banner', { hostName: displayName, code: invite.code })}
        </p>
      </div>
      <button
        data-testid="pending-room-banner-cta"
        type="button"
        onClick={handleClick}
        className="shrink-0 min-h-[40px] px-3 py-2 rounded-neo bg-neo-black text-neo-pink border-2 border-neo-black font-neo-display font-black text-xs uppercase tracking-wide active:translate-y-px"
      >
        {t('invite.banner.skipCTA')}
      </button>
      <button
        data-testid="pending-room-banner-dismiss"
        type="button"
        onClick={handleDismiss}
        aria-label={t('invite.practice.dismissAria')}
        className="shrink-0 min-h-[40px] min-w-[40px] text-neo-black/70 hover:text-neo-black font-neo-display font-black text-lg"
      >
        ×
      </button>
    </div>
  );
};

export default PendingRoomBanner;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd fe-next && npx vitest run components/practice/__tests__/PendingRoomBanner.test.tsx
```

Expected: PASS — 4/4.

- [ ] **Step 5: Commit**

```bash
cd fe-next && git add components/practice/PendingRoomBanner.tsx components/practice/__tests__/PendingRoomBanner.test.tsx
git commit -m "feat(invite): PendingRoomBanner — practice-hub fallback for invite recovery"
```

---

## Task 9: Mount banner on Practice hub

**Files:**
- Modify: `fe-next/app/[locale]/practice/PageClient.tsx:38-52`

- [ ] **Step 1: Write failing test**

Append to `fe-next/app/[locale]/practice/__tests__/PageClient.test.tsx` (create if not present):

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PracticeHubClient from '@/app/[locale]/practice/PageClient';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { savePendingRoomInvite } from '@/utils/onboardingStorage';

describe('PracticeHubClient invite banner', () => {
  beforeEach(() => sessionStorage.clear());

  it('shows banner when invite pending', () => {
    savePendingRoomInvite('ABC123', 'Alice');
    render(<LanguageProvider><PracticeHubClient locale="en" /></LanguageProvider>);
    expect(screen.getByTestId('pending-room-banner')).toBeInTheDocument();
  });

  it('hides banner when no invite', () => {
    render(<LanguageProvider><PracticeHubClient locale="en" /></LanguageProvider>);
    expect(screen.queryByTestId('pending-room-banner')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd fe-next && npx vitest run "app/[locale]/practice/__tests__/PageClient.test.tsx"
```

Expected: FAIL — banner not mounted.

- [ ] **Step 3: Implement mount**

In `fe-next/app/[locale]/practice/PageClient.tsx`, add import and place the banner above the title:

```tsx
import PendingRoomBanner from '@/components/practice/PendingRoomBanner';

// ...inside the JSX, immediately above the AdaptiveMotion.div title block (line ~40):
<PendingRoomBanner locale={locale} />
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd fe-next && npx vitest run "app/[locale]/practice/__tests__/PageClient.test.tsx"
```

Expected: PASS — 2/2.

- [ ] **Step 5: Commit**

```bash
cd fe-next && git add "app/[locale]/practice/PageClient.tsx" "app/[locale]/practice/__tests__/PageClient.test.tsx"
git commit -m "feat(invite): mount PendingRoomBanner on practice hub"
```

---

## Task 10: `getJoinUrl` extends with `hostName`

**Files:**
- Modify: `fe-next/utils/share.ts:46-61`

Append `host={encoded}` to the generated invite URL when the caller passes a host name. All existing call sites continue to work — the parameter is optional, last in the signature.

- [ ] **Step 1: Write failing test**

Append to `fe-next/utils/share.test.ts` (create if not present):

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getJoinUrl } from '@/utils/share';

describe('getJoinUrl host param', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://lexiclash.live', pathname: '/en/multiplayer' },
      writable: true,
    });
  });

  it('appends URL-encoded host when provided', () => {
    const url = getJoinUrl('ABC123', 'whatsapp', "Alice O'Connor");
    expect(url).toContain("host=Alice%20O'Connor".replace("'", '%27'));
    expect(url).toContain('room=ABC123');
  });

  it('omits host param when undefined', () => {
    const url = getJoinUrl('ABC123', 'whatsapp');
    expect(url).not.toContain('host=');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd fe-next && npx vitest run utils/share.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement extension**

Replace `fe-next/utils/share.ts` lines 46-61 with:

```ts
export const getJoinUrl = (gameCode: string, utmSource?: string, hostName?: string): string => {
  if (typeof window === 'undefined') return '';
  if (!gameCode) return '';
  const origin = window.location.origin;
  const localeMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
  const locale = localeMatch?.[1] || 'en';
  const params = new URLSearchParams();
  params.set('room', gameCode);
  if (utmSource) {
    params.set('utm_source', utmSource);
    params.set('utm_medium', 'referral');
    params.set('utm_campaign', 'player_invite');
  }
  if (hostName && hostName.trim()) {
    params.set('host', hostName.trim().slice(0, 24));
  }
  return `${origin}/${locale}?${params.toString()}`;
};
```

Then update call sites in `fe-next/components/modals/UnifiedShareModal.tsx` to pass the local user's display name. Read the modal's existing user-name source (the modal already has access to identity via context — find with `grep -n "displayName\|playerName\|username" fe-next/components/modals/UnifiedShareModal.tsx`) and pass as third argument:

```tsx
const joinUrl = getJoinUrl(gameCode, isPostGame ? 'share-win' : 'modal-share', localUserDisplayName);
```

If no clean source of the local display name is available in the modal, defer this wiring to a follow-up task — the URL builder change is the gating piece. Document the deferral in the commit message.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd fe-next && npx vitest run utils/share.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd fe-next && git add utils/share.ts utils/share.test.ts components/modals/UnifiedShareModal.tsx
git commit -m "feat(invite): getJoinUrl appends ?host= so recipient sees inviter's name"
```

---

## Task 11: i18n keys × 5 locales

**Files:**
- Modify: `fe-next/translations/en.js`, `he.js`, `sv.js`, `ja.js`, `es.js`

Add the `invite.*` namespace next to `onboarding.*` (around `en.js:1882`). HE/SV/JA/ES values must be flagged for native review per project pattern (memory entry: "Practice fun+smooth sprint 2026-05-03 — HE/SV/JA/ES strings flagged for native review"). Use `{var}` interpolation, NOT `{{var}}` (memory entry: "Translation `{{var}}` replace broken").

- [ ] **Step 1: Add keys to `en.js`**

Locate the `"onboarding": { ... }` block. Insert a sibling block (alphabetised by key — `invite` sorts after `inGame`/before `journey`, adjust to local order):

```js
"invite": {
  "banner": {
    "host": "{hostName} is waiting in",
    "yourFriend": "Your friend",
    "skipCTA": "Skip & Join now"
  },
  "profile": {
    "header": "Joining {hostName}'s room"
  },
  "tutorial": {
    "prompt": "Drag letters to make a word",
    "submit": "Submit",
    "clear": "Clear",
    "invalid": "Try a different word",
    "celebrate": "Nice! Joining {hostName}…"
  },
  "practice": {
    "banner": "{hostName} is waiting in {code}",
    "dismissAria": "Dismiss invite"
  },
  "toast": {
    "expired": "This invite has expired",
    "notFound": "Room {code} is no longer available"
  }
},
```

- [ ] **Step 2: Add keys to `he.js`**, `sv.js`, `ja.js`, `es.js`

Use these draft translations (FLAG ALL FOR NATIVE REVIEW in the commit message):

```
he.js:
"invite": {
  "banner": { "host": "{hostName} מחכה ב", "yourFriend": "החבר שלך", "skipCTA": "דלג והצטרף" },
  "profile": { "header": "מצטרף לחדר של {hostName}" },
  "tutorial": { "prompt": "גרור אותיות כדי ליצור מילה", "submit": "שלח", "clear": "נקה", "invalid": "נסה מילה אחרת", "celebrate": "יופי! מצטרף ל-{hostName}…" },
  "practice": { "banner": "{hostName} מחכה ב-{code}", "dismissAria": "סגור הזמנה" },
  "toast": { "expired": "ההזמנה פגה", "notFound": "החדר {code} כבר לא זמין" }
},

sv.js:
"invite": {
  "banner": { "host": "{hostName} väntar i", "yourFriend": "Din kompis", "skipCTA": "Hoppa över och gå med" },
  "profile": { "header": "Går med i {hostName}s rum" },
  "tutorial": { "prompt": "Dra bokstäver för att skapa ett ord", "submit": "Skicka", "clear": "Rensa", "invalid": "Prova ett annat ord", "celebrate": "Snyggt! Går med {hostName}…" },
  "practice": { "banner": "{hostName} väntar i {code}", "dismissAria": "Avvisa inbjudan" },
  "toast": { "expired": "Inbjudan har gått ut", "notFound": "Rummet {code} finns inte längre" }
},

ja.js:
"invite": {
  "banner": { "host": "{hostName}さんが待っています:", "yourFriend": "お友達", "skipCTA": "スキップして参加" },
  "profile": { "header": "{hostName}さんのルームに参加中" },
  "tutorial": { "prompt": "文字をドラッグして単語を作ろう", "submit": "送信", "clear": "クリア", "invalid": "別の単語を試して", "celebrate": "やった！{hostName}さんに参加中…" },
  "practice": { "banner": "{hostName}さんが {code} で待っています", "dismissAria": "招待を閉じる" },
  "toast": { "expired": "この招待は期限切れです", "notFound": "ルーム {code} はもう利用できません" }
},

es.js:
"invite": {
  "banner": { "host": "{hostName} te espera en", "yourFriend": "Tu amigo", "skipCTA": "Saltar y unirme" },
  "profile": { "header": "Uniéndote a la sala de {hostName}" },
  "tutorial": { "prompt": "Arrastra letras para formar una palabra", "submit": "Enviar", "clear": "Borrar", "invalid": "Prueba otra palabra", "celebrate": "¡Bien! Uniéndote a {hostName}…" },
  "practice": { "banner": "{hostName} te espera en {code}", "dismissAria": "Descartar invitación" },
  "toast": { "expired": "Esta invitación ha caducado", "notFound": "La sala {code} ya no está disponible" }
},
```

- [ ] **Step 3: Verify build + lint pass**

```bash
cd fe-next && npm run lint && npm run build
```

Expected: PASS — no missing-key warnings.

- [ ] **Step 4: Commit**

```bash
cd fe-next && git add translations/en.js translations/he.js translations/sv.js translations/ja.js translations/es.js
git commit -m "i18n(invite): add invite.* namespace × 5 locales (HE/SV/JA/ES need native review)"
```

---

## Task 12: Telemetry events

**Files:**
- Modify: `fe-next/utils/growthTracking.ts` (or whichever exposes the existing `trackOnboardingStart` etc. — verify by grep)
- Modify: `fe-next/components/onboarding/OnboardingFlow.tsx`
- Modify: `fe-next/components/onboarding/InviteTutorialTeaser.tsx`
- Modify: `fe-next/app/[locale]/PageClient.tsx`
- Modify: `fe-next/components/practice/PendingRoomBanner.tsx`

Wire 6 PostHog events (per spec). All event names use snake_case to match existing PostHog conventions in this project.

- [ ] **Step 1: Add tracking helpers**

Add to `fe-next/utils/growthTracking.ts`:

```ts
export const trackInviteLanded = (props: { roomCode: string; hasHostName: boolean; isFirstTimeUser: boolean }) =>
  posthog?.capture('invite_landed', props);

export const trackInviteTutorialStarted = (props: { roomCode: string }) =>
  posthog?.capture('invite_tutorial_started', props);

export const trackInviteTutorialWordFound = (props: { roomCode: string; word: string; secondsSinceStart: number }) =>
  posthog?.capture('invite_tutorial_word_found', props);

export const trackInviteTutorialSkipped = (props: { roomCode: string; step: 'profile' | 'tutorial'; secondsSinceLanded: number }) =>
  posthog?.capture('invite_tutorial_skipped', props);

export const trackInviteConsumed = (props: { roomCode: string; path: 'tutorial' | 'skip'; totalSeconds: number }) =>
  posthog?.capture('invite_consumed', props);

export const trackPracticePendingBannerClicked = (props: { roomCode: string; secondsOnPracticeHub: number }) =>
  posthog?.capture('practice_pending_banner_clicked', props);
```

(Confirm the `posthog?.capture` pattern matches existing helpers in the file — match the established style.)

- [ ] **Step 2: Wire each event at its call site**

| Event | Call site |
|-------|-----------|
| `invite_landed` | `app/[locale]/PageClient.tsx` immediately after `savePendingRoomInvite(...)` |
| `invite_tutorial_started` | `InviteTutorialTeaser.tsx` inside `useEffect(() => { ... }, [])` at mount |
| `invite_tutorial_word_found` | `InviteTutorialTeaser.tsx` inside `handleSubmit` after a valid word — capture seconds via a ref initialised at mount |
| `invite_tutorial_skipped` | `OnboardingFlow.handleSkipOnboarding` when `isInviteMode` — pass `step` derived from current `step` value |
| `invite_consumed` | `OnboardingFlow.handleInviteTeaserComplete` (`path: 'tutorial'`) and `handleSkipOnboarding` when invite mode (`path: 'skip'`) |
| `practice_pending_banner_clicked` | `PendingRoomBanner.handleClick` before `router.push` |

For `secondsSinceLanded`/`totalSeconds`, store the landed timestamp in `sessionStorage.setItem('invite_landed_ts', String(Date.now()))` at the same time `savePendingRoomInvite` is called, then compute deltas at fire time.

- [ ] **Step 3: Lint + run all unit tests**

```bash
cd fe-next && npm run lint && npx vitest run
```

Expected: PASS — no regressions.

- [ ] **Step 4: Commit**

```bash
cd fe-next && git add utils/growthTracking.ts components/onboarding/OnboardingFlow.tsx components/onboarding/InviteTutorialTeaser.tsx "app/[locale]/PageClient.tsx" components/practice/PendingRoomBanner.tsx
git commit -m "feat(invite): PostHog telemetry — 6 events covering invite funnel"
```

---

## Task 13: E2E happy path

**Files:**
- Create: `fe-next/e2e/invite-onboarding.spec.ts`

Single end-to-end Playwright test of the golden path: land with `?room=&host=`, complete profile, do the teaser, arrive at the MP page.

- [ ] **Step 1: Write E2E spec**

Create `fe-next/e2e/invite-onboarding.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('invite onboarding — first-time user joins via teaser', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/en?room=ABC123&host=Alice');

  // Onboarding mounted
  await expect(page.getByTestId('onboarding-flow')).toBeVisible();

  // Language → English
  await page.getByTestId('language-en').click();

  // Profile step shows InviteContextBanner with host + code
  await expect(page.getByTestId('invite-banner')).toContainText('Alice');
  await expect(page.getByTestId('invite-banner')).toContainText('ABC123');

  // Fill profile and submit
  await page.getByTestId('profile-name-input').fill('Bob');
  await page.getByTestId('profile-submit').click();

  // Teaser visible
  await expect(page.getByTestId('teaser-board')).toBeVisible();

  // Find a valid word: CAT
  await page.getByTestId('teaser-tile-C').click();
  await page.getByTestId('teaser-tile-A').click();
  await page.getByTestId('teaser-tile-T').click();
  await page.getByTestId('teaser-submit').click();

  // Arrives at multiplayer with the room code
  await expect(page).toHaveURL(/\/multiplayer\?room=ABC123/, { timeout: 5000 });
});

test('invite onboarding — skip CTA arrives at room without teaser', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/en?room=ABC123&host=Alice');
  await page.getByTestId('language-en').click();
  await page.getByTestId('profile-name-input').fill('Bob');
  await page.getByTestId('profile-submit').click();
  await page.getByTestId('invite-banner-skip').click();
  await expect(page).toHaveURL(/\/multiplayer\?room=ABC123/, { timeout: 5000 });
});
```

- [ ] **Step 2: Run E2E**

```bash
cd fe-next && npm run test:e2e -- invite-onboarding.spec.ts
```

Expected: PASS — 2/2.

- [ ] **Step 3: Commit**

```bash
cd fe-next && git add e2e/invite-onboarding.spec.ts
git commit -m "test(e2e): invite onboarding happy-path + skip-CTA"
```

---

## Final verification

- [ ] **Run full lint, type-check, test, build**

```bash
cd fe-next && npm run lint && npm run test && npm run build
```

Expected: 0 errors, 0 type errors, all tests pass, build green.

- [ ] **Manual smoke (dev server is on port 3001 — see memory)**

```bash
cd fe-next && npm run dev
```

Then in browser:
1. `http://localhost:3001/en?room=TEST01&host=Alice` — onboarding flow with banner.
2. `http://localhost:3001/he?room=TEST01&host=דנה` — RTL banner mirrors correctly.
3. After completing, navigate back to `http://localhost:3001/en/practice` (with a fresh invite seeded via devtools `sessionStorage.setItem('lexiclash_pending_room_invite', JSON.stringify({code:'TEST01',hostName:'Alice',ts:Date.now()}))`) → banner appears.

- [ ] **Final commit (if any cleanup) — push when ready**

```bash
cd fe-next && git status   # confirm clean
git push origin master    # ASK USER FIRST per project rule 10-git.md
```

---

## Self-Review

**Spec coverage** (each spec section → covered by which task(s)):

| Spec section | Task(s) |
|--------------|---------|
| Goals 1–5 | Tasks 1–9 + 13 collectively |
| Decision D1 (profile mandatory) | Task 7 |
| D2 (skippable in 1 tap) | Tasks 4, 6, 7 |
| D3 (new teaser, not TutorialGame) | Task 6 |
| D4 (`?host=` URL param) | Tasks 3, 10 |
| D5 (24h TTL) | Task 1 |
| D6 (banner per-session dismiss) | Task 8 |
| D7 (no regression) | Task 7 (regression test) |
| Architecture / invite-mode flow | Task 7 |
| Practice hub fallback | Tasks 8, 9 |
| Components (4 new + 6 modified) | Tasks 1–10 |
| Data shape (`PendingRoomInvite`) | Task 1 |
| Sanitisation regex | Task 3 |
| Telemetry (6 events) | Task 12 |
| Edge cases (expired/missing host/RTL/CG/XSS) | Tasks 1, 3, 4 (RTL via `dir`), 7 (CG branch retained), 6 |
| i18n × 5 locales | Task 11 |
| Tests (8 unit suites + 1 E2E) | Tasks 1–9 + 13 |
| Out-of-scope items | Documented, no tasks (correct) |

**Placeholder scan:** No `TBD` / `TODO` / `add appropriate error handling` / "similar to Task N" patterns. All code blocks contain runnable code. Two soft deferrals are explicitly called out (Task 10 modal name source, Task 7 test-id presence) — these are honest "verify and adapt" notes for the implementer, not placeholders.

**Type consistency:** `PendingRoomInvite { code, hostName?, ts }` is defined in Task 1 and used in Tasks 2, 7, 8 with matching property names. `inviteContext: { roomCode, hostName? }` (Tasks 4, 5, 7) is the *prop* shape — note the `code` → `roomCode` rename at the component boundary (intentional, matches spec wording). `getJoinUrl(code, utmSource?, hostName?)` signature is consistent in Tasks 10 and the call-site update.

**Method signatures cross-checked:**
- `savePendingRoomInvite(roomCode, hostName?)` — Tasks 1, 3
- `consumePendingRoomInvite(): string | null` — Tasks 1 (back-compat preserved), 7, 8
- `getPendingRoomInvite(): PendingRoomInvite | null` — Tasks 1, 2, 7
- `useInviteContext(): PendingRoomInvite | null` — Tasks 2, 8

All consistent.
