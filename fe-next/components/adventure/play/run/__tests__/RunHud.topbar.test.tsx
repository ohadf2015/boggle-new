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
  (globalThis as { sessionStorage?: unknown }).sessionStorage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
  };
}

const base = {
  hp: 3,
  maxHp: 5,
  gold: 42,
  combat: null,
  dispatchCombat: () => {},
  potionsLeft: noPotions,
  onPotion: () => true,
  goal: null,
  playing: true,
};

describe('RunHud — the pinned run bar', () => {
  it('Given a node kind, then the HUD names the room the player is standing in', () => {
    render(<RunHud {...base} nodeKind="elite" relics={['storm-rune']} words={[]} />);
    expect(screen.getByTestId('node-chip').textContent).toContain('adventurePlay.map.kind.elite');
  });

  it('Given relics and gold, then they share the relic row; the room, hearts and potions get their own row', () => {
    render(
      <RunHud {...base} nodeKind="fight" relics={['storm-rune']} words={['house']}
        potionsLeft={{ ...noPotions, heal: 2 }} />,
    );
    const relicRow = screen.getByTestId('run-hud-relics');
    expect(within(relicRow).getByRole('button', { name: 'adventurePlay.relic.storm-rune' })).toBeTruthy();
    expect(within(relicRow).getByText('42')).toBeTruthy();

    const resRow = screen.getByTestId('run-hud-resources');
    expect(within(resRow).getByLabelText(/adventurePlay\.loot\.hearts/)).toBeTruthy();
    expect(within(resRow).getByTestId('node-chip')).toBeTruthy();
    expect(resRow.querySelector('[data-potion="heal"]')).toBeTruthy();
    expect(relicRow.querySelector('[data-potion="heal"]')).toBeNull();
    // The rail owns the full width of its row — the judge gap was relics you could not see.
    expect(relicRow.querySelector('[data-testid="node-chip"]')).toBeNull();
  });

  it('Given an empty relic list, then the bar still holds its place and says so', () => {
    render(<RunHud {...base} nodeKind="fight" relics={[]} words={[]} />);
    expect(screen.getByTestId('run-hud-relics').textContent).toContain('adventurePlay.loot.noRelics');
  });

  it('Given a cleared level earlier in the run, then the tooltip run total counts it, not just this board', () => {
    // Under the branching map a node's step is NOT its level slot — rows 4-7 all play level 6 —
    // so slicing the banked words by `level` silently drops cleared nodes. Six cleared, level 6, step 7.
    const banked = [['planet'], ['stone'], ['river'], ['candle'], ['marble'], ['silver']];
    const words = ['house', 'tiger'];
    seedRunWords(banked);
    render(<RunHud {...base} nodeKind="fight" relics={['storm-rune']} words={words} world={1} level={6} step={7} />);
    fireEvent.click(screen.getByRole('button', { name: 'adventurePlay.relic.storm-rune' }));

    const levelOnly = relicRunContributions([{ words }], ['storm-rune'])['storm-rune']!;
    const line = screen.getByTestId('relic-run').textContent!;
    expect(line).toContain('adventurePlay.loot.earnedThisRun');
    // The run number counts the banked nodes too, so it must beat this board on its own.
    expect(Number(line.match(/\d+/)![0])).toBeGreaterThan(levelOnly);
  });

  it('Given the first node of a run, then the tooltip carries exactly one number line', () => {
    seedRunWords([]);
    render(<RunHud {...base} nodeKind="fight" relics={['storm-rune']} words={['house', 'tiger']} world={1} level={1} step={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'adventurePlay.relic.storm-rune' }));
    expect(screen.getByTestId('relic-run')).toBeTruthy();
    expect(screen.queryByTestId('relic-earned')).toBeNull();
  });
});
