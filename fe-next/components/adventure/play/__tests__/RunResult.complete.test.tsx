import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn() }));
vi.mock('@/components/celebration/BossDefeatFireworks', () => ({ default: () => null }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({}) }));

import RunResult from '../RunResult';

const run = { w: 1, step: 7, hp: 3, maxHp: 5, relics: ['magnet' as const], potions: { heal: 0, time: 0, cleanse: 0, insight: 0 }, gold: 80 };
const base = { score: 400, stars: 2, bestStars: 2, rewards: ['boss-trophy-w1'], validWords: ['planet'], points: [12], totalStars: 30 };
const noop = () => {};

describe('RunResult routing', () => {
  it('Given a boss win, then RUN COMPLETE renders with the skin reveal and 7/7 cleared', () => {
    render(<RunResult world={1} result={{ ...base, won: true, runOver: true, runComplete: true }} run={run} hasNext
      onNext={noop} onRetry={noop} onMap={noop} onEquipSkin={noop} />);
    expect(screen.getByText('adventurePlay.loot.runComplete')).toBeTruthy();
    expect(screen.getByText('adventurePlay.skinUnlocked')).toBeTruthy();
    expect(screen.getByText('7/7')).toBeTruthy();
    expect(screen.getByText('adventurePlay.loot.nextWorld')).toBeTruthy();
  });

  it('Given a death, then RUN OVER renders with the restart button', () => {
    render(<RunResult world={1} result={{ ...base, rewards: [], won: false, runOver: true }} run={{ ...run, step: 3 }} hasNext
      onNext={noop} onRetry={noop} onMap={noop} onEquipSkin={noop} />);
    expect(screen.getByText('adventurePlay.loot.runOver')).toBeTruthy();
    expect(screen.getByTestId('run-restart')).toBeTruthy();
    expect(screen.getByText('2/7')).toBeTruthy();
  });

  it('Given a cleared level, then the LEVEL UP beat plays first, and tapping it leads to the chest flow', () => {
    render(<RunResult world={1} result={{ ...base, rewards: [], won: true, runOver: false, nextRun: { ...run, step: 4, gold: 95 } }} run={{ ...run, step: 3 }} hasNext
      onNext={noop} onRetry={noop} onMap={noop} onEquipSkin={noop} />);
    expect(screen.getByText('adventurePlay.loot.levelUp')).toBeTruthy();
    expect(screen.queryByTestId('loot-continue')).toBeNull();
    fireEvent.click(screen.getByTestId('level-up'));
    expect(screen.getByText('adventurePlay.cleared')).toBeTruthy();
    expect(screen.getByTestId('loot-continue')).toBeTruthy();
  });
});
