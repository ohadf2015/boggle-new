/**
 * TDD RED: Multiplayer layouts should render DynamicEnergyBackground
 *
 * Gap: Singleplayer has a living animated background (vortex, aurora, particles)
 * that multiplayer lacks, making multiplayer feel flat/static.
 */

import fs from 'fs';
import path from 'path';

const portraitSource = fs.readFileSync(
  path.resolve(__dirname, '../in-game/components/PortraitLayout.tsx'),
  'utf-8'
);

describe('DynamicEnergyBackground in multiplayer layouts', () => {
  describe('PortraitLayout', () => {
    it('should import DynamicEnergyBackground', () => {
      expect(portraitSource).toContain('DynamicEnergyBackground');
    });

    it('should render DynamicEnergyBackground', () => {
      expect(portraitSource).toContain('<DynamicEnergyBackground');
    });
  });
});
