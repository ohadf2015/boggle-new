import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TurnOpts } from '../scenes/common';

const turns: TurnOpts[] = [];

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('../../useArcadeGate', () => ({ useArcadeGate: () => ({ holiday: 'hanukkah', resolved: true, region: 'IL' }) }));
vi.mock('../../ArcadeShell', () => ({ useArcadeFx: () => ({ paused: false, reduced: true, cheer: vi.fn() }) }));
vi.mock('../../kit/useKitSfx', () => ({ useKitSfx: () => ({ play: vi.fn(), combo: vi.fn() }) }));
vi.mock('../../kit/PixiStage', () => ({
  default: ({ create }: { create: (ctx: unknown) => unknown }) => {
    create({});
    return <div data-testid="stage" />;
  },
}));

import FamilyGame from '../FamilyGame';

const create = vi.fn((_ctx: unknown, opts: TurnOpts) => {
  turns.push(opts);
  return { update: vi.fn() };
});

const endTurn = (score: number) => {
  act(() => turns[turns.length - 1].end({ score, won: false }));
  act(() => vi.advanceTimersByTime(2000));
};

beforeEach(() => {
  vi.useFakeTimers();
  turns.length = 0;
  create.mockClear();
});

describe('FamilyGame Pass & Play', () => {
  it('Given a solo player, when the turn ends, then the round ends with that score and no podium', () => {
    const onEnd = vi.fn();
    render(<FamilyGame game="latke" art={[]} create={create} content={{ seed: 5 }} onScore={vi.fn()} onEnd={onEnd} />);
    fireEvent.click(screen.getByTestId('family-start'));
    expect(turns[0]).toMatchObject({ seed: 5, region: 'IL', seconds: 45 });
    endTurn(640);
    expect(onEnd).toHaveBeenCalledWith({ score: 640, plays: [], won: false, players: 1 });
    expect(screen.queryByTestId('family-podium')).toBeNull();
  });

  it('Given three players, then each gets a hand-off and their own turn, the podium crowns the best, and only player 1 is submitted', () => {
    const onEnd = vi.fn();
    render(<FamilyGame game="splat" art={[]} create={create} content={{ seed: 9 }} onScore={vi.fn()} onEnd={onEnd} />);
    fireEvent.click(screen.getByTestId('family-count-3'));
    fireEvent.click(screen.getByTestId('family-start'));
    for (const score of [300, 900, 100]) {
      fireEvent.click(screen.getByTestId('family-ready'));
      endTurn(score);
    }
    expect(new Set(turns.map((t) => t.seed)).size).toBe(3);
    expect(screen.getByTestId('family-podium')).toBeInTheDocument();
    expect(onEnd).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('family-finish'));
    expect(onEnd).toHaveBeenCalledWith({ score: 300, plays: [], won: false, players: 3 });
  });
});
