import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
}));

import RelicBar from '../run/RelicBar';
import DraftOverlay from '../DraftOverlay';
import { relicContributions, relicStack } from '@/lib/adventure/play/relicStack';
import type { PublicRun } from '@/lib/adventure/play/runToken';

vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({}) }));

describe('RelicBar live numbers', () => {
  const words = ['house', 'tiger', 'cat'];
  const relics = ['magnet', 'storm-rune'] as const;

  it('Given words this level, then each scoring relic prints its running share under the icon', () => {
    const contrib = relicContributions(words, [...relics]);
    render(<RelicBar relics={[...relics]} contrib={contrib} />);
    expect(screen.getByTestId('relic-contrib-storm-rune').textContent).toBe(`+${contrib['storm-rune']}`);
    expect(screen.getByTestId('relic-contrib-magnet').textContent).toBe(`+${contrib.magnet}`);
  });

  it('Given a tapped relic, then its tooltip shows this level + alone vs stacked numbers', () => {
    const contrib = relicContributions(words, [...relics]);
    const ctx = { levels: [{ words }], owned: [...relics] };
    render(<RelicBar relics={[...relics]} contrib={contrib} stackCtx={ctx} />);
    fireEvent.click(screen.getByRole('button', { name: 'adventurePlay.relic.storm-rune' }));
    const s = relicStack('storm-rune', ctx)!;
    expect(s.combined).toBeGreaterThan(s.alone);
    expect(screen.getByTestId('relic-earned').textContent).toContain(`+${contrib['storm-rune']}`);
    const stack = screen.getByTestId('relic-stack').textContent!;
    expect(stack).toContain(`+${s.alone}`);
    expect(stack).toContain(`+${s.combined}`);
  });
});

describe('DraftOverlay stacked card', () => {
  it('Given an owned magnet, when storm-rune is offered, then the card shows alone struck through → stacked', () => {
    const m = new Map<string, string>([['adv-run-words-w1', JSON.stringify([['house', 'tiger']])]]);
    (globalThis as { sessionStorage?: unknown }).sessionStorage = {
      getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); },
    };
    const run: PublicRun = { w: 1, step: 2, hp: 4, maxHp: 5, relics: ['magnet'], potions: { heal: 0, time: 0, cleanse: 0, insight: 0 }, gold: 0 };
    render(<DraftOverlay offer={[{ type: 'relic', id: 'storm-rune' }]} onPick={() => {}} run={run} />);
    const line = screen.getByTestId('offer-stack').textContent!;
    expect(line).toContain('+10');
    expect(line).toMatch(/\+10→\+\d+/);
  });
});
