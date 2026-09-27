import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({}) }));

import DraftOverlay from '../DraftOverlay';
import { recordRunWords } from '../runStorage';
import { offerValue } from '../run/offerValue';
import type { PublicRun } from '@/lib/adventure/play/runToken';

const run: PublicRun = { w: 1, step: 2, hp: 4, maxHp: 5, relics: [], potions: { heal: 1, time: 0, cleanse: 0, insight: 0 }, gold: 30 };

describe('DraftOverlay live card values', () => {
  beforeEach(() => {
    const m = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); },
    };
  });

  it('Given words from level 1 of this run, then each card prints its value for THIS run, and the detail names the rarity', () => {
    const words = ['planet', 'garden', 'cat', 'house'];
    recordRunWords(1, 1, words);
    const offer = [{ type: 'relic' as const, id: 'magnet' as const }, { type: 'relic' as const, id: 'twin-ink' as const }, { type: 'heal' as const, amount: 2 }];
    render(<DraftOverlay offer={offer} onPick={() => {}} run={run} />);
    const chips = screen.getAllByTestId('offer-value');
    expect(chips).toHaveLength(3);
    const magnet = offerValue(offer[0], { levels: [words], run });
    expect(magnet.params.n).toBeGreaterThan(0);
    expect(chips[0].textContent).toContain(magnet.big);
    expect(chips[2].textContent).toContain('4 → 5');
    fireEvent.click(screen.getByTestId('draft-card-0'));
    expect(screen.getByRole('dialog').textContent).toContain('adventurePlay.loot.rarity.rare');
  });
});
