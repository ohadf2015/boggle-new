import './testT';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playAchievementSound: vi.fn(), playCountdownBeep: vi.fn() }) }));

import { BlastWaveClear } from '../BlastWaveClear';
import { getWaveTheme } from '../waveTheme';

const base = {
  wave: 3,
  waveScore: 240,
  words: 9,
  clearPct: 96,
  reward: { coins: 50, stars: 3 as const, chestBonus: 25 },
  runScoreBefore: 400,
  runCoinsBefore: 30,
  runDiamondsBefore: 1,
  waveDiamonds: 2,
  recordWave: 0,
};

describe('BlastWaveClear', () => {
  afterEach(() => vi.useRealTimers());

  it('slams the stars earned and tallies score, coins and diamonds', () => {
    render(<BlastWaveClear {...base} onContinue={vi.fn()} autoContinueMs={6000} />);
    expect(screen.getByText('blastProgress.cleared{"wave":3}')).toBeInTheDocument();
    expect(screen.getAllByTestId('blast-clear-star').filter((s) => s.dataset.earned === 'true')).toHaveLength(3);
    expect(screen.getByTestId('blast-clear-tally-score')).toHaveTextContent('+240');
    expect(screen.getByTestId('blast-clear-tally-coins')).toHaveTextContent('+75');
    expect(screen.getByTestId('blast-clear-tally-diamonds')).toHaveTextContent('+2');
  });

  it('shows the wave haul by gem color, dimming the colors not found, and the best word', () => {
    render(<BlastWaveClear {...base} waveGems={{ emerald: 2, ruby: 1 }} bestWord="jumping" onContinue={vi.fn()} autoContinueMs={6000} />);
    const slot = (k: string) => screen.getByTestId('blast-clear-gems').querySelector(`[data-gem-slot="${k}"]`) as HTMLElement;
    expect(slot('emerald')).toHaveTextContent('×2');
    expect(slot('emerald').dataset.gemFound).toBe('true');
    expect(slot('ruby')).toHaveTextContent('×1');
    expect(slot('sapphire').dataset.gemFound).toBe('false');
    expect(screen.getByTestId('blast-results-best-word')).toHaveTextContent('JUMPING');
  });

  it('frames the chase: who this wave passed, the weekly standing and the next rival', () => {
    const ladder = { rank: 10, total: 50, personalBest: 100, rivals: [{ name: 'Ann', score: 420 }, { name: 'Bo', score: 900 }] };
    render(<BlastWaveClear {...base} ladder={ladder} onContinue={vi.fn()} autoContinueMs={6000} />);
    expect(screen.getByTestId('blast-clear-passed')).toHaveTextContent('blastProgress.passedOne{"name":"Ann"}');
    expect(screen.getByTestId('blast-clear-standing')).toHaveTextContent('"rank":9');
    expect(screen.getByTestId('blast-clear-target')).toHaveAttribute('data-kind', 'rival');
  });

  it('teases the next wave with its theme and has one primary action', () => {
    render(<BlastWaveClear {...base} onContinue={vi.fn()} autoContinueMs={6000} />);
    const next = getWaveTheme(4);
    expect(screen.getByTestId('blast-clear-next')).toHaveAttribute('data-theme', next.id);
    expect(screen.getByText(next.nameKey)).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button')).toHaveTextContent('blastProgress.play{"wave":4}');
  });

  it('previews the boss prize multiplier when the boss is next', () => {
    render(<BlastWaveClear {...base} wave={4} onContinue={vi.fn()} autoContinueMs={6000} />);
    expect(screen.getByTestId('blast-clear-next')).toHaveAttribute('data-theme', 'boss');
    expect(screen.getByTestId('blast-clear-next-reward')).toHaveTextContent(`blastProgress.bigReward{"mult":"${getWaveTheme(5).params.rewardMultiplier}"}`);
  });

  it('flags a new furthest wave', () => {
    render(<BlastWaveClear {...base} recordWave={3} onContinue={vi.fn()} autoContinueMs={6000} />);
    expect(screen.getByTestId('blast-clear-next')).toHaveTextContent('blastProgress.record');
  });

  it('auto-continues once after the countdown', () => {
    vi.useFakeTimers();
    const onContinue = vi.fn();
    render(<BlastWaveClear {...base} onContinue={onContinue} autoContinueMs={3000} />);
    act(() => { vi.advanceTimersByTime(2900); });
    expect(onContinue).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(200); });
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('continues on tap without a second auto fire', () => {
    vi.useFakeTimers();
    const onContinue = vi.fn();
    render(<BlastWaveClear {...base} onContinue={onContinue} autoContinueMs={3000} />);
    fireEvent.click(screen.getByRole('button'));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
