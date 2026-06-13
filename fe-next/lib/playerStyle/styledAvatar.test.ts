import { describe, it, expect } from 'vitest';
import { buildStyledAvatarConfig, STYLE_AVATAR_HINTS } from './styledAvatar';
import { STYLES } from './styles';
import { isValidCustomAvatar } from '@/shared/types/customAvatar';

describe('buildStyledAvatarConfig', () => {
  it('always returns a valid avatar config', () => {
    for (const key of Object.keys(STYLES)) {
      expect(isValidCustomAvatar(buildStyledAvatarConfig(key as any))).toBe(true);
    }
  });

  it('default style returns a plain random avatar (no genre theming)', () => {
    const cfg = buildStyledAvatarConfig('default');
    // default has no accent → shirt color is not forced to an accent.
    expect(STYLES.default.accentHex).toBeNull();
    expect(isValidCustomAvatar(cfg)).toBe(true);
  });

  it('themes shirt + accessory color to the style accent', () => {
    const cfg = buildStyledAvatarConfig('rock');
    expect(cfg.shirtColor).toBe(STYLES.rock.accentHex);
    expect(cfg.accessoryColor).toBe(STYLES.rock.accentHex);
  });

  it('applies the genre accessory + hair hints', () => {
    const rock = buildStyledAvatarConfig('rock');
    expect(rock.accessory).toBe(STYLE_AVATAR_HINTS.rock!.accessory);
    expect(rock.hair).toBe(STYLE_AVATAR_HINTS.rock!.hair);

    const viking = buildStyledAvatarConfig('viking');
    expect(viking.accessory).toBe('viking');
  });

  it('themes MULTIPLE parts so the avatar reads as the genre', () => {
    const viking = buildStyledAvatarConfig('viking');
    expect(viking.facialHair).toBe('braidedBeard');
    expect(viking.bodyStyle).toBe('turtleneck');
    expect(viking.eyes).toBe('angry');
    expect(viking.mouth).toBe('grin');

    const arcade = buildStyledAvatarConfig('arcade');
    expect(arcade.eyes).toBe('pixelEyes');
    expect(arcade.mouth).toBe('robotMouth');
    expect(arcade.bodyStyle).toBe('hoodie');

    const jazz = buildStyledAvatarConfig('jazz');
    expect(jazz.facialHair).toBe('pencilMustache');
    expect(jazz.bodyStyle).toBe('suit');
  });

  it('every non-default style themes at least 3 parts beyond color', () => {
    for (const key of Object.keys(STYLES)) {
      if (key === 'default') continue;
      const h = STYLE_AVATAR_HINTS[key]!;
      const parts = [h.accessory, h.hair, h.facialHair, h.bodyStyle, h.eyes, h.mouth].filter(Boolean);
      expect(parts.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps randomizable identity fields present (base/eyes/mouth)', () => {
    const cfg = buildStyledAvatarConfig('jazz');
    expect(cfg.base).toBeTruthy();
    expect(cfg.eyes).toBeTruthy();
    expect(cfg.mouth).toBeTruthy();
  });

  it('every non-default style has a hint with an accessory', () => {
    for (const key of Object.keys(STYLES)) {
      if (key === 'default') continue;
      expect(STYLE_AVATAR_HINTS[key]?.accessory).toBeTruthy();
    }
  });
});
