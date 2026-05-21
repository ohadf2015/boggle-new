import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordTowerVersusRail } from '../WordTowerVersusRail';
import type { VersusStanding } from '@/lib/wordTower/versusMatch';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${Object.values(params).join(',')}` : key);

function standing(over: Partial<VersusStanding> & { playerId: string; heightM: number }): VersusStanding {
  return { rank: 1, username: over.playerId.toUpperCase(), floors: 0, biome: 'city', banked: 0, belowMedian: false, ...over };
}

describe('WordTowerVersusRail', () => {
  const standings = [
    standing({ rank: 1, playerId: 'me', username: 'Me', heightM: 100 }),
    standing({ rank: 2, playerId: 'r1', username: 'R1', heightM: 80 }), // lead 20 >= 15
    standing({ rank: 3, playerId: 'r2', username: 'R2', heightM: 95 }), // lead 5 < 15
  ];

  it('renders a row per player and no bomb button for self', () => {
    render(<WordTowerVersusRail standings={standings} selfId="me" banked={1} yourHeightM={100} onBomb={vi.fn()} t={t} />);
    expect(screen.getByText('Me')).toBeInTheDocument();
    // self has no bomb button; two rivals do
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('enables bomb only on rivals you lead by the gate, with a banked bomb', () => {
    render(<WordTowerVersusRail standings={standings} selfId="me" banked={1} yourHeightM={100} onBomb={vi.fn()} t={t} />);
    expect(screen.getByRole('button', { name: 'wordTower.versus.bomb:R1' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'wordTower.versus.bomb:R2' })).toBeDisabled();
  });

  it('disables all bombs when you have none banked', () => {
    render(<WordTowerVersusRail standings={standings} selfId="me" banked={0} yourHeightM={100} onBomb={vi.fn()} t={t} />);
    expect(screen.getByRole('button', { name: 'wordTower.versus.bomb:R1' })).toBeDisabled();
  });

  it('fires onBomb with the rival id', () => {
    const onBomb = vi.fn();
    render(<WordTowerVersusRail standings={standings} selfId="me" banked={1} yourHeightM={100} onBomb={onBomb} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: 'wordTower.versus.bomb:R1' }));
    expect(onBomb).toHaveBeenCalledWith('r1');
  });
});
