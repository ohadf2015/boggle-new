import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { WheelRushPlayerStats } from '@/shared/types/game';

// GSAP — record calls so we can assert the orchestrated timeline runs but
// don't actually animate during JSDOM tests.
const fromSpy = vi.fn();
vi.mock('gsap', () => ({
  gsap: {
    timeline: vi.fn(() => {
      const tl: { to: ReturnType<typeof vi.fn>; from: ReturnType<typeof vi.fn>; kill: ReturnType<typeof vi.fn> } = {
        to: vi.fn(),
        from: vi.fn((..._args: unknown[]) => {
          fromSpy(..._args);
          return tl;
        }),
        kill: vi.fn(),
      };
      tl.to.mockReturnValue(tl);
      return tl;
    }),
    context: vi.fn((callback: () => void) => {
      callback();
      return { revert: vi.fn() };
    }),
  },
}));

// Pixi canvas dynamic-imports inside the scene; stub to avoid Pixi init in JSDOM.
vi.mock('@/components/results/WheelRushSpinCanvas', () => ({
  default: () => <div data-testid="wheel-spin-canvas-mock" />,
}));

// next/dynamic — return component synchronously for testing
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ default: React.ComponentType<unknown> }>) => {
    let Comp: React.ComponentType<unknown> | null = null;
    loader().then(m => { Comp = m.default; }).catch(() => { /* ignore */ });
    const Wrapped = (props: Record<string, unknown>) => Comp ? <Comp {...props} /> : null;
    return Wrapped;
  },
}));

// Reduced-motion hook — most tests want motion ON to verify GSAP path; flip in
// dedicated tests via mockReturnValueOnce.
const reducedMotionMock = vi.fn(() => false);
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    useReducedMotion: () => reducedMotionMock(),
  };
});

// Translation passthrough so we can assert against keys
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

// Avatar — render username so we can assert orbit composition
vi.mock('@/components/Avatar', () => ({
  default: ({ userId }: { userId?: string }) => <div data-testid="avatar" data-username={userId} />,
}));

// ScoreCountUp — render value directly so RTL queries work without animation tick
vi.mock('@/components/results/shared', () => ({
  ScoreCountUp: ({ to }: { to: number }) => <span data-testid="score-countup">{to}</span>,
}));

import WheelRushResultsScene from '../WheelRushResultsScene';

const mkStats = (overrides: Partial<WheelRushPlayerStats> = {}): WheelRushPlayerStats => ({
  wordsLocked: 3,
  wordsStolen: 1,
  wordsStolenFromMe: 0,
  bestWord: 'TANGO',
  totalScore: 42,
  ...overrides,
});

describe('WheelRushResultsScene', () => {
  beforeEach(() => {
    fromSpy.mockClear();
    reducedMotionMock.mockReturnValue(false);
  });

  it('renders nothing when player stats are empty', () => {
    const { container } = render(
      <WheelRushResultsScene playerStats={{}} currentUsername="alice" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders winner at center with crown + score', () => {
    render(
      <WheelRushResultsScene
        playerStats={{
          alice: mkStats({ totalScore: 90 }),
          bob: mkStats({ totalScore: 30 }),
        }}
        currentUsername="alice"
      />
    );
    const scene = screen.getByTestId('wheel-rush-results-scene');
    expect(scene).toBeInTheDocument();
    // Winner score appears via ScoreCountUp
    expect(screen.getByText('90')).toBeInTheDocument();
  });

  it('renders orbiting avatars for runners-up with rank badges', () => {
    render(
      <WheelRushResultsScene
        playerStats={{
          alice: mkStats({ totalScore: 100 }),
          bob: mkStats({ totalScore: 60 }),
          cara: mkStats({ totalScore: 30 }),
        }}
        currentUsername="alice"
      />
    );
    // 3 avatars (1 winner + 2 orbit)
    const avatars = screen.getAllByTestId('avatar');
    expect(avatars).toHaveLength(3);
    // Orbit usernames render (winner shown separately)
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('cara')).toBeInTheDocument();
  });

  it('marks the winner with an explicit #1 rank badge so every placement is numbered', () => {
    render(
      <WheelRushResultsScene
        playerStats={{
          alice: mkStats({ totalScore: 100 }),
          bob: mkStats({ totalScore: 60 }),
        }}
        currentUsername="bob"
      />
    );
    const badge = screen.getByTestId('wheel-rush-winner-rank');
    expect(badge).toHaveTextContent('1');
  });

  it('shows all three stat tiles', () => {
    render(
      <WheelRushResultsScene
        playerStats={{
          alice: mkStats({ wordsLocked: 5, wordsStolen: 2 }),
          bob: mkStats({ wordsLocked: 3, wordsStolen: 4 }),
        }}
      />
    );
    const tiles = screen.getAllByTestId('wheel-rush-scene-stat');
    expect(tiles).toHaveLength(3);
  });

  it('renders awards for locks, steals, and best word when present', () => {
    render(
      <WheelRushResultsScene
        playerStats={{
          alice: mkStats({ wordsLocked: 7, wordsStolen: 0, bestWord: 'A' }),
          bob: mkStats({ wordsLocked: 0, wordsStolen: 4, bestWord: 'TANGOSEPT' }),
        }}
      />
    );
    const awards = screen.getAllByTestId('wheel-rush-scene-award');
    expect(awards).toHaveLength(3);
    expect(awards.find(a => a.dataset.award === 'locksmith')).toBeDefined();
    expect(awards.find(a => a.dataset.award === 'bandit')).toBeDefined();
    expect(awards.find(a => a.dataset.award === 'wordsmith')).toBeDefined();
  });

  it('hides awards that have zero qualifying stats', () => {
    render(
      <WheelRushResultsScene
        playerStats={{
          alice: mkStats({ wordsLocked: 0, wordsStolen: 0, bestWord: '' }),
          bob: mkStats({ wordsLocked: 0, wordsStolen: 0, bestWord: '' }),
        }}
      />
    );
    expect(screen.queryAllByTestId('wheel-rush-scene-award')).toHaveLength(0);
  });

  it('runs GSAP timeline when motion is enabled', () => {
    render(
      <WheelRushResultsScene
        playerStats={{ alice: mkStats(), bob: mkStats() }}
      />
    );
    // Timeline should have queued at least the four scene beats
    expect(fromSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('skips GSAP timeline when reduced motion is requested', () => {
    reducedMotionMock.mockReturnValue(true);
    render(
      <WheelRushResultsScene
        playerStats={{ alice: mkStats(), bob: mkStats() }}
      />
    );
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('renders the wheel-spin canvas backdrop', () => {
    render(<WheelRushResultsScene playerStats={{ alice: mkStats() }} />);
    expect(screen.getByTestId('wheel-spin-canvas-mock')).toBeInTheDocument();
  });
});
