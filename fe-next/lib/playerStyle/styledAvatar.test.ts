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
