/**
 * Builds a genre-themed avatar from a player style — opt-in ("only if the user
 * wants"). Genre identity comes from COLOR (shirt + accessory tinted to the
 * style accent) and a relevant accessory/hair piece. Everything else
 * (base/skin/eyes/mouth/eyebrows/nose) stays RANDOMIZED so each generated avatar
 * is unique, per the brief's "keep randomize some of the elements".
 *
 * Accessory/hair tokens are real avatar parts (see shared/types/customAvatar.ts);
 * applying a themed piece is a deliberate styling action, not an ownership grant.
 */

import {
  getRandomAvatarConfig,
  type CustomAvatarConfig,
} from '@/shared/types/customAvatar';
import { getStyle, type PlayerStyleKey } from './styles';

interface AvatarHint {
  accessory: CustomAvatarConfig['accessory']; // AVATAR_ACCESSORIES token (type-checked)
  hair?: CustomAvatarConfig['hair'];           // unisex hair token (applied to either gender)
  accentHair?: boolean;                        // tint hair to the accent too (loud genres)
}

/** Genre → relevant avatar parts. Keys mirror STYLES (default omitted = pure random). */
export const STYLE_AVATAR_HINTS: Partial<Record<PlayerStyleKey, AvatarHint>> = {
  rock: { accessory: 'sunglasses', hair: 'rainbowMohawk', accentHair: true },
  hasidic: { accessory: 'hat' },
  jazz: { accessory: 'hat' },
  arabic: { accessory: 'keffiyeh' },
  epic: { accessory: 'crown' },
  viking: { accessory: 'viking', hair: 'braids' },
  arcade: { accessory: 'cyberpunkVisor', hair: 'vaporwave' },
  latin: { accessory: 'sombrero' },
  reggae: { accessory: 'beanie', hair: 'dreads' },
  japanese: { accessory: 'samurai', hair: 'himecut' },
  desert_epic: { accessory: 'turban' },
  fanfare: { accessory: 'partyHat' },
};

/**
 * Build a themed avatar config for a style. The `default` style (no accent)
 * returns a plain random avatar.
 */
export function buildStyledAvatarConfig(styleKey: PlayerStyleKey): CustomAvatarConfig {
  const cfg = getRandomAvatarConfig();
  const accent = getStyle(styleKey).accentHex;
  if (!accent) return cfg; // default → pure random

  const hint = STYLE_AVATAR_HINTS[styleKey];
  return {
    ...cfg,
    shirtColor: accent,
    accessoryColor: accent,
    ...(hint?.accessory ? { accessory: hint.accessory } : {}),
    ...(hint?.hair ? { hair: hint.hair } : {}),
    ...(hint?.accentHair ? { hairColor: accent } : {}),
  };
}
