import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({}) }));

import RunHud from '../../RunHud';
import { initCombat } from '@/lib/adventure/play/combat';
import type { PotionId } from '@/lib/adventure/play/relics';

const noPotions: Record<PotionId, number> = { heal: 0, time: 0, cleanse: 0, insight: 0 };

function telegraphing() {
  const c = initCombat({ enemyId: 'foe-w1', world: 1, enemyHp: 200, hp: 5, maxHp: 5, relics: [], size: 4, seed: 's' });
  return {
    ...c,
    telegraph: { attack: c.script.phases[0][0], startedAt: 0, endsAt: 3000 },
    projectiles: [{ id: 1, damage: 1, landsAt: 1800 }],
  };
}

describe('RunHud — a rival winding up never reflows the screen', () => {
  it('Given an ordinary fight whose rival is telegraphing, then the band grows no alert row or deflect button', () => {
    // The board below is sized to what the band leaves over: a row appearing
    // here pushed the stage down and SHRANK the grid mid-attack.
    render(<RunHud hp={5} maxHp={5} gold={0} combat={telegraphing()} dispatchCombat={() => {}}
      potionsLeft={noPotions} onPotion={() => true} goal={null} playing combatControls />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('adventurePlay.incoming')).toBeNull();
    expect(screen.queryByText('adventurePlay.deflect')).toBeNull();
  });

  it('Given the run bar, then the hearts are the landing spot for the rival\'s shot', () => {
    const { container } = render(<RunHud hp={3} maxHp={5} gold={0} combat={null} dispatchCombat={() => {}}
      potionsLeft={noPotions} onPotion={() => true} goal={null} playing />);
    expect(container.querySelector('[data-player-hearts]')).not.toBeNull();
  });
});
