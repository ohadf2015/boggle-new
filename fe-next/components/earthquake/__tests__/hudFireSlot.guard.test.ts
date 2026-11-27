import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const root = join(__dirname, '../../..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

/** The fire chip portals into a HUD slot; a game HUD without one shows no fire badge at all. */
const GAME_HUDS = [
  'components/game/in-game/components/PortraitLayout.tsx',
  'components/singleplayer/game/SoloGameLayout.tsx',
  'components/multiplayer/round/MpRoundHud.tsx',
];

describe('every in-game HUD hosts the fire-round chip', () => {
  it.each(GAME_HUDS)('%s renders a HUD_FIRE_SLOT', (file) => {
    expect(read(file)).toMatch(/\[HUD_FIRE_SLOT\]|<GameHud\b|<GameTimerBar\b/);
  });

  it('the overlays still mount the chip for every HUD that hosts the slot', () => {
    expect(read('components/game/in-game/components/GameOverlays.tsx')).toMatch(/<FireRoundIndicator /);
  });
});
