import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Container } from 'pixi.js';
import type { ReactNode } from 'react';
import type { RivalMarker } from '@/lib/wordTower/rivals';

const mockEngine = {
  app: { ticker: { add: vi.fn(), remove: vi.fn() } as { add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> } | null },
  camera: new Container(),
  width: 400,
  height: 600,
  particles: { burst: vi.fn() },
  flash: { flash: vi.fn() },
  shake: { shake: vi.fn() },
};

vi.mock('@/lib/gameEngine', () => ({
  GameCanvas: ({ children }: { children: ReactNode }) => <div data-testid="mock-game-canvas">{children}</div>,
  useGameEngine: () => mockEngine,
}));

import { WordTowerSmashScene } from '../WordTowerSmashScene';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const target: RivalMarker = {
  id: 'rival-1',
  name: 'Alex',
  heightM: 100,
  playerId: 'p1',
  avatarEmoji: '🧗',
} as RivalMarker;

describe('WordTowerSmashScene — higher-impact spectacle + real avatar', () => {
  let rafCb: FrameRequestCallback | null = null;
  beforeEach(() => {
    rafCb = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCb = cb;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows the rival real Avatar face, never emoji glyph', () => {
    render(
      <WordTowerSmashScene target={target} attackerHeightM={100} onDone={vi.fn()} t={t} reducedMotion />,
    );
    expect(screen.getByTestId('header-avatar')).toBeInTheDocument();
    expect(screen.queryByText('🧗')).not.toBeInTheDocument();
  });

  it('exposes destroy spectacle hooks on reduced-motion result path', () => {
    render(
      <WordTowerSmashScene target={target} attackerHeightM={100} onDone={vi.fn()} t={t} reducedMotion />,
    );
    expect(screen.getByTestId('wt-smash-stage')).toHaveAttribute('data-phase', 'aim');

    act(() => {
      const base = performance.now();
      for (let i = 1; i <= 40; i++) rafCb?.(base + i * 33);
    });

    vi.useFakeTimers();
    fireEvent.click(screen.getByText('wordTower.sabotage.strikeCta'));
    expect(screen.getByTestId('wt-smash-stage')).toHaveAttribute('data-phase', 'impact');
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByTestId('wt-smash-stage')).toHaveAttribute('data-phase', 'result');
    // Destroy readout + debris layer present for the spectacle beat.
    expect(screen.getByTestId('wt-smash-debris')).toBeInTheDocument();
    expect(screen.getByText(/wordTower\.sabotage\.floorsDestroyed/)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('does not crash on reduced-motion strike→result (accessibility path)', () => {
    const onDone = vi.fn();
    expect(() => {
      render(
        <WordTowerSmashScene target={target} attackerHeightM={50} onDone={onDone} t={t} reducedMotion />,
      );
      fireEvent.click(screen.getByText('wordTower.sabotage.strikeCta'));
    }).not.toThrow();
  });
});
