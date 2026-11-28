import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TurnOpts } from '../scenes/common';

const turns: TurnOpts[] = [];

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, v?: Record<string, unknown>) => (v ? `${k}:${JSON.stringify(v)}` : k), language: 'en' }),
}));
vi.mock('../../useArcadeGate', () => ({ useArcadeGate: () => ({ holiday: 'hanukkah', resolved: true, region: 'IL' }) }));
vi.mock('../../ArcadeShell', () => ({ useArcadeFx: () => ({ paused: false, reduced: true, cheer: vi.fn() }) }));
vi.mock('../../kit/useKitSfx', () => ({ useKitSfx: () => ({ play: vi.fn(), combo: vi.fn() }) }));
vi.mock('../../kit/PixiStage', () => ({
  default: ({ create, onInput }: { create: (ctx: unknown) => unknown; onInput?: () => void }) => {
    create({});
    return <div data-testid="stage" onPointerDown={onInput} />;
  },
}));

import FamilyGame from '../FamilyGame';

const create = vi.fn((_ctx: unknown, opts: TurnOpts) => {
  turns.push(opts);
  return { update: vi.fn() };
});

const press = (id: string) => {
  const el = screen.getByTestId(id);
  const now = vi.spyOn(performance, 'now').mockReturnValue(performance.now() + 60_000);
  fireEvent.pointerDown(el);
  fireEvent.click(el);
  now.mockRestore();
};

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
    expect(turns[0]).toMatchObject({ seed: 5, region: 'IL', seconds: 60 });
    endTurn(640);
    expect(onEnd).toHaveBeenCalledWith({ score: 640, won: false, players: 1 });
    expect(screen.queryByTestId('family-podium')).toBeNull();
  });

  it('Given three players, then each gets a hand-off and their own turn, the podium crowns the best, and only player 1 is submitted', () => {
    const onEnd = vi.fn();
    render(<FamilyGame game="splat" art={[]} create={create} content={{ seed: 9 }} onScore={vi.fn()} onEnd={onEnd} />);
    fireEvent.click(screen.getByTestId('family-count-3'));
    fireEvent.click(screen.getByTestId('family-start'));
    for (const score of [300, 900, 100]) {
      press('family-ready');
      endTurn(score);
    }
    expect(new Set(turns.map((t) => t.seed)).size).toBe(3);
    expect(screen.getByTestId('family-podium')).toBeInTheDocument();
    expect(onEnd).not.toHaveBeenCalled();
    const finish = screen.getByTestId('family-finish');
    fireEvent.click(finish);
    expect(onEnd).not.toHaveBeenCalled();
    const now = vi.spyOn(performance, 'now').mockReturnValue(performance.now() + 5000);
    fireEvent.pointerDown(finish);
    fireEvent.click(finish);
    now.mockRestore();
    expect(onEnd).toHaveBeenCalledWith({ score: 300, won: false, players: 3, champion: expect.stringContaining('playerN'), championScore: 900 });
  });

  it('Given a turn starts, then a one-line hint shows over the game and goes away on the first tap', () => {
    render(<FamilyGame game="catch" art={[]} create={create} content={{ seed: 5 }} onScore={vi.fn()} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByTestId('family-start'));
    expect(screen.getByTestId('family-hint')).toHaveTextContent('holiday.arcade.catch.how');
    fireEvent.pointerDown(screen.getByTestId('stage'));
    expect(screen.queryByTestId('family-hint')).toBeNull();
  });

  it('Given play again with the same players, then setup is skipped and the first turn starts at once', () => {
    const onRoster = vi.fn();
    render(<FamilyGame game="dash" art={[]} create={create} content={{ seed: 5 }} onScore={vi.fn()} onEnd={vi.fn()} roster={['']} onRoster={onRoster} />);
    expect(screen.queryByTestId('family-setup')).toBeNull();
    expect(screen.getByTestId('stage')).toBeInTheDocument();
  });

  it('Given the party is set up, then the roster is kept for the next round', () => {
    const onRoster = vi.fn();
    render(<FamilyGame game="dash" art={[]} create={create} content={{ seed: 5 }} onScore={vi.fn()} onEnd={vi.fn()} onRoster={onRoster} />);
    fireEvent.click(screen.getByTestId('family-count-2'));
    fireEvent.click(screen.getByTestId('family-start'));
    expect(onRoster).toHaveBeenCalledWith(['', '']);
  });

  it('Given player 2 is up, then the hand-off names them with the score to beat and the live scoreboard shows player 1', () => {
    render(<FamilyGame game="presents" art={[]} create={create} content={{ seed: 5 }} onScore={vi.fn()} onEnd={vi.fn()} roster={['Ana', 'Ben']} />);
    press('family-ready');
    endTurn(450);
    expect(screen.getByTestId('family-handoff-title')).toHaveTextContent('Ben');
    expect(screen.getByTestId('family-to-beat')).toHaveTextContent('450');
    press('family-ready');
    const board = screen.getByTestId('family-scoreboard');
    expect(board).toHaveTextContent('Ana');
    expect(board).toHaveTextContent('450');
  });
});
