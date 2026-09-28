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
  // moods×overlays×modes×crops ≈ 480 renders. animated×circular used to be
  // nested here too (~1920 total) and regularly blew vitest's 30s testTimeout
  // on CI shard 6 — master went red after #1168 and again after Nearpod #1169
  // even though those PRs' own suites were green. animated/circular stay covered
  // by the first describe + the smoke cases below.
  it('renders every mood/overlay/mode/crop without throwing', { timeout: 90_000 }, () => {
    const bad: string[] = [];
    const modes = [undefined, 'multiplayer', 'singleplayer', 'brain', 'practice'] as const;
    for (const mood of [undefined, ...AVATAR_MOODS])
      for (const overlay of [null, 'alert', 'flame'] as const)
        for (const mode of modes)
          for (const crop of ['full', 'face'] as const) {
            try {
              render(<AvatarArt config={stored} uid="u1" mood={mood} overlay={overlay} mode={mode} crop={crop}
                tierMarker />).unmount();
            } catch (e) {
              bad.push(`${mood}/${overlay}/${mode}/${crop}: ${(e as Error).message.slice(0, 50)}`);
            }
          }
    expect(bad).toEqual([]);
  });

  it.each([
    { animated: true, circular: false },
    { animated: false, circular: true },
    { animated: true, circular: true },
  ])('renders animated=$animated circular=$circular without throwing', ({ animated, circular }) => {
    expect(() =>
      render(
        <AvatarArt config={stored} uid="u1" animated={animated} circular={circular} tierMarker />,
      ).unmount(),
    ).not.toThrow();
  });
});
