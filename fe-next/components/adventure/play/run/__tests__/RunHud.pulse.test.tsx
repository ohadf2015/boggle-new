import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useMasterMute', () => ({
  useMasterMute: () => ({ allMuted: false, toggle: vi.fn(), label: 'Mute', title: 'Sound on' }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({}) }));

import RunHud from '../../RunHud';
import type { HitEvent } from '../../events';
import type { PotionId } from '@/lib/adventure/play/relics';

const noPotions: Record<PotionId, number> = { heal: 0, time: 0, cleanse: 0, insight: 0 };

const base = {
  hp: 4,
  maxHp: 5,
  gold: 10,
  combat: null,
  dispatchCombat: () => {},
  potionsLeft: noPotions,
  onPotion: () => true,
  goal: null,
  playing: true,
  nodeKind: 'fight' as const,
};

const hit = (word: string): HitEvent => ({ id: 1, word, pts: 20, result: 'ok' });

/** The icon for `id`, so a test asserts on the relic itself — not on a stray label. */
const icon = (id: string) => document.querySelector(`[data-relic="${id}"]`) as HTMLElement | null;

describe('RunHud — the relic flash on a word', () => {
  it('Given a long word, then only the relic it triggered flashes, tagged with what it added', () => {
    // sharp-quill is ×1.5 at 6+ letters; storm-rune is +5 at exactly 5. "stretch" is 7.
    render(
      <RunHud {...base} relics={['sharp-quill', 'storm-rune']} words={['stretch']} lastHit={hit('stretch')} />,
    );
    expect(icon('sharp-quill')?.dataset.firing).toBe('true');
    expect(icon('storm-rune')?.dataset.firing).toBeUndefined();
    // The tag is thrown FROM the relic that fired, not as a stray label somewhere on the HUD.
    expect(screen.getByTestId('relic-fire-sharp-quill').textContent).toBe('+50%');
    expect(screen.queryByTestId('relic-fire-storm-rune')).toBeNull();
  });

  it('Given a rejected word, then nothing flashes — the glow only ever means points landed', () => {
    render(
      <RunHud {...base} relics={['sharp-quill']} words={[]}
        lastHit={{ id: 2, word: 'stretch', pts: 0, result: 'invalid' }} />,
    );
    expect(icon('sharp-quill')?.dataset.firing).toBeUndefined();
  });

  it('Given an order-gated relic, then it flashes on the run\'s first word and not on the next one', () => {
    // twin-ink doubles the word at index 0 only. `words` already holds the submitted word,
    // so its own position IS the count of words credited before it — the index applyRelics uses.
    const first = render(<RunHud {...base} relics={['twin-ink']} words={['house']} lastHit={hit('house')} />);
    expect(icon('twin-ink')?.dataset.firing).toBe('true');
    expect(screen.getByTestId('relic-fire-twin-ink').textContent).toBe('×2');
    first.unmount();

    render(<RunHud {...base} relics={['twin-ink']} words={['house', 'tiger']} lastHit={{ ...hit('tiger'), id: 3 }} />);
    expect(icon('twin-ink')?.dataset.firing).toBeUndefined();
  });

  it('Given a stat relic in a fight, then vampire-fang flashes on a 6+ letter word', () => {
    render(
      <RunHud {...base} relics={['vampire-fang']} words={['stretch']} lastHit={hit('stretch')}
        combat={{ hp: 8, maxHp: 10, shields: 0, guard: false, now: 0, projectiles: [], defeated: false, dead: false } as never} />,
    );
    expect(icon('vampire-fang')?.dataset.firing).toBe('true');
  });
});
