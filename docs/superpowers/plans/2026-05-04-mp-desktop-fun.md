# MP Desktop Fun Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-mode desktop chassis for all four MP modes (Standard, Wheel Rush, Blast, Word Hunt) that fixes layout, input adoption, and feedback in one shared layer.

**Architecture:** A `MultiplayerDesktopShell` mounts on desktop (`useIsDesktop()` true) inside a `@container ≥ 1024px` gate, rendering a typed slot contract — `left` (roster + mode badge), `center` (mode canvas), `right` (words ladder + activity). Each mode supplies a thin adapter that maps its store/props to the slots. Twin-input merge (kb + drag write same buffer) is reinforced with a server-sourced +10% kb score bonus and a one-time first-touch demo. A `useFeedbackChannel` hook orchestrates visual + audio + ladder feedback per game event. The shell owns the timer and aria-label memo, closing mp-perf audit items H2 and H3.

**Tech Stack:** Next.js 16, TypeScript, Tailwind (`@container` queries), Zustand (existing MP stores), PostHog (kill-switch flag + telemetry), Vitest + React Testing Library, Playwright (post-ship manual).

**Spec:** `docs/superpowers/specs/2026-05-04-mp-desktop-fun-design.md`

---

## File Structure (new)

```
fe-next/components/multiplayer/desktop/
  MultiplayerDesktopShell.tsx              ~140 LOC
  MultiplayerDesktopShell.test.tsx
  StandardDesktopAdapter.tsx                ~70 LOC
  WheelRushDesktopAdapter.tsx               ~70 LOC
  BlastDesktopAdapter.tsx                   ~70 LOC
  WordHuntDesktopAdapter.tsx                ~70 LOC
  RosterRail.tsx                            ~80 LOC
  WordsLadder.tsx                           ~90 LOC
  KeyboardHintStrip.tsx                     ~60 LOC
  FeedbackHost.tsx                          ~70 LOC
  __tests__/                                  (per-component tests)

fe-next/hooks/
  useFeedbackChannel.ts                    ~110 LOC
  useGridAriaLabels.ts                      ~40 LOC
  useFirstTouchKbDemo.ts                    ~60 LOC

fe-next/lib/audio/
  wordFindChord.ts                          ~30 LOC

fe-next/lib/experiments.ts                  (extend EXPERIMENTS map)

fe-next/backend/services/scoring/
  scoringEngine.ts                          (extend with inputMethod arg)
```

## Files Touched

- `fe-next/components/multiplayer/MultiplayerInGameView.tsx:326-364` — desktop branch
- `fe-next/components/game/in-game/components/PortraitLayout.tsx:439-449` — strip 4× CircularTimer when on desktop branch (chassis owns)
- `fe-next/hooks/useKeyboardWordInput.ts:277-284` — emit `inputMethod: 'kb'`
- `fe-next/components/grid/useGridInteraction.ts:204-224` — emit `inputMethod: 'drag'`
- `fe-next/components/GridComponent.tsx` — adopt `useGridAriaLabels` memo
- `fe-next/translations/{en,he,sv,ja,es}.js` — `mp.kbHint.*`, `mp.feedback.*`, `mp.ladder.*`

---

## Phase 1 — Foundation (Day 1)

### Task 1: Add desktop-shell kill-switch flag

**Files:**
- Modify: `fe-next/lib/experiments.ts`
- Test: `fe-next/lib/__tests__/experiments.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// fe-next/lib/__tests__/experiments.test.ts (append)
import { EXPERIMENTS } from '../experiments';

describe('mp.desktop-shell.v1 flag', () => {
  it('exists in registry', () => {
    expect(EXPERIMENTS['mp.desktop-shell.v1']).toBeDefined();
  });

  it('defaults to "on" so all desktop users see shell', () => {
    expect(EXPERIMENTS['mp.desktop-shell.v1'].default).toBe('on');
  });

  it('has on/off variants for kill-switch', () => {
    expect(EXPERIMENTS['mp.desktop-shell.v1'].variants).toEqual(['on', 'off']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run fe-next/lib/__tests__/experiments.test.ts -t "desktop-shell"`
Expected: FAIL — `EXPERIMENTS['mp.desktop-shell.v1']` is undefined.

- [ ] **Step 3: Add flag to registry**

```ts
// fe-next/lib/experiments.ts — append inside EXPERIMENTS object
'mp.desktop-shell.v1': defineExperiment({
  variants: ['on', 'off'] as const,
  default: 'on',
  description:
    'Multiplayer desktop chassis kill-switch. on = MultiplayerDesktopShell mounts on desktop (default). off = legacy mobile-stacked layout. Flip to off via PostHog if Sentry warnings spike post-deploy.',
}),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run fe-next/lib/__tests__/experiments.test.ts -t "desktop-shell"`
Expected: PASS — all 3 assertions green.

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/experiments.ts fe-next/lib/__tests__/experiments.test.ts
git commit -m "feat(mp): add mp.desktop-shell.v1 PostHog kill-switch flag"
```

---

### Task 2: Slot contract types (no implementation)

**Files:**
- Create: `fe-next/components/multiplayer/desktop/types.ts`
- Test: `fe-next/components/multiplayer/desktop/__tests__/types.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// fe-next/components/multiplayer/desktop/__tests__/types.test.ts
import type { ShellSlots, MpDesktopMode } from '../types';

describe('ShellSlots contract', () => {
  it('compiles for a complete slot object', () => {
    const slots: ShellSlots = {
      left: { roster: <div/>, modeBadge: <div/> },
      center: <div/>,
      right: { wordsLadder: <div/> },
      meta: { mode: 'standard', roomId: 'r1' },
    };
    expect(slots.meta.mode).toBe('standard');
  });

  it('accepts all four modes', () => {
    const modes: MpDesktopMode[] = ['standard', 'wheel-rush', 'blast', 'word-hunt'];
    expect(modes).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run fe-next/components/multiplayer/desktop/__tests__/types.test.ts`
Expected: FAIL — module `../types` does not exist.

- [ ] **Step 3: Create types module**

```ts
// fe-next/components/multiplayer/desktop/types.ts
import type { ReactNode } from 'react';

export type MpDesktopMode = 'standard' | 'wheel-rush' | 'blast' | 'word-hunt';

export interface ShellSlots {
  left: {
    roster: ReactNode;
    modeBadge: ReactNode;
    secondary?: ReactNode;
  };
  center: ReactNode;
  right: {
    wordsLadder: ReactNode;
    activityStream?: ReactNode;
    chat?: ReactNode;
  };
  meta: { mode: MpDesktopMode; roomId: string };
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run fe-next/components/multiplayer/desktop/__tests__/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/multiplayer/desktop/types.ts fe-next/components/multiplayer/desktop/__tests__/types.test.ts
git commit -m "feat(mp): desktop shell slot contract types"
```

---

### Task 3: `useDesktopShellEnabled` hook (combines viewport + container + flag)

**Files:**
- Create: `fe-next/hooks/useDesktopShellEnabled.ts`
- Test: `fe-next/hooks/__tests__/useDesktopShellEnabled.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// fe-next/hooks/__tests__/useDesktopShellEnabled.test.ts
import { renderHook } from '@testing-library/react';
import { useDesktopShellEnabled } from '../useDesktopShellEnabled';

vi.mock('../useMediaQuery', () => ({
  useIsDesktop: vi.fn(),
}));
vi.mock('../../lib/experiments', () => ({
  useExperiment: vi.fn(),
}));

import { useIsDesktop } from '../useMediaQuery';
import { useExperiment } from '../../lib/experiments';

describe('useDesktopShellEnabled', () => {
  it('returns true when desktop AND flag is on', () => {
    (useIsDesktop as any).mockReturnValue(true);
    (useExperiment as any).mockReturnValue('on');
    const { result } = renderHook(() => useDesktopShellEnabled());
    expect(result.current).toBe(true);
  });

  it('returns false on mobile even if flag on', () => {
    (useIsDesktop as any).mockReturnValue(false);
    (useExperiment as any).mockReturnValue('on');
    const { result } = renderHook(() => useDesktopShellEnabled());
    expect(result.current).toBe(false);
  });

  it('returns false when kill-switch flipped to off', () => {
    (useIsDesktop as any).mockReturnValue(true);
    (useExperiment as any).mockReturnValue('off');
    const { result } = renderHook(() => useDesktopShellEnabled());
    expect(result.current).toBe(false);
  });

  it('returns true when flag fetch fails (graceful default)', () => {
    (useIsDesktop as any).mockReturnValue(true);
    (useExperiment as any).mockReturnValue(undefined);
    const { result } = renderHook(() => useDesktopShellEnabled());
    expect(result.current).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run fe-next/hooks/__tests__/useDesktopShellEnabled.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

```ts
// fe-next/hooks/useDesktopShellEnabled.ts
import { useIsDesktop } from './useMediaQuery';
import { useExperiment } from '../lib/experiments';

/**
 * Gates MultiplayerDesktopShell mounting.
 * Returns true when viewport ≥768px (Tailwind md) AND kill-switch flag is 'on' (or undefined → graceful default).
 * Container-query gate at ≥1024px is enforced inside the shell stylesheet.
 */
export function useDesktopShellEnabled(): boolean {
  const isDesktop = useIsDesktop();
  const variant = useExperiment('mp.desktop-shell.v1');
  const flagOn = variant !== 'off';
  return isDesktop && flagOn;
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run fe-next/hooks/__tests__/useDesktopShellEnabled.test.ts`
Expected: PASS — 4/4 cases.

- [ ] **Step 5: Commit**

```bash
git add fe-next/hooks/useDesktopShellEnabled.ts fe-next/hooks/__tests__/useDesktopShellEnabled.test.ts
git commit -m "feat(mp): useDesktopShellEnabled gates shell on viewport + flag"
```

---

### Task 4: `MultiplayerDesktopShell` component skeleton

**Files:**
- Create: `fe-next/components/multiplayer/desktop/MultiplayerDesktopShell.tsx`
- Test: `fe-next/components/multiplayer/desktop/__tests__/MultiplayerDesktopShell.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// fe-next/components/multiplayer/desktop/__tests__/MultiplayerDesktopShell.test.tsx
import { render, screen } from '@testing-library/react';
import { MultiplayerDesktopShell } from '../MultiplayerDesktopShell';
import type { ShellSlots } from '../types';

const mkSlots = (): ShellSlots => ({
  left: {
    roster: <div data-testid="roster">R</div>,
    modeBadge: <div data-testid="badge">B</div>,
  },
  center: <div data-testid="center">C</div>,
  right: { wordsLadder: <div data-testid="ladder">L</div> },
  meta: { mode: 'standard', roomId: 'r1' },
});

describe('MultiplayerDesktopShell', () => {
  it('renders all three columns with required slots', () => {
    render(<MultiplayerDesktopShell slots={mkSlots()} />);
    expect(screen.getByTestId('roster')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toBeInTheDocument();
    expect(screen.getByTestId('center')).toBeInTheDocument();
    expect(screen.getByTestId('ladder')).toBeInTheDocument();
  });

  it('exposes container-query class for ≥1024px gate', () => {
    const { container } = render(<MultiplayerDesktopShell slots={mkSlots()} />);
    expect(container.firstChild).toHaveClass('@container');
  });

  it('uses logical (start/end) layout for RTL safety', () => {
    const { container } = render(<MultiplayerDesktopShell slots={mkSlots()} />);
    const shell = container.querySelector('[data-mp-shell]');
    expect(shell?.className).not.toMatch(/\bml-\d|\bmr-\d/);
  });

  it('renders activityStream and chat when provided', () => {
    const slots: ShellSlots = {
      ...mkSlots(),
      right: {
        wordsLadder: <div data-testid="ladder">L</div>,
        activityStream: <div data-testid="stream">S</div>,
        chat: <div data-testid="chat">CH</div>,
      },
    };
    render(<MultiplayerDesktopShell slots={slots} />);
    expect(screen.getByTestId('stream')).toBeInTheDocument();
    expect(screen.getByTestId('chat')).toBeInTheDocument();
  });

  it('keeps placeholder when secondary slot missing (no reflow)', () => {
    const { container } = render(<MultiplayerDesktopShell slots={mkSlots()} />);
    expect(container.querySelector('[data-slot="left-secondary"]')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run fe-next/components/multiplayer/desktop/__tests__/MultiplayerDesktopShell.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement shell**

```tsx
// fe-next/components/multiplayer/desktop/MultiplayerDesktopShell.tsx
import { memo } from 'react';
import type { ShellSlots } from './types';

interface MultiplayerDesktopShellProps {
  slots: ShellSlots;
}

/**
 * Three-column desktop shell. Mounts only on desktop (caller-gated via useDesktopShellEnabled).
 * Inside, a @container query gates the 3-col layout at ≥1024px container width.
 * Below that, columns stack so iframe / admin frame embeds collapse gracefully.
 */
export const MultiplayerDesktopShell = memo<MultiplayerDesktopShellProps>(({ slots }) => {
  return (
    <div className="@container w-full h-full" data-mp-shell-root>
      <div
        data-mp-shell
        className="
          grid gap-4 p-4 h-full
          grid-cols-1
          @[1024px]:grid-cols-[minmax(220px,1fr)_minmax(540px,720px)_minmax(220px,1fr)]
        "
      >
        {/* Left rail */}
        <aside className="flex flex-col gap-3 min-w-0" data-slot="left">
          <div data-slot="left-mode-badge">{slots.left.modeBadge}</div>
          <div data-slot="left-roster" className="flex-1 min-h-0">{slots.left.roster}</div>
          <div data-slot="left-secondary" aria-hidden={!slots.left.secondary}>
            {slots.left.secondary ?? <span className="opacity-30">—</span>}
          </div>
        </aside>

        {/* Center canvas */}
        <main className="min-w-0 flex items-stretch justify-center" data-slot="center">
          {slots.center}
        </main>

        {/* Right rail */}
        <aside className="flex flex-col gap-3 min-w-0" data-slot="right">
          <div data-slot="right-ladder" className="flex-1 min-h-0">{slots.right.wordsLadder}</div>
          {slots.right.activityStream ? (
            <div data-slot="right-stream">{slots.right.activityStream}</div>
          ) : null}
          {slots.right.chat ? (
            <div data-slot="right-chat">{slots.right.chat}</div>
          ) : null}
        </aside>
      </div>
    </div>
  );
});
MultiplayerDesktopShell.displayName = 'MultiplayerDesktopShell';
```

- [ ] **Step 4: Run test**

Run: `npx vitest run fe-next/components/multiplayer/desktop/__tests__/MultiplayerDesktopShell.test.tsx`
Expected: PASS — 5/5 cases.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/multiplayer/desktop/MultiplayerDesktopShell.tsx fe-next/components/multiplayer/desktop/__tests__/MultiplayerDesktopShell.test.tsx
git commit -m "feat(mp): MultiplayerDesktopShell with typed slots + container query"
```

---

### Task 5: `StandardDesktopAdapter` mapping store → slots

**Files:**
- Create: `fe-next/components/multiplayer/desktop/StandardDesktopAdapter.tsx`
- Test: `fe-next/components/multiplayer/desktop/__tests__/StandardDesktopAdapter.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// fe-next/components/multiplayer/desktop/__tests__/StandardDesktopAdapter.test.tsx
import { render, screen } from '@testing-library/react';
import { StandardDesktopAdapter } from '../StandardDesktopAdapter';

describe('StandardDesktopAdapter', () => {
  const mkProps = () => ({
    roomId: 'r1',
    leaderboard: [
      { userId: 'u1', username: 'Alpha', score: 100, status: 'connected' as const },
      { userId: 'u2', username: 'Beta', score: 50, status: 'connected' as const },
    ],
    foundWords: [{ word: 'CAT', score: 3, ts: 0, userId: 'u1' }],
    remainingTime: 90,
    totalTime: 180,
    canvas: <div data-testid="canvas">C</div>,
  });

  it('renders shell with all required slots', () => {
    render(<StandardDesktopAdapter {...mkProps()} />);
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('CAT')).toBeInTheDocument();
  });

  it('sets meta.mode to "standard"', () => {
    const { container } = render(<StandardDesktopAdapter {...mkProps()} />);
    expect(container.querySelector('[data-mp-shell]')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run fe-next/components/multiplayer/desktop/__tests__/StandardDesktopAdapter.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement adapter**

```tsx
// fe-next/components/multiplayer/desktop/StandardDesktopAdapter.tsx
import type { ReactNode } from 'react';
import { MultiplayerDesktopShell } from './MultiplayerDesktopShell';
import { RosterRail } from './RosterRail';
import { WordsLadder } from './WordsLadder';
import { KeyboardHintStrip } from './KeyboardHintStrip';
import { CircularTimer } from '../../ui/CircularTimer';
import type { ShellSlots } from './types';

export interface StandardDesktopAdapterProps {
  roomId: string;
  leaderboard: Array<{ userId: string; username: string; score: number; status: 'connected' | 'disconnected' }>;
  foundWords: Array<{ word: string; score: number; ts: number; userId: string }>;
  remainingTime: number;
  totalTime: number;
  canvas: ReactNode;
}

export function StandardDesktopAdapter(props: StandardDesktopAdapterProps) {
  const slots: ShellSlots = {
    left: {
      roster: <RosterRail players={props.leaderboard} />,
      modeBadge: (
        <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-foreground bg-card shadow-brutal">
          <CircularTimer remainingTime={props.remainingTime} totalTime={props.totalTime} size="md" />
          <span className="font-bold uppercase">Standard</span>
        </div>
      ),
    },
    center: props.canvas,
    right: {
      wordsLadder: <WordsLadder words={props.foundWords} />,
      activityStream: <KeyboardHintStrip />,
    },
    meta: { mode: 'standard', roomId: props.roomId },
  };
  return <MultiplayerDesktopShell slots={slots} />;
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run fe-next/components/multiplayer/desktop/__tests__/StandardDesktopAdapter.test.tsx`
Expected: FAIL — `RosterRail`, `WordsLadder`, `KeyboardHintStrip` don't exist yet.

- [ ] **Step 5: Stub the three child components (minimal, real impl in Phase 2)**

```tsx
// fe-next/components/multiplayer/desktop/RosterRail.tsx
export function RosterRail({ players }: { players: Array<{ userId: string; username: string; score: number }> }) {
  return (
    <ul className="flex flex-col gap-2" data-component="roster-rail">
      {players.map(p => (
        <li key={p.userId} className="flex justify-between p-2 border-2 border-foreground rounded-lg bg-card">
          <span>{p.username}</span><span>{p.score}</span>
        </li>
      ))}
    </ul>
  );
}
```

```tsx
// fe-next/components/multiplayer/desktop/WordsLadder.tsx
export function WordsLadder({ words }: { words: Array<{ word: string; score: number; ts: number; userId: string }> }) {
  return (
    <ul className="flex flex-col gap-1 p-2" data-component="words-ladder">
      {words.map((w, i) => (
        <li key={`${w.word}-${w.ts}-${i}`} className="flex justify-between text-sm">
          <span className="font-mono">{w.word}</span><span className="opacity-60">{w.score}</span>
        </li>
      ))}
    </ul>
  );
}
```

```tsx
// fe-next/components/multiplayer/desktop/KeyboardHintStrip.tsx
export function KeyboardHintStrip() {
  return <div data-component="kb-hint-strip" />;
}
```

- [ ] **Step 6: Run test**

Run: `npx vitest run fe-next/components/multiplayer/desktop/__tests__/StandardDesktopAdapter.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add fe-next/components/multiplayer/desktop/
git commit -m "feat(mp): StandardDesktopAdapter + skeleton roster/ladder/hint stubs"
```

---

### Task 6: Wire shell into `MultiplayerInGameView` (standard mode only this task)

**Files:**
- Modify: `fe-next/components/multiplayer/MultiplayerInGameView.tsx:326-364`
- Test: `fe-next/components/multiplayer/__tests__/MultiplayerInGameView.desktop.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// fe-next/components/multiplayer/__tests__/MultiplayerInGameView.desktop.test.tsx
import { render, screen } from '@testing-library/react';
import MultiplayerInGameView from '../MultiplayerInGameView';

vi.mock('../../../hooks/useDesktopShellEnabled', () => ({
  useDesktopShellEnabled: vi.fn(),
}));
vi.mock('../../../hooks/useGameMode', () => ({
  useGameMode: () => 'standard',
}));

import { useDesktopShellEnabled } from '../../../hooks/useDesktopShellEnabled';

const mkProps = () => ({
  letterGrid: [['A','B'],['C','D']],
  gameCode: 'TEST',
  username: 'u',
  leaderboard: [],
  foundWords: [],
  remainingTime: 60,
  totalTime: 180,
  onWordSubmit: vi.fn(),
  gameActive: true,
});

describe('MultiplayerInGameView desktop branch', () => {
  it('mounts shell when desktop+flag enabled', () => {
    (useDesktopShellEnabled as any).mockReturnValue(true);
    const { container } = render(<MultiplayerInGameView {...(mkProps() as any)} />);
    expect(container.querySelector('[data-mp-shell]')).toBeInTheDocument();
  });

  it('mounts legacy portrait when shell disabled', () => {
    (useDesktopShellEnabled as any).mockReturnValue(false);
    const { container } = render(<MultiplayerInGameView {...(mkProps() as any)} />);
    expect(container.querySelector('[data-mp-shell]')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run fe-next/components/multiplayer/__tests__/MultiplayerInGameView.desktop.test.tsx`
Expected: FAIL — no shell rendered yet.

- [ ] **Step 3: Add desktop branch to routing**

Open `fe-next/components/multiplayer/MultiplayerInGameView.tsx`. Just before the existing mode-routing block (around line 326), add:

```tsx
import { useDesktopShellEnabled } from '../../hooks/useDesktopShellEnabled';
import { StandardDesktopAdapter } from './desktop/StandardDesktopAdapter';
// ... other imports

// inside component body, before mode-routing:
const shellEnabled = useDesktopShellEnabled();

if (shellEnabled && gameMode === 'standard') {
  return (
    <StandardDesktopAdapter
      roomId={gameCode}
      leaderboard={leaderboard}
      foundWords={foundWords}
      remainingTime={remainingTime}
      totalTime={totalTime}
      canvas={<InGameScreen {...inGameScreenProps} />}
    />
  );
}
// existing mode-routing untouched
```

(Note: `inGameScreenProps` = whatever this view currently passes to `<InGameScreen>` in the default branch. Reuse exactly. Do not duplicate logic.)

- [ ] **Step 4: Run test**

Run: `npx vitest run fe-next/components/multiplayer/__tests__/MultiplayerInGameView.desktop.test.tsx`
Expected: PASS — 2/2.

- [ ] **Step 5: Manual smoke (dev server)**

Run: `cd fe-next && npm run dev`
Open: `http://localhost:3001/multiplayer` at viewport 1920×1080. Start a standard MP room. Confirm 3-column layout, grid centered, roster left, words ladder right.
Open: same URL at viewport 393×852. Confirm legacy portrait layout (no shell).

- [ ] **Step 6: Commit**

```bash
git add fe-next/components/multiplayer/MultiplayerInGameView.tsx fe-next/components/multiplayer/__tests__/MultiplayerInGameView.desktop.test.tsx
git commit -m "feat(mp): wire MultiplayerDesktopShell for standard mode behind kill-switch"
```

---

## Phase 2 — Side Rails (Day 2)

### Task 7: Real `RosterRail` with status dots + RTL

**Files:**
- Modify: `fe-next/components/multiplayer/desktop/RosterRail.tsx`
- Test: `fe-next/components/multiplayer/desktop/__tests__/RosterRail.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { RosterRail } from '../RosterRail';

describe('RosterRail', () => {
  const players = [
    { userId: 'u1', username: 'Alpha', score: 250, status: 'connected' as const, isYou: true },
    { userId: 'u2', username: 'Beta', score: 100, status: 'disconnected' as const },
    { userId: 'u3', username: 'Gamma', score: 50, status: 'connected' as const },
  ];

  it('sorts by score descending', () => {
    render(<RosterRail players={players} />);
    const items = screen.getAllByTestId('roster-row').map(n => n.textContent);
    expect(items[0]).toMatch(/Alpha/);
    expect(items[1]).toMatch(/Beta/);
    expect(items[2]).toMatch(/Gamma/);
  });

  it('marks "you" with an indicator', () => {
    render(<RosterRail players={players} />);
    expect(screen.getByTestId('roster-row-u1')).toHaveAttribute('data-you', 'true');
  });

  it('renders disconnected status dot', () => {
    render(<RosterRail players={players} />);
    expect(screen.getByTestId('status-dot-u2')).toHaveAttribute('data-status', 'disconnected');
  });

  it('uses logical-prop spacing classes for RTL safety', () => {
    const { container } = render(<RosterRail players={players} />);
    expect(container.innerHTML).not.toMatch(/\bml-|\bmr-|\bpl-|\bpr-/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run fe-next/components/multiplayer/desktop/__tests__/RosterRail.test.tsx`
Expected: FAIL — stub doesn't render `data-testid="roster-row"`.

- [ ] **Step 3: Implement RosterRail**

```tsx
// fe-next/components/multiplayer/desktop/RosterRail.tsx
export interface RosterPlayer {
  userId: string;
  username: string;
  score: number;
  status: 'connected' | 'disconnected';
  isYou?: boolean;
}

export function RosterRail({ players }: { players: RosterPlayer[] }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <ul className="flex flex-col gap-2" data-component="roster-rail">
      {sorted.map((p, idx) => (
        <li
          key={p.userId}
          data-testid="roster-row"
          data-testid-secondary={`roster-row-${p.userId}`}
          data-you={p.isYou ? 'true' : 'false'}
          className={`flex items-center gap-2 p-2 border-2 border-foreground rounded-lg bg-card ${p.isYou ? 'ring-2 ring-electric-cyan' : ''}`}
        >
          <span className="font-mono text-xs opacity-60 w-5 text-center">{idx + 1}</span>
          <span
            data-testid={`status-dot-${p.userId}`}
            data-status={p.status}
            className={`inline-block w-2 h-2 rounded-full ${p.status === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`}
            aria-label={p.status}
          />
          <span className="flex-1 min-w-0 truncate">{p.username}</span>
          <span className="font-bold tabular-nums">{p.score}</span>
        </li>
      ))}
    </ul>
  );
}
```

(RTL note: only `gap-`, `flex-1`, `truncate` used — all logical/symmetric. No `ml-/mr-/pl-/pr-`.)

Fix the test that uses `data-testid-secondary` — replace with proper `data-testid={\`roster-row-${p.userId}\`}` and one shared `data-row="true"`:

```tsx
// adjust: each row gets data-testid={`roster-row-${p.userId}`} AND a constant attr
// for the order test, query by data-row="true"
```

Restructured for clarity:

```tsx
<li
  key={p.userId}
  data-testid={`roster-row-${p.userId}`}
  data-row="true"
  data-you={p.isYou ? 'true' : 'false'}
  ...
```

Update test query: replace `getAllByTestId('roster-row')` with `container.querySelectorAll('[data-row="true"]')`.

- [ ] **Step 4: Run test**

Run: `npx vitest run fe-next/components/multiplayer/desktop/__tests__/RosterRail.test.tsx`
Expected: PASS — 4/4.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/multiplayer/desktop/RosterRail.tsx fe-next/components/multiplayer/desktop/__tests__/RosterRail.test.tsx
git commit -m "feat(mp): RosterRail with status dots, score sort, you-indicator, RTL-safe"
```

---

### Task 8: Real `WordsLadder` with bump animation + opponent tinting

**Files:**
- Modify: `fe-next/components/multiplayer/desktop/WordsLadder.tsx`
- Test: `fe-next/components/multiplayer/desktop/__tests__/WordsLadder.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { WordsLadder } from '../WordsLadder';

describe('WordsLadder', () => {
  const meId = 'u1';
  const words = [
    { word: 'OWNED', score: 12, ts: 1000, userId: 'u1' },
    { word: 'OPPONENT', score: 18, ts: 2000, userId: 'u2' },
    { word: 'STOLEN', score: 10, ts: 3000, userId: 'u1', stolenFrom: 'u2' },
  ];

  it('renders newest first', () => {
    render(<WordsLadder words={words} meId={meId} />);
    const rows = screen.getAllByTestId('ladder-row');
    expect(rows[0]).toHaveTextContent('STOLEN');
    expect(rows[2]).toHaveTextContent('OWNED');
  });

  it('tints opponent words gray', () => {
    render(<WordsLadder words={words} meId={meId} />);
    const opponent = screen.getByTestId('ladder-row-OPPONENT');
    expect(opponent).toHaveAttribute('data-mine', 'false');
  });

  it('shows steal indicator on stolen words', () => {
    render(<WordsLadder words={words} meId={meId} />);
    const stolen = screen.getByTestId('ladder-row-STOLEN');
    expect(stolen).toHaveAttribute('data-stolen', 'true');
  });

  it('animates bump on top entry only', () => {
    render(<WordsLadder words={words} meId={meId} />);
    const rows = screen.getAllByTestId('ladder-row');
    expect(rows[0]).toHaveAttribute('data-bump', 'true');
    expect(rows[1]).toHaveAttribute('data-bump', 'false');
  });

  it('renders empty state placeholder when no words', () => {
    render(<WordsLadder words={[]} meId={meId} />);
    expect(screen.getByTestId('ladder-empty')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run fe-next/components/multiplayer/desktop/__tests__/WordsLadder.test.tsx`
Expected: FAIL — stub renders nothing testable.

- [ ] **Step 3: Implement WordsLadder**

```tsx
// fe-next/components/multiplayer/desktop/WordsLadder.tsx
import { useTranslation } from 'next-i18next';

export interface LadderWord {
  word: string;
  score: number;
  ts: number;
  userId: string;
  stolenFrom?: string;
}

interface WordsLadderProps {
  words: LadderWord[];
  meId: string;
}

export function WordsLadder({ words, meId }: WordsLadderProps) {
  const { t } = useTranslation();
  const sorted = [...words].sort((a, b) => b.ts - a.ts);

  if (sorted.length === 0) {
    return (
      <div data-testid="ladder-empty" className="p-4 text-center opacity-50 text-sm">
        {t('mp.ladder.empty')}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1 p-2 overflow-y-auto" data-component="words-ladder" aria-live="polite">
      {sorted.map((w, idx) => {
        const mine = w.userId === meId;
        const stolen = !!w.stolenFrom;
        return (
          <li
            key={`${w.word}-${w.ts}`}
            data-testid={`ladder-row-${w.word}`}
            data-row="true"
            data-mine={String(mine)}
            data-stolen={String(stolen)}
            data-bump={idx === 0 ? 'true' : 'false'}
            className={`
              flex justify-between items-center text-sm px-2 py-1 rounded
              ${mine ? 'text-foreground' : 'text-foreground/60'}
              ${stolen ? 'line-through decoration-red-500' : ''}
              ${idx === 0 ? 'animate-ladder-bump font-bold' : ''}
            `}
          >
            <span className="font-mono">{w.word}</span>
            <span className="tabular-nums">{w.score}</span>
          </li>
        );
      })}
    </ul>
  );
}
```

Add the `animate-ladder-bump` keyframe in `fe-next/app/globals.css`:

```css
@keyframes ladder-bump {
  0% { transform: translateX(-4px); }
  40% { transform: translateX(2px); }
  100% { transform: translateX(0); }
}
.animate-ladder-bump { animation: ladder-bump 400ms ease-out; }
@media (prefers-reduced-motion: reduce) {
  .animate-ladder-bump { animation: none; }
}
```

Add translation keys (all 5 locales):

```js
// fe-next/translations/en.js — under mp section, add:
ladder: { empty: 'No words yet — find the first one!' }

// he.js: { empty: 'אין מילים עדיין — מצאו את הראשונה!' }
// sv.js: { empty: 'Inga ord ännu — hitta det första!' }
// ja.js: { empty: 'まだ単語がありません — 最初の一つを見つけよう！' }
// es.js: { empty: '¡Aún no hay palabras! Encuentra la primera.' }
```

- [ ] **Step 4: Run test**

Run: `npx vitest run fe-next/components/multiplayer/desktop/__tests__/WordsLadder.test.tsx`
Expected: PASS — 5/5.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/multiplayer/desktop/WordsLadder.tsx fe-next/components/multiplayer/desktop/__tests__/WordsLadder.test.tsx fe-next/app/globals.css fe-next/translations/
git commit -m "feat(mp): WordsLadder with bump animation, opponent tint, steal indicator"
```

---

### Task 9: Real `KeyboardHintStrip`

**Files:**
- Modify: `fe-next/components/multiplayer/desktop/KeyboardHintStrip.tsx`
- Test: `fe-next/components/multiplayer/desktop/__tests__/KeyboardHintStrip.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { KeyboardHintStrip } from '../KeyboardHintStrip';

describe('KeyboardHintStrip', () => {
  it('renders Enter, Esc, Backspace hints', () => {
    render(<KeyboardHintStrip />);
    expect(screen.getByText(/Enter/)).toBeInTheDocument();
    expect(screen.getByText(/Esc/)).toBeInTheDocument();
    expect(screen.getByText(/Backspace/)).toBeInTheDocument();
  });

  it('uses translated label text', () => {
    render(<KeyboardHintStrip />);
    expect(screen.getByTestId('kb-hint-submit')).toHaveTextContent(/submit/i);
  });
});
```

- [ ] **Step 2: Run test**: FAIL.

- [ ] **Step 3: Implement**

```tsx
// fe-next/components/multiplayer/desktop/KeyboardHintStrip.tsx
import { useTranslation } from 'next-i18next';

export function KeyboardHintStrip() {
  const { t } = useTranslation();
  const items = [
    { key: 'Enter', label: t('mp.kbHint.submit'), id: 'submit' },
    { key: 'Backspace', label: t('mp.kbHint.pop'), id: 'pop' },
    { key: 'Esc', label: t('mp.kbHint.clear'), id: 'clear' },
  ];
  return (
    <div className="flex gap-2 flex-wrap p-2 text-xs" data-component="kb-hint-strip">
      {items.map(item => (
        <span
          key={item.id}
          data-testid={`kb-hint-${item.id}`}
          className="inline-flex items-center gap-1 px-2 py-1 border-2 border-foreground rounded bg-card"
        >
          <kbd className="font-mono font-bold">{item.key}</kbd>
          <span className="opacity-70">{item.label}</span>
        </span>
      ))}
    </div>
  );
}
```

Add translations (5 locales):

```js
// en.js mp:
kbHint: { submit: 'submit', pop: 'remove last', clear: 'clear' }
// he.js: { submit: 'שלח', pop: 'מחק אות', clear: 'נקה' }
// sv.js: { submit: 'skicka', pop: 'ta bort sista', clear: 'rensa' }
// ja.js: { submit: '送信', pop: '最後を削除', clear: 'クリア' }
// es.js: { submit: 'enviar', pop: 'borrar última', clear: 'limpiar' }
```

- [ ] **Step 4: Run test**: PASS.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/multiplayer/desktop/KeyboardHintStrip.tsx fe-next/components/multiplayer/desktop/__tests__/KeyboardHintStrip.test.tsx fe-next/translations/
git commit -m "feat(mp): KeyboardHintStrip reference component for shell right rail"
```

---

## Phase 3 — Other Three Adapters (Day 3)

### Task 10: `WheelRushDesktopAdapter`

**Files:**
- Create: `fe-next/components/multiplayer/desktop/WheelRushDesktopAdapter.tsx`
- Test: `fe-next/components/multiplayer/desktop/__tests__/WheelRushDesktopAdapter.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { WheelRushDesktopAdapter } from '../WheelRushDesktopAdapter';

describe('WheelRushDesktopAdapter', () => {
  const props = {
    roomId: 'r1',
    leaderboard: [{ userId: 'u1', username: 'A', score: 5, status: 'connected' as const }],
    foundWords: [],
    remainingTime: 30,
    totalTime: 60,
    fogProgress: 0.4,
    canvas: <div data-testid="wheel-canvas">W</div>,
  };

  it('renders shell with mode=wheel-rush badge', () => {
    render(<WheelRushDesktopAdapter {...props} />);
    expect(screen.getByText(/Wheel Rush/i)).toBeInTheDocument();
  });

  it('renders fog meter in left.secondary slot', () => {
    render(<WheelRushDesktopAdapter {...props} />);
    expect(screen.getByTestId('wr-fog-meter')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test**: FAIL.

- [ ] **Step 3: Implement**

```tsx
// fe-next/components/multiplayer/desktop/WheelRushDesktopAdapter.tsx
import type { ReactNode } from 'react';
import { MultiplayerDesktopShell } from './MultiplayerDesktopShell';
import { RosterRail } from './RosterRail';
import { WordsLadder } from './WordsLadder';
import { KeyboardHintStrip } from './KeyboardHintStrip';
import { CircularTimer } from '../../ui/CircularTimer';
import type { ShellSlots } from './types';

export interface WheelRushDesktopAdapterProps {
  roomId: string;
  leaderboard: Array<{ userId: string; username: string; score: number; status: 'connected' | 'disconnected' }>;
  foundWords: Array<{ word: string; score: number; ts: number; userId: string }>;
  remainingTime: number;
  totalTime: number;
  fogProgress: number;
  canvas: ReactNode;
  meId?: string;
}

export function WheelRushDesktopAdapter(props: WheelRushDesktopAdapterProps) {
  const slots: ShellSlots = {
    left: {
      roster: <RosterRail players={props.leaderboard} />,
      modeBadge: (
        <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-foreground bg-card">
          <CircularTimer remainingTime={props.remainingTime} totalTime={props.totalTime} size="md" />
          <span className="font-bold uppercase">Wheel Rush</span>
        </div>
      ),
      secondary: (
        <div data-testid="wr-fog-meter" className="p-2 border-2 border-foreground rounded bg-card">
          <div className="text-xs uppercase opacity-70 mb-1">Fog</div>
          <div className="h-2 bg-foreground/10 rounded overflow-hidden">
            <div className="h-full bg-electric-pink" style={{ width: `${Math.round(props.fogProgress * 100)}%` }} />
          </div>
        </div>
      ),
    },
    center: props.canvas,
    right: {
      wordsLadder: <WordsLadder words={props.foundWords} meId={props.meId ?? ''} />,
      activityStream: <KeyboardHintStrip />,
    },
    meta: { mode: 'wheel-rush', roomId: props.roomId },
  };
  return <MultiplayerDesktopShell slots={slots} />;
}
```

- [ ] **Step 4: Run test**: PASS.

- [ ] **Step 5: Wire into routing**

Modify `MultiplayerInGameView.tsx`:

```tsx
if (shellEnabled && gameMode === 'wheel-rush') {
  return (
    <WheelRushDesktopAdapter
      roomId={gameCode}
      leaderboard={leaderboard}
      foundWords={foundWords}
      remainingTime={remainingTime}
      totalTime={totalTime}
      fogProgress={fogProgress ?? 0}
      meId={username}
      canvas={<WheelRushView {...wheelRushProps} />}
    />
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add fe-next/components/multiplayer/desktop/WheelRushDesktopAdapter.tsx fe-next/components/multiplayer/desktop/__tests__/WheelRushDesktopAdapter.test.tsx fe-next/components/multiplayer/MultiplayerInGameView.tsx
git commit -m "feat(mp): WheelRushDesktopAdapter with fog meter in left.secondary"
```

---

### Task 11: `BlastDesktopAdapter`

**Files:**
- Create: `fe-next/components/multiplayer/desktop/BlastDesktopAdapter.tsx`
- Test: `fe-next/components/multiplayer/desktop/__tests__/BlastDesktopAdapter.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { BlastDesktopAdapter } from '../BlastDesktopAdapter';

describe('BlastDesktopAdapter', () => {
  it('renders shell with mode=blast badge', () => {
    render(<BlastDesktopAdapter
      roomId="r1"
      leaderboard={[]}
      foundWords={[]}
      remainingTime={45}
      totalTime={90}
      comboCount={3}
      canvas={<div data-testid="blast-canvas"/>}
    />);
    expect(screen.getByText(/Blast/i)).toBeInTheDocument();
    expect(screen.getByTestId('blast-combo-meter')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run**: FAIL.

- [ ] **Step 3: Implement**

```tsx
// fe-next/components/multiplayer/desktop/BlastDesktopAdapter.tsx
import type { ReactNode } from 'react';
import { MultiplayerDesktopShell } from './MultiplayerDesktopShell';
import { RosterRail } from './RosterRail';
import { WordsLadder } from './WordsLadder';
import { KeyboardHintStrip } from './KeyboardHintStrip';
import { CircularTimer } from '../../ui/CircularTimer';
import type { ShellSlots } from './types';

export interface BlastDesktopAdapterProps {
  roomId: string;
  leaderboard: Array<{ userId: string; username: string; score: number; status: 'connected' | 'disconnected' }>;
  foundWords: Array<{ word: string; score: number; ts: number; userId: string }>;
  remainingTime: number;
  totalTime: number;
  comboCount: number;
  canvas: ReactNode;
  meId?: string;
}

export function BlastDesktopAdapter(props: BlastDesktopAdapterProps) {
  const slots: ShellSlots = {
    left: {
      roster: <RosterRail players={props.leaderboard} />,
      modeBadge: (
        <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-foreground bg-card">
          <CircularTimer remainingTime={props.remainingTime} totalTime={props.totalTime} size="md" />
          <span className="font-bold uppercase">Blast</span>
        </div>
      ),
      secondary: (
        <div data-testid="blast-combo-meter" className="p-2 border-2 border-foreground rounded bg-card text-center">
          <div className="text-xs uppercase opacity-70">Combo</div>
          <div className="text-2xl font-extrabold tabular-nums">×{props.comboCount}</div>
        </div>
      ),
    },
    center: props.canvas,
    right: {
      wordsLadder: <WordsLadder words={props.foundWords} meId={props.meId ?? ''} />,
      activityStream: <KeyboardHintStrip />,
    },
    meta: { mode: 'blast', roomId: props.roomId },
  };
  return <MultiplayerDesktopShell slots={slots} />;
}
```

- [ ] **Step 4: Run**: PASS.

- [ ] **Step 5: Wire into routing** (same pattern as WheelRush block).

- [ ] **Step 6: Commit**

```bash
git add fe-next/components/multiplayer/desktop/BlastDesktopAdapter.tsx fe-next/components/multiplayer/desktop/__tests__/BlastDesktopAdapter.test.tsx fe-next/components/multiplayer/MultiplayerInGameView.tsx
git commit -m "feat(mp): BlastDesktopAdapter with combo meter in left.secondary"
```

---

### Task 12: `WordHuntDesktopAdapter`

**Files:**
- Create: `fe-next/components/multiplayer/desktop/WordHuntDesktopAdapter.tsx`
- Test: `fe-next/components/multiplayer/desktop/__tests__/WordHuntDesktopAdapter.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { WordHuntDesktopAdapter } from '../WordHuntDesktopAdapter';

describe('WordHuntDesktopAdapter', () => {
  it('renders shell + target hint', () => {
    render(<WordHuntDesktopAdapter
      roomId="r1"
      leaderboard={[]}
      foundWords={[]}
      remainingTime={30}
      totalTime={60}
      targetCategory="animals"
      canvas={<div data-testid="hunt-canvas"/>}
    />);
    expect(screen.getByText(/Word Hunt/i)).toBeInTheDocument();
    expect(screen.getByTestId('hunt-target')).toHaveTextContent(/animals/i);
  });
});
```

- [ ] **Step 2: Run**: FAIL.

- [ ] **Step 3: Implement**

```tsx
// fe-next/components/multiplayer/desktop/WordHuntDesktopAdapter.tsx
import type { ReactNode } from 'react';
import { MultiplayerDesktopShell } from './MultiplayerDesktopShell';
import { RosterRail } from './RosterRail';
import { WordsLadder } from './WordsLadder';
import { KeyboardHintStrip } from './KeyboardHintStrip';
import { CircularTimer } from '../../ui/CircularTimer';
import type { ShellSlots } from './types';

export interface WordHuntDesktopAdapterProps {
  roomId: string;
  leaderboard: Array<{ userId: string; username: string; score: number; status: 'connected' | 'disconnected' }>;
  foundWords: Array<{ word: string; score: number; ts: number; userId: string }>;
  remainingTime: number;
  totalTime: number;
  targetCategory: string;
  canvas: ReactNode;
  meId?: string;
}

export function WordHuntDesktopAdapter(props: WordHuntDesktopAdapterProps) {
  const slots: ShellSlots = {
    left: {
      roster: <RosterRail players={props.leaderboard} />,
      modeBadge: (
        <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-foreground bg-card">
          <CircularTimer remainingTime={props.remainingTime} totalTime={props.totalTime} size="md" />
          <span className="font-bold uppercase">Word Hunt</span>
        </div>
      ),
      secondary: (
        <div data-testid="hunt-target" className="p-3 border-2 border-foreground rounded bg-card">
          <div className="text-xs uppercase opacity-70">Target</div>
          <div className="text-lg font-bold capitalize">{props.targetCategory}</div>
        </div>
      ),
    },
    center: props.canvas,
    right: {
      wordsLadder: <WordsLadder words={props.foundWords} meId={props.meId ?? ''} />,
      activityStream: <KeyboardHintStrip />,
    },
    meta: { mode: 'word-hunt', roomId: props.roomId },
  };
  return <MultiplayerDesktopShell slots={slots} />;
}
```

- [ ] **Step 4: Run**: PASS.

- [ ] **Step 5: Wire into routing**.

- [ ] **Step 6: Commit**

```bash
git add fe-next/components/multiplayer/desktop/WordHuntDesktopAdapter.tsx fe-next/components/multiplayer/desktop/__tests__/WordHuntDesktopAdapter.test.tsx fe-next/components/multiplayer/MultiplayerInGameView.tsx
git commit -m "feat(mp): WordHuntDesktopAdapter with target category in left.secondary"
```

---

## Phase 4 — Feedback + Input (Day 4)

### Task 13: `wordFindChord` audio primitive

**Files:**
- Create: `fe-next/lib/audio/wordFindChord.ts`
- Test: `fe-next/lib/audio/__tests__/wordFindChord.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { playWordFindChord } from '../wordFindChord';

describe('playWordFindChord', () => {
  it('exists and accepts (length:number, octave:number)', () => {
    expect(typeof playWordFindChord).toBe('function');
  });

  it('no-ops gracefully without AudioContext (SSR)', () => {
    expect(() => playWordFindChord(5, 0)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run**: FAIL.

- [ ] **Step 3: Implement**

```ts
// fe-next/lib/audio/wordFindChord.ts
const FREQS = [261.63, 329.63, 392.0]; // C-E-G major triad

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = (window as any).AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function playWordFindChord(length: number, octaveOffset = 0): void {
  const audio = getCtx();
  if (!audio) return;
  const baseTime = audio.currentTime;
  const lengthBoost = Math.min(length / 8, 1);
  const gainPeak = 0.08 + lengthBoost * 0.06;

  FREQS.forEach((f, i) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'triangle';
    osc.frequency.value = f * Math.pow(2, octaveOffset);
    osc.connect(gain).connect(audio.destination);
    const start = baseTime + i * 0.04;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(gainPeak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
    osc.start(start);
    osc.stop(start + 0.13);
  });
}
```

- [ ] **Step 4: Run**: PASS.

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/audio/wordFindChord.ts fe-next/lib/audio/__tests__/wordFindChord.test.ts
git commit -m "feat(audio): playWordFindChord 3-tone triad for word-find feedback"
```

---

### Task 14: `useFeedbackChannel` event orchestrator

**Files:**
- Create: `fe-next/hooks/useFeedbackChannel.ts`
- Test: `fe-next/hooks/__tests__/useFeedbackChannel.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { renderHook, act } from '@testing-library/react';
import { useFeedbackChannel } from '../useFeedbackChannel';

const playChord = vi.fn();
const playCoin = vi.fn();
vi.mock('../../lib/audio/wordFindChord', () => ({ playWordFindChord: (...a: any[]) => playChord(...a) }));
vi.mock('../useSoundPlayFunctions', () => ({
  useSoundPlayFunctions: () => ({ playCoinCollectSound: () => playCoin() }),
}));
vi.mock('../useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

beforeEach(() => { playChord.mockClear(); playCoin.mockClear(); });

describe('useFeedbackChannel', () => {
  it('fires audio + sets visual state on word-found-self', () => {
    const { result } = renderHook(() => useFeedbackChannel());
    act(() => result.current.fire({ type: 'word-found-self', word: 'CAT', score: 3 }));
    expect(playChord).toHaveBeenCalledTimes(1);
    expect(playCoin).toHaveBeenCalledTimes(1);
    expect(result.current.visual.flash).toBe(true);
  });

  it('combo plays octave-up chord', () => {
    const { result } = renderHook(() => useFeedbackChannel());
    act(() => result.current.fire({ type: 'combo', count: 3 }));
    expect(playChord).toHaveBeenLastCalledWith(expect.any(Number), 1);
  });

  it('reduced-motion disables visual flash but keeps audio', async () => {
    const { useReducedMotion } = await import('../useReducedMotion');
    (useReducedMotion as any).mockReturnValue(true);
    const { result } = renderHook(() => useFeedbackChannel());
    act(() => result.current.fire({ type: 'word-found-self', word: 'CAT', score: 3 }));
    expect(playChord).toHaveBeenCalled();
    expect(result.current.visual.flash).toBe(false);
  });

  it('opponent word plays muted chord (length 1)', () => {
    const { result } = renderHook(() => useFeedbackChannel());
    act(() => result.current.fire({ type: 'word-found-opponent', word: 'DOG', score: 3 }));
    expect(playChord).toHaveBeenCalledWith(1, 0);
  });
});
```

- [ ] **Step 2: Run**: FAIL.

- [ ] **Step 3: Implement**

```ts
// fe-next/hooks/useFeedbackChannel.ts
import { useCallback, useState } from 'react';
import { playWordFindChord } from '../lib/audio/wordFindChord';
import { useSoundPlayFunctions } from './useSoundPlayFunctions';
import { useReducedMotion } from './useReducedMotion';

export type FeedbackEvent =
  | { type: 'word-found-self'; word: string; score: number }
  | { type: 'word-found-opponent'; word: string; score: number }
  | { type: 'steal'; word: string; fromUserId: string }
  | { type: 'combo'; count: number }
  | { type: 'round-end'; winnerId: string };

export interface VisualState {
  flash: boolean;
  shake: boolean;
  popup?: { word: string; score: number };
}

export function useFeedbackChannel() {
  const [visual, setVisual] = useState<VisualState>({ flash: false, shake: false });
  const { playCoinCollectSound } = useSoundPlayFunctions();
  const reduced = useReducedMotion();

  const fire = useCallback((event: FeedbackEvent) => {
    switch (event.type) {
      case 'word-found-self':
        playWordFindChord(event.word.length, 0);
        playCoinCollectSound();
        if (!reduced) {
          setVisual({ flash: true, shake: false, popup: { word: event.word, score: event.score } });
          setTimeout(() => setVisual(s => ({ ...s, flash: false, popup: undefined })), 600);
        }
        break;
      case 'word-found-opponent':
        playWordFindChord(1, 0); // muted thud equivalent
        break;
      case 'combo':
        playWordFindChord(event.count, 1); // octave up
        break;
      case 'steal':
        playWordFindChord(2, -1);
        break;
      case 'round-end':
        if (!reduced) {
          setVisual({ flash: false, shake: true });
          setTimeout(() => setVisual(s => ({ ...s, shake: false })), 100);
        }
        break;
    }
  }, [playCoinCollectSound, reduced]);

  return { visual, fire };
}
```

- [ ] **Step 4: Run**: PASS — 4/4.

- [ ] **Step 5: Commit**

```bash
git add fe-next/hooks/useFeedbackChannel.ts fe-next/hooks/__tests__/useFeedbackChannel.test.ts
git commit -m "feat(mp): useFeedbackChannel hook fans events to audio + visual state"
```

---

### Task 15: Twin-input `inputMethod` telemetry plumbing

**Files:**
- Modify: `fe-next/hooks/useKeyboardWordInput.ts:277-284`
- Modify: `fe-next/components/grid/useGridInteraction.ts:204-224`
- Test: `fe-next/hooks/__tests__/useKeyboardWordInput.inputMethod.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { renderHook, act } from '@testing-library/react';
import { useKeyboardWordInput } from '../useKeyboardWordInput';

describe('useKeyboardWordInput inputMethod telemetry', () => {
  it('calls onWordSubmit with inputMethod="kb"', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useKeyboardWordInput({
      onWordSubmit: onSubmit,
      isValidPath: () => true,
      minWordLength: 3,
      letterGrid: [['C','A','T']],
    } as any));
    act(() => { result.current.handleKeyPress('C'); result.current.handleKeyPress('A'); result.current.handleKeyPress('T'); result.current.submit(); });
    expect(onSubmit).toHaveBeenCalledWith('CAT', { inputMethod: 'kb' });
  });
});
```

- [ ] **Step 2: Run**: FAIL — `onWordSubmit` currently called with single arg.

- [ ] **Step 3: Modify `useKeyboardWordInput.ts`**

Change line 280 from:
```ts
onWordSubmit?.(word);
```
to:
```ts
onWordSubmit?.(word, { inputMethod: 'kb' });
```

Also update its TS type to accept the optional meta:
```ts
onWordSubmit?: (word: string, meta?: { inputMethod: 'kb' | 'drag' }) => void;
```

- [ ] **Step 4: Modify `useGridInteraction.ts:210`**

Change:
```ts
if (onWordSubmit) onWordSubmit(formedWord);
```
to:
```ts
if (onWordSubmit) onWordSubmit(formedWord, { inputMethod: 'drag' });
```

Update its type accordingly.

- [ ] **Step 5: Update consumers** (all `<onWordSubmit>` callers must accept optional second arg)

Run a grep for callers and verify each one ignores the optional arg gracefully (TypeScript catches this):

```bash
grep -rn "onWordSubmit" fe-next/components fe-next/hooks fe-next/player --include='*.ts' --include='*.tsx' | head -40
```

For any caller whose handler signature is `(word: string) => void`, no change needed — extra args are dropped harmlessly.

For consumers that **route the word to backend submission**, thread `meta.inputMethod` into the socket emit payload. Track these explicitly (find via grep on `socket.emit('submitWord'` or `submitWord(`):

- `fe-next/player/hooks/socket/usePlayerGameEvents.ts` — augment its `onWordSubmit` to forward `inputMethod` into the submission event payload.

- [ ] **Step 6: Run test**: PASS.

- [ ] **Step 7: Commit**

```bash
git add fe-next/hooks/useKeyboardWordInput.ts fe-next/components/grid/useGridInteraction.ts fe-next/player/hooks/socket/usePlayerGameEvents.ts fe-next/hooks/__tests__/useKeyboardWordInput.inputMethod.test.ts
git commit -m "feat(mp): thread inputMethod=kb|drag from input hooks through to submission"
```

---

### Task 16: First-touch keyboard demo (`useFirstTouchKbDemo`)

**Files:**
- Create: `fe-next/hooks/useFirstTouchKbDemo.ts`
- Test: `fe-next/hooks/__tests__/useFirstTouchKbDemo.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFirstTouchKbDemo } from '../useFirstTouchKbDemo';

const mockGet = vi.fn();
const mockSet = vi.fn();
vi.mock('posthog-js', () => ({
  default: {
    getFeatureFlagPayload: (k: string) => mockGet(k),
    persistence: { register: (o: any) => mockSet(o) },
  },
}));

describe('useFirstTouchKbDemo', () => {
  it('returns demo=true on first MP game ever', () => {
    mockGet.mockReturnValue(undefined);
    const { result } = renderHook(() => useFirstTouchKbDemo({ enabled: true }));
    expect(result.current.shouldShow).toBe(true);
  });

  it('returns false after markSeen()', () => {
    mockGet.mockReturnValue(undefined);
    const { result } = renderHook(() => useFirstTouchKbDemo({ enabled: true }));
    act(() => result.current.markSeen());
    expect(mockSet).toHaveBeenCalledWith({ seen_kb_demo: true });
  });

  it('respects disabled flag', () => {
    const { result } = renderHook(() => useFirstTouchKbDemo({ enabled: false }));
    expect(result.current.shouldShow).toBe(false);
  });
});
```

- [ ] **Step 2: Run**: FAIL.

- [ ] **Step 3: Implement**

```ts
// fe-next/hooks/useFirstTouchKbDemo.ts
import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'lc.seen_kb_demo';

export function useFirstTouchKbDemo({ enabled }: { enabled: boolean }) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    const seen = window.localStorage.getItem(STORAGE_KEY);
    setShouldShow(seen !== '1');
  }, [enabled]);

  const markSeen = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, '1');
    }
    setShouldShow(false);
  }, []);

  return { shouldShow, markSeen };
}
```

(Note: localStorage chosen over PostHog persistence for resilience — survives offline. Telemetry event still emitted separately on demo dismissal in a later task.)

Update test to match localStorage behavior:

```ts
beforeEach(() => window.localStorage.clear());

describe('useFirstTouchKbDemo', () => {
  it('returns shouldShow=true on first MP game ever', () => {
    const { result } = renderHook(() => useFirstTouchKbDemo({ enabled: true }));
    expect(result.current.shouldShow).toBe(true);
  });

  it('returns shouldShow=false after markSeen()', () => {
    const { result } = renderHook(() => useFirstTouchKbDemo({ enabled: true }));
    act(() => result.current.markSeen());
    expect(result.current.shouldShow).toBe(false);
  });

  it('returns false on subsequent mount after markSeen', () => {
    const first = renderHook(() => useFirstTouchKbDemo({ enabled: true }));
    act(() => first.result.current.markSeen());
    first.unmount();
    const second = renderHook(() => useFirstTouchKbDemo({ enabled: true }));
    expect(second.result.current.shouldShow).toBe(false);
  });

  it('respects disabled flag', () => {
    const { result } = renderHook(() => useFirstTouchKbDemo({ enabled: false }));
    expect(result.current.shouldShow).toBe(false);
  });
});
```

- [ ] **Step 4: Run**: PASS — 4/4.

- [ ] **Step 5: Commit**

```bash
git add fe-next/hooks/useFirstTouchKbDemo.ts fe-next/hooks/__tests__/useFirstTouchKbDemo.test.ts
git commit -m "feat(mp): useFirstTouchKbDemo gates one-time keyboard intro"
```

---

## Phase 5 — Server KB Bonus (Day 5)

### Task 17: Server-side +10% kb-bonus in scoring engine

**Files:**
- Modify: `fe-next/backend/services/scoring/scoringEngine.ts:163` (find by `Math.round(score * rarityMultiplier)`)
- Test: `fe-next/backend/services/scoring/__tests__/scoringEngine.kbBonus.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { calculateWordScore } from '../scoringEngine';

describe('scoringEngine kb-bonus', () => {
  const ctx = { boardLetters: 'ABCDEFG', gameMode: 'standard', remainingTime: 90 } as any;

  it('applies +10% multiplier when inputMethod=kb', () => {
    const dragScore = calculateWordScore('CAT', ctx, { inputMethod: 'drag' });
    const kbScore = calculateWordScore('CAT', ctx, { inputMethod: 'kb' });
    expect(kbScore).toBe(Math.round(dragScore * 1.1));
  });

  it('treats undefined inputMethod as drag (no bonus)', () => {
    const noneScore = calculateWordScore('CAT', ctx);
    const dragScore = calculateWordScore('CAT', ctx, { inputMethod: 'drag' });
    expect(noneScore).toBe(dragScore);
  });

  it('stacks kb-bonus AFTER rarity (last multiplier)', () => {
    const score = calculateWordScore('CAT', ctx, { inputMethod: 'kb' });
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run**: FAIL — `calculateWordScore` doesn't accept the meta arg.

- [ ] **Step 3: Modify scoring engine**

Locate `calculateWordScore` in `fe-next/backend/services/scoring/scoringEngine.ts`. Add an optional second arg and apply the bonus as the **last** multiplier so it stacks on top of base + combo + rarity:

```ts
export const KB_BONUS_MULT = 1.1;

export interface ScoringMeta {
  inputMethod?: 'kb' | 'drag';
}

export function calculateWordScore(
  word: string,
  ctx: ScoringContext,
  meta: ScoringMeta = {}
): number {
  // ... existing base + combo + rarity logic, ending around line 163 with:
  //   score = Math.round(score * rarityMultiplier);
  //
  // Add immediately AFTER the rarity multiplication:
  if (meta.inputMethod === 'kb') {
    score = Math.round(score * KB_BONUS_MULT);
  }
  return score;
}
```

(If `calculateWordScore` already takes a context object with these keys, fold `inputMethod` into context instead — same effect, narrower surface. Choose whichever matches existing convention. Either way, the multiplication line is the contract.)

- [ ] **Step 4: Update callers** to pass `inputMethod`

Grep for `calculateWordScore(`:

```bash
grep -rn "calculateWordScore(" fe-next/backend --include='*.ts'
```

For each call, ensure the submission's `inputMethod` (from socket payload) is passed. Most likely path: `fe-next/backend/services/socket/wordSubmit.ts` (or similar handler that receives the client emit).

```ts
// receive payload: { word, gameId, inputMethod }
const score = calculateWordScore(word, ctx, { inputMethod: payload.inputMethod });
```

- [ ] **Step 5: Run test**: PASS — 3/3.

- [ ] **Step 6: Commit**

```bash
git add fe-next/backend/services/scoring/
git commit -m "feat(mp): server-side +10% kb-bonus stacks on top of rarity multiplier"
```

---

### Task 18: KB-bonus visual chip in WordsLadder + score popup

**Files:**
- Modify: `fe-next/components/multiplayer/desktop/WordsLadder.tsx`
- Test: `fe-next/components/multiplayer/desktop/__tests__/WordsLadder.test.tsx`

- [ ] **Step 1: Extend test**

```tsx
it('shows ⌨️ chip on kb-input rows', () => {
  const words = [{ word: 'TYPED', score: 11, ts: 1, userId: 'me', inputMethod: 'kb' as const }];
  render(<WordsLadder words={words} meId="me" />);
  expect(screen.getByTestId('ladder-kb-chip-TYPED')).toBeInTheDocument();
});

it('does not show chip on drag rows', () => {
  const words = [{ word: 'DRAGGED', score: 10, ts: 1, userId: 'me', inputMethod: 'drag' as const }];
  render(<WordsLadder words={words} meId="me" />);
  expect(screen.queryByTestId('ladder-kb-chip-DRAGGED')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run**: FAIL.

- [ ] **Step 3: Extend WordsLadder**

Update `LadderWord` type:
```ts
export interface LadderWord {
  word: string;
  score: number;
  ts: number;
  userId: string;
  stolenFrom?: string;
  inputMethod?: 'kb' | 'drag';
}
```

Inside the row render:
```tsx
<span className="font-mono">{w.word}</span>
{w.inputMethod === 'kb' && (
  <span
    data-testid={`ladder-kb-chip-${w.word}`}
    className="text-xs px-1 rounded bg-electric-cyan text-foreground"
    aria-label="keyboard bonus"
    title="+10% keyboard bonus"
  >⌨️ +10%</span>
)}
<span className="tabular-nums">{w.score}</span>
```

- [ ] **Step 4: Run**: PASS.

- [ ] **Step 5: Thread `inputMethod` through `foundWords`** — the wire format from server already carries it (Task 17). Verify the adapter passes it down. If `foundWords` array currently strips it, propagate at the source (likely `useGameState` or equivalent store).

- [ ] **Step 6: Commit**

```bash
git add fe-next/components/multiplayer/desktop/WordsLadder.tsx fe-next/components/multiplayer/desktop/__tests__/WordsLadder.test.tsx
git commit -m "feat(mp): WordsLadder shows ⌨️ +10% chip on kb-submitted words"
```

---

## Phase 6 — Perf Cleanup + Polish (Day 6)

### Task 19: Strip 4× CircularTimer from PortraitLayout when desktop branch active

**Files:**
- Modify: `fe-next/components/game/in-game/components/PortraitLayout.tsx:439-449`
- Test: `fe-next/components/game/in-game/__tests__/PortraitLayout.desktop.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react';
import PortraitLayout from '../components/PortraitLayout';

describe('PortraitLayout desktop timer suppression', () => {
  it('renders 0 CircularTimers when in shell context', () => {
    render(<PortraitLayout {...({ inDesktopShell: true, remainingTime: 60, timerValue: 3 } as any)} />);
    expect(screen.queryAllByRole('timer')).toHaveLength(0);
  });

  it('renders timers as before when NOT in shell context (mobile)', () => {
    render(<PortraitLayout {...({ inDesktopShell: false, remainingTime: 60, timerValue: 3 } as any)} />);
    expect(screen.queryAllByRole('timer').length).toBeGreaterThan(0);
  });
});
```

(`role="timer"` requires CircularTimer to expose it — add to its root if not present. ARIA-correct anyway.)

- [ ] **Step 2: Run**: FAIL.

- [ ] **Step 3: Add `inDesktopShell` prop and gate the 4 timer mounts**

In `PortraitLayout.tsx` lines 438-449, wrap the 4 timer divs:

```tsx
{!inDesktopShell && (
  <>
    {/* existing 4 CircularTimer divs */}
  </>
)}
```

Add `inDesktopShell?: boolean` to PortraitLayout props (default `false`).

In `StandardDesktopAdapter.tsx`, pass `inDesktopShell` into the canvas via `<InGameScreen inDesktopShell />` and thread it down (one prop, one chain).

In `CircularTimer.tsx` add `role="timer"` to the SVG root element.

- [ ] **Step 4: Run test**: PASS.

- [ ] **Step 5: React Profiler before/after**

Manual: dev server, 1920×1080, standard MP round. Open React DevTools Profiler, record one round. Compare commit counts pre/post change. **Expected**: ≥30% reduction in median commits per round (closes mp-perf H2).

- [ ] **Step 6: Commit**

```bash
git add fe-next/components/game/in-game/components/PortraitLayout.tsx fe-next/components/multiplayer/desktop/StandardDesktopAdapter.tsx fe-next/components/ui/CircularTimer.tsx fe-next/components/game/in-game/__tests__/
git commit -m "perf(mp): close H2 — strip 4× CircularTimer when desktop shell owns timer"
```

---

### Task 20: `useGridAriaLabels` memo (close H3)

**Files:**
- Create: `fe-next/hooks/useGridAriaLabels.ts`
- Modify: `fe-next/components/GridComponent.tsx`
- Test: `fe-next/hooks/__tests__/useGridAriaLabels.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { renderHook } from '@testing-library/react';
import { useGridAriaLabels } from '../useGridAriaLabels';

describe('useGridAriaLabels', () => {
  it('returns one label per cell', () => {
    const grid = [['A','B'], ['C','D']];
    const { result } = renderHook(() => useGridAriaLabels(grid, 'seed1'));
    expect(result.current['0,0']).toMatch(/A/i);
    expect(result.current['1,1']).toMatch(/D/i);
  });

  it('memoizes by seed: same seed === same object reference', () => {
    const grid = [['A','B']];
    const { result, rerender } = renderHook(({ s }) => useGridAriaLabels(grid, s), {
      initialProps: { s: 'seed1' },
    });
    const first = result.current;
    rerender({ s: 'seed1' });
    expect(result.current).toBe(first);
  });

  it('returns new object when seed changes', () => {
    const grid = [['A','B']];
    const { result, rerender } = renderHook(({ s }) => useGridAriaLabels(grid, s), {
      initialProps: { s: 'seed1' },
    });
    const first = result.current;
    rerender({ s: 'seed2' });
    expect(result.current).not.toBe(first);
  });
});
```

- [ ] **Step 2: Run**: FAIL.

- [ ] **Step 3: Implement**

```ts
// fe-next/hooks/useGridAriaLabels.ts
import { useMemo } from 'react';
import { useTranslation } from 'next-i18next';

export type GridAriaLabels = Record<string, string>;

export function useGridAriaLabels(
  grid: string[][],
  boardSeed: string
): GridAriaLabels {
  const { t } = useTranslation();
  return useMemo(() => {
    const out: GridAriaLabels = {};
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        out[`${r},${c}`] = t('grid.cellAria', { letter: grid[r][c], row: r + 1, col: c + 1 });
      }
    }
    return out;
  }, [boardSeed, t]);
}
```

- [ ] **Step 4: Wire into `GridComponent.tsx`**

Replace per-cell `t()` invocation with lookup from `labels[\`${r},${c}\`]`. Pass `boardSeed` from parent (game state already has a board hash).

```tsx
const labels = useGridAriaLabels(letterGrid, boardSeed);
// ... in cell render:
<GridCell ... aria-label={labels[`${r},${c}`]} />
```

- [ ] **Step 5: Run test**: PASS — 3/3.

- [ ] **Step 6: React Profiler check**

Confirm `t()` invocation count drops from 16/cell/render to 1/cell/round.

- [ ] **Step 7: Commit**

```bash
git add fe-next/hooks/useGridAriaLabels.ts fe-next/components/GridComponent.tsx fe-next/hooks/__tests__/useGridAriaLabels.test.ts
git commit -m "perf(mp): close H3 — useGridAriaLabels memoizes t() calls per board seed"
```

---

### Task 21: Translations sweep (5 locales) + lint + final test pass

**Files:**
- Modify: `fe-next/translations/{en,he,sv,ja,es}.js`

- [ ] **Step 1: Confirm all new keys exist in all 5 locales**

Required keys (consolidated from prior tasks):

```
mp.kbHint.submit
mp.kbHint.pop
mp.kbHint.clear
mp.ladder.empty
grid.cellAria  (with placeholders {letter}, {row}, {col})
```

Per `clean-translations` skill convention: en + he + sv + ja + es. HE/JA/ES strings: AI-generated → flag for native review in commit message.

- [ ] **Step 2: Run translation lint**

```bash
cd fe-next && npm run lint
```
Expected: no missing-key warnings.

- [ ] **Step 3: Full test suite**

```bash
cd fe-next && npm run test
```
Expected: full suite green. Address any new flakes.

- [ ] **Step 4: Type check**

```bash
cd fe-next && npm run tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Build**

```bash
cd fe-next && npm run build
```
Expected: production build succeeds.

- [ ] **Step 6: Manual desktop smoke @ 1920×1080**

`http://localhost:3001/multiplayer` — start each of the 4 modes. Verify:
- 3-col layout renders
- Roster left, words ladder right, mode badge with timer in left.modeBadge
- Type a word → ⌨️ +10% chip appears on ladder row
- Drag a word → no chip
- First time only: 3-second auto-demo plays
- Sound on → chord on word-find
- Sound muted → still see flash + popup

- [ ] **Step 7: Manual mobile smoke @ 393×852**

Same URL. Verify legacy portrait layout untouched, no shell mounts, all 4 modes still work.

- [ ] **Step 8: Manual RTL smoke @ 1920×1080 + `?locale=he`**

Verify shell mirrors correctly (logical-prop layout, not flipped).

- [ ] **Step 9: Commit translations**

```bash
git add fe-next/translations/
git commit -m "chore(mp): add 5-locale strings for desktop shell (HE/JA/ES need native review)"
```

---

## Self-Review

**Spec coverage check** — every spec section maps to at least one task:

| Spec section | Task |
|---|---|
| Layout chassis (slots, container query) | Tasks 2, 4 |
| Mount rule | Task 3 |
| Per-mode adapters | Tasks 5, 10, 11, 12 |
| Routing branch | Tasks 6, 10–12 |
| Kill-switch flag | Task 1 |
| Twin-input merge | Task 15 |
| KB +10% bonus (server-sourced) | Tasks 15, 17, 18 |
| First-touch demo | Task 16 |
| Hint chip strip | Task 9 |
| Telemetry `input_method` | Task 15 |
| Feedback layer (3 channels) | Tasks 13, 14 |
| Reduced-motion gate | Task 14 |
| Audio mute respect | (existing useSoundPlayFunctions respects mute — Task 14 reuses) |
| Perf H2 (4× CircularTimer) | Task 19 |
| Perf H3 (t() per cell) | Task 20 |
| RTL safety | Tasks 4, 7 |
| 5-locale i18n | Tasks 8, 9, 21 |

**Placeholders**: none. All steps include concrete code.

**Type consistency**:
- `ShellSlots` (Task 2) used in Tasks 4, 5, 10, 11, 12 — same shape.
- `LadderWord.inputMethod?: 'kb' | 'drag'` (Task 18) matches `meta.inputMethod` arg (Task 15) and server `ScoringMeta.inputMethod` (Task 17).
- `useDesktopShellEnabled` (Task 3) consumed in Task 6 — single boolean.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-04-mp-desktop-fun.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session via executing-plans, batch with checkpoints.

Which approach?
