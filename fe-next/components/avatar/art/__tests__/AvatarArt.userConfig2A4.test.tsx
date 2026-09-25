import { render } from '@testing-library/react';
import AvatarArt from '../AvatarArt';
import type { CustomAvatarConfig } from '@/components/avatar/avatarConfig';

// Sentry JAVASCRIPT-NEXTJS-2A4: this exact stored config crashed /sv/profile with
// "Objects are not valid as a React child (found: object with keys {uid, gender, base, skin, ...})".
const stored = {
  base: 'square', eyes: 'monocleEye', hair: 'none', mouth: 'oh', gender: 'male', bgColor: '#00FFFF',
  eyeColor: '#3B82F6', eyebrows: 'raised', accessory: 'frogHat', bodyStyle: 'turtleneck',
  hairColor: '#2C1B18', noseStyle: 'none', skinColor: '#FFDBB4', facialHair: 'none',
  shirtColor: '#00897B', accessoryColor: '#000000',
} as unknown as CustomAvatarConfig;

describe('AvatarArt with a stored profile config (2A4)', () => {
  it.each([false, true])('renders without throwing (animated=%s)', (animated) => {
    expect(() => render(<AvatarArt config={stored} uid="97f44a22" size={96} animated={animated} />)).not.toThrow();
  });
});

import { PartThumb } from '@/lib/avatar/catalog';
import { CANONICAL_PARTS, LEGACY_CATEGORIES } from '@/lib/avatar/legacyMap';

describe('PartThumb with the 2A4 stored config', () => {
  it('renders every part without throwing', () => {
    const bad: string[] = [];
    for (const cat of LEGACY_CATEGORIES) {
      for (const id of CANONICAL_PARTS[cat]) {
        try { render(<PartThumb category={cat} id={id} config={stored} />).unmount(); }
        catch (e) { bad.push(`${cat}:${id} ${(e as Error).message.slice(0, 60)}`); }
      }
    }
    expect(bad).toEqual([]);
  });
});

import { AVATAR_MOODS } from '@/lib/avatar/avatarMood';

describe('AvatarArt 2A4 config × every mood/overlay/mode/crop', () => {
  it('renders every combination without throwing', () => {
    const bad: string[] = [];
    const modes = [undefined, 'multiplayer', 'singleplayer', 'brain', 'practice'] as const;
    for (const mood of [undefined, ...AVATAR_MOODS]) for (const overlay of [null, 'alert', 'flame'] as const)
      for (const mode of modes) for (const crop of ['full', 'face'] as const) for (const animated of [false, true])
        for (const circular of [false, true]) {
          try {
            render(<AvatarArt config={stored} uid="u1" mood={mood} overlay={overlay} mode={mode} crop={crop}
              animated={animated} circular={circular} tierMarker />).unmount();
          } catch (e) { bad.push(`${mood}/${overlay}/${mode}/${crop}/${animated}/${circular}: ${(e as Error).message.slice(0, 50)}`); }
        }
    expect(bad).toEqual([]);
  });
});
