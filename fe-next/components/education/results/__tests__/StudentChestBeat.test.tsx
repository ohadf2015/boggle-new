import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const sound = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('@/components/education/economy/ChestStage', () => ({
  default: ({ phase, onTap }: { phase: string; onTap: () => void }) => <button type="button" data-testid="chest-stage" data-phase={phase} onClick={onTap} />,
}));
vi.mock('@/components/education/economy/chestChips', () => ({
  useChestChips: () => [{ id: 'xp', icon: null, value: '+35', label: 'XP' }, { id: 'item', icon: null, value: 'Wizard hat', label: 'New item' }],
}));
vi.mock('@/components/education/economy/useStudentAvatar', () => ({ useStudentAvatar: () => ({}) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playChestOpenSound: sound.open }) }));
vi.mock('@/utils/haptics', () => ({ hapticGameWin: vi.fn() }));

import { StudentChestBeat } from '../StudentChestBeat';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const reveal = { gameCode: 'AB12CD', roundId: '77', rarity: 'rare' as const, xp: 35, itemId: 'hat', roundCash: 0, rank: 4, size: 26 };

describe('StudentChestBeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sound.open.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it('given the reveal is still on my rank, then the chest waits sealed and pays out nothing yet', () => {
    render(<StudentChestBeat reveal={reveal} beat="verdict" reduceMotion={false} t={t} />);
    expect(screen.getByTestId('edu-student-chest')).toHaveAttribute('data-phase', 'sealed');
    expect(screen.queryByTestId('edu-student-chest-payout')).toBeNull();
  });

  it('given the chest beat arrives, then the chest shakes, bursts once with a sound, and shows what I got', () => {
    const { rerender } = render(<StudentChestBeat reveal={reveal} beat="verdict" reduceMotion={false} t={t} />);
    rerender(<StudentChestBeat reveal={reveal} beat="chest" reduceMotion={false} t={t} />);
    expect(screen.getByTestId('edu-student-chest')).toHaveAttribute('data-phase', 'shaking');
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByTestId('edu-student-chest')).toHaveAttribute('data-phase', 'bursting');
    act(() => { vi.advanceTimersByTime(700); });
    expect(screen.getByTestId('edu-student-chest')).toHaveAttribute('data-phase', 'revealed');
    expect(sound.open).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('edu-student-chest-payout')).toHaveTextContent('economy.chest.headline.rare');
    expect(screen.getByTestId('edu-student-chest-payout')).toHaveTextContent('Wizard hat');
  });

  it('given reduced motion, then the chest is open with its payout from the first render', () => {
    render(<StudentChestBeat reveal={reveal} beat="done" reduceMotion t={t} />);
    expect(screen.getByTestId('edu-student-chest')).toHaveAttribute('data-phase', 'revealed');
    expect(screen.getByTestId('edu-student-chest-payout')).toBeInTheDocument();
  });

  it('given I tap the sealed chest early, then it skips straight to the payout', () => {
    render(<StudentChestBeat reveal={reveal} beat="rank" reduceMotion={false} t={t} />);
    fireEvent.click(screen.getByTestId('chest-stage'));
    expect(screen.getByTestId('edu-student-chest')).toHaveAttribute('data-phase', 'revealed');
  });

  it('given the server rolled a comeback chest, then the chest says so; otherwise it never does', () => {
    const { unmount } = render(<StudentChestBeat reveal={{ ...reveal, underdog: true }} beat="done" reduceMotion t={t} />);
    expect(screen.getByTestId('chest-comeback')).toHaveTextContent('economy.reward.comeback');
    unmount();
    render(<StudentChestBeat reveal={reveal} beat="done" reduceMotion t={t} />);
    expect(screen.queryByTestId('chest-comeback')).toBeNull();
  });
});
