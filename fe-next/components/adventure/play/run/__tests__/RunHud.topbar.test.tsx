import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({
    // Interpolating, so a sentence key with a number in it still renders the number:
    // the tooltip's one surviving figure lives INSIDE its sentence now, not beside it.
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${Object.values(p).join(' ')}` : k),
    language: 'en',
  }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({}) }));

import RunHud from '../../RunHud';
import { relicRunContributions } from '../relicRunTotals';
import type { PotionId } from '@/lib/adventure/play/relics';

const noPotions: Record<PotionId, number> = { heal: 0, time: 0, cleanse: 0, insight: 0 };

/** Words the run has already banked, as `recordRunWords` stores them (one slot per cleared step). */
function seedRunWords(levels: string[][]) {
  const m = new Map<string, string>([['adv-run-words-w1', JSON.stringify(levels)]]);
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
  };
}

const base = {
  hp: 3,
  maxHp: 5,
  gold: 42, // not a prop any more: asserted absent below
  combat: null,
  dispatchCombat: () => {},
  potionsLeft: noPotions,
  onPotion: () => true,
  goal: null,
  playing: true,
};

describe('RunHud — the pinned run bar', () => {
  /**
   * 09-21 DECLUTTER. The bar was two rows (relic strip, then room chip + hearts
   * + purse + four potion sockets) over a stage that repeats the room, and it
   * squeezed the board. In a level it is ONE row of what can be USED right now.
   */
  it('Given a level in play, then the HUD is one row: small relic icons, held potions, hearts — no room chip, no purse', () => {
    render(
      <RunHud {...base} relics={['storm-rune']} words={['house']}
        potionsLeft={{ ...noPotions, heal: 2 }} />,
    );
    const hud = screen.getByTestId('run-hud');
    expect(within(hud).getByRole('button', { name: 'adventurePlay.relic.storm-rune' })).toBeTruthy();
    expect(within(hud).getByLabelText(/adventurePlay\.loot\.hearts/)).toBeTruthy();
    expect(hud.querySelector('[data-potion="heal"]')).toBeTruthy();
    expect(screen.queryByTestId('node-chip')).toBeNull();
    expect(within(hud).queryByText('42')).toBeNull();
    // Numeral pills under every chip were the noisiest thing on the screen; the tap bubble has the detail.
    expect(screen.queryByTestId('relic-tag-storm-rune')).toBeNull();
    expect(screen.queryByTestId('relic-contrib-storm-rune')).toBeNull();
  });

  it('Given potions, then only the ones held are shown', () => {
    render(<RunHud {...base} relics={[]} words={[]} potionsLeft={{ ...noPotions, heal: 1 }} />);
    const hud = screen.getByTestId('run-hud');
    expect(hud.querySelector('[data-potion="heal"]')).toBeTruthy();
    expect(hud.querySelector('[data-potion="time"]')).toBeNull();
  });

  it('Given no relics, then no empty rail is drawn', () => {
    render(<RunHud {...base} relics={[]} words={[]} />);
    expect(screen.queryByText('adventurePlay.loot.noRelics')).toBeNull();
    expect(screen.queryByTestId('run-hud-relics')).toBeNull();
  });

  it('Given a cleared level earlier in the run, then the tooltip run total counts it, not just this board', () => {
    // Under the branching map a node's step is NOT its level slot — rows 4-7 all play level 6 —
    // so slicing the banked words by `level` silently drops cleared nodes. Six cleared, level 6, step 7.
    const banked = [['planet'], ['stone'], ['river'], ['candle'], ['marble'], ['silver']];
    const words = ['house', 'tiger'];
    seedRunWords(banked);
    render(<RunHud {...base} relics={['storm-rune']} words={words} world={1} level={6} step={7} />);
    fireEvent.click(screen.getByRole('button', { name: 'adventurePlay.relic.storm-rune' }));

    const levelOnly = relicRunContributions([{ words }], ['storm-rune'])['storm-rune']!;
    const line = screen.getByTestId('relic-run').textContent!;
    expect(line).toContain('adventurePlay.loot.earnedThisRun');
    // The run number counts the banked nodes too, so it must beat this board on its own.
    expect(Number(line.match(/\d+/)![0])).toBeGreaterThan(levelOnly);
  });

  it('Given the first node of a run, then the tooltip carries exactly one number line', () => {
    seedRunWords([]);
    render(<RunHud {...base} relics={['storm-rune']} words={['house', 'tiger']} world={1} level={1} step={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'adventurePlay.relic.storm-rune' }));
    expect(screen.getByTestId('relic-run')).toBeTruthy();
    expect(screen.queryByTestId('relic-earned')).toBeNull();
  });
});
