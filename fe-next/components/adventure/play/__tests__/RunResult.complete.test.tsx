import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn() }));
vi.mock('@/components/celebration/BossDefeatFireworks', () => ({ default: () => null }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({}) }));
// BossShareButton stamps the player's name on the share card.
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile: { display_name: 'Tester' } }) }));

import RunResult from '../RunResult';

const run = { w: 1, step: 7, hp: 3, maxHp: 5, relics: ['magnet' as const], potions: { heal: 0, time: 0, cleanse: 0, insight: 0 }, gold: 80 };
const base = { score: 400, stars: 2, bestStars: 2, rewards: ['boss-trophy-w1'], validWords: ['planet'], points: [12], totalStars: 30 };
const noop = () => {};

describe('RunResult routing', () => {
  it('Given a boss win, then RUN COMPLETE renders with the skin reveal and 7/8 cleared', () => {
    render(<RunResult world={1} result={{ ...base, won: true, runOver: true, runComplete: true }} run={run} hasNext
      onNext={noop} onRetry={noop} onMap={noop} onEquipSkin={noop} />);
    expect(screen.getByText('adventurePlay.loot.runComplete')).toBeTruthy();
    expect(screen.getByText('adventurePlay.skinUnlocked')).toBeTruthy();
    expect(screen.getByText('7/8')).toBeTruthy();
    expect(screen.getByText('adventurePlay.loot.nextWorld')).toBeTruthy();
  });

  // --- The run-complete screen is the ONLY home of the share button and of the
  // fullscreen level-up (`celebrate`). A live boss kill is gated behind level
  // rules an automated solver cannot satisfy, so these assert the wiring here.

  it('Given a boss win, then the boss-defeat share button is offered', () => {
    render(<RunResult world={1} result={{ ...base, won: true, runOver: true, runComplete: true }} run={run} hasNext
      onNext={noop} onRetry={noop} onMap={noop} onEquipSkin={noop} />);
    expect(screen.getByTestId('boss-share')).toBeTruthy();
  });

  it('Given a boss win that paid coins, then the ecosystem strip counts them beside the XP', () => {
    render(<RunResult world={1} result={{ ...base, won: true, runOver: true, runComplete: true, xpGained: 60, coinsGained: 40, leaderboardPoints: 500 }} run={run} hasNext
      onNext={noop} onRetry={noop} onMap={noop} onEquipSkin={noop} />);
    expect(screen.getByTestId('eco-strip')).toBeTruthy();
    // Coins only ever pay on elite/boss, so this pairing exists nowhere else.
    expect(screen.getByText('adventurePlay.eco.coins')).toBeTruthy();
    expect(screen.getByText('adventurePlay.eco.xp')).toBeTruthy();
    expect(screen.getByText('adventurePlay.eco.points')).toBeTruthy();
  });

  it('Given a boss win that levelled the account, then the rank ribbon names the new title', () => {
    render(<RunResult world={1} result={{ ...base, won: true, runOver: true, runComplete: true, xpGained: 900, levelUp: { newLevel: 5, levelsGained: 1, newTitles: ['WORD_SEEKER'] } }} run={run} hasNext
      onNext={noop} onRetry={noop} onMap={noop} onEquipSkin={noop} />);
    const ribbon = screen.getByTestId('eco-rank-ribbon');
    expect(ribbon.textContent).toContain('adventurePlay.eco.rank:{"level":5}');
    // The title is looked up under `landing.home.titles.<LEVEL_TITLES key>` —
    // the key xpManager actually emits, not a display string.
    expect(ribbon.textContent).toContain('landing.home.titles.WORD_SEEKER');
  });

  it('Given a boss win with no ecosystem movement, then no strip and no ribbon are drawn', () => {
    render(<RunResult world={1} result={{ ...base, won: true, runOver: true, runComplete: true }} run={run} hasNext
      onNext={noop} onRetry={noop} onMap={noop} onEquipSkin={noop} />);
    expect(screen.queryByTestId('eco-strip')).toBeNull();
    expect(screen.queryByTestId('eco-rank-ribbon')).toBeNull();
  });

  it('Given a death, then RUN OVER renders with the restart button', () => {
    render(<RunResult world={1} result={{ ...base, rewards: [], won: false, runOver: true }} run={{ ...run, step: 3 }} hasNext
      onNext={noop} onRetry={noop} onMap={noop} onEquipSkin={noop} />);
    expect(screen.getByText('adventurePlay.loot.runOver')).toBeTruthy();
    expect(screen.getByTestId('run-restart')).toBeTruthy();
    expect(screen.getByText('2/8')).toBeTruthy();
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
