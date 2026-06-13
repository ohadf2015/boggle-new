/**
 * Builds a genre-themed avatar from a player style — opt-in ("only if the user
 * wants"). The avatar gets MULTIPLE parts that read as the genre (accessory,
 * hair, facial hair, clothing, eyes, mouth) plus accent-tinted shirt/accessory.
 * Identity fields that don't carry genre meaning — face shape, skin tone, eye
 * color, eyebrows, nose — stay RANDOMIZED so every generated avatar is unique
 * ("keep randomize some of the elements").
 *
 * Tokens are real avatar parts (shared/types/customAvatar.ts) and are typed
 * against the config field unions, so an invalid token fails the type-check.
 * Facial hair only renders on male-gendered bases (female → 'none' by the
 * renderer), which is fine — it themes when applicable, never breaks.
 */

import {
  getRandomAvatarConfig,
  type CustomAvatarConfig,
} from '@/shared/types/customAvatar';
import { getStyle, type PlayerStyleKey } from './styles';

interface AvatarHint {
  accessory: CustomAvatarConfig['accessory'];
  hair?: CustomAvatarConfig['hair'];
  facialHair?: CustomAvatarConfig['facialHair'];
  bodyStyle?: NonNullable<CustomAvatarConfig['bodyStyle']>;
  eyes?: CustomAvatarConfig['eyes'];
  mouth?: CustomAvatarConfig['mouth'];
  accentHair?: boolean; // tint hair to the accent too (loud genres)
}

/** Genre → relevant avatar parts. Keys mirror STYLES (default omitted = pure random). */
export const STYLE_AVATAR_HINTS: Partial<Record<PlayerStyleKey, AvatarHint>> = {
  rock: { accessory: 'sunglasses', hair: 'rainbowMohawk', accentHair: true, bodyStyle: 'hoodie', eyes: 'cool', mouth: 'smirk' },
  hasidic: { accessory: 'hat', facialHair: 'fullBeard', bodyStyle: 'suit', eyes: 'relaxed', mouth: 'closedSmile' },
  jazz: { accessory: 'hat', facialHair: 'pencilMustache', bodyStyle: 'suit', eyes: 'relaxed', mouth: 'pipe' },
  arabic: { accessory: 'keffiyeh', facialHair: 'shortBeard', eyes: 'determined', mouth: 'smile' },
  epic: { accessory: 'crown', facialHair: 'shortBeard', bodyStyle: 'suit', eyes: 'determined', mouth: 'smirk' },
  viking: { accessory: 'viking', hair: 'braids', facialHair: 'braidedBeard', bodyStyle: 'turtleneck', eyes: 'angry', mouth: 'grin' },
  arcade: { accessory: 'cyberpunkVisor', hair: 'vaporwave', bodyStyle: 'hoodie', eyes: 'pixelEyes', mouth: 'robotMouth' },
  latin: { accessory: 'sombrero', eyes: 'happy', mouth: 'grin' },
  reggae: { accessory: 'beanie', hair: 'dreads', facialHair: 'goatee', eyes: 'relaxed', mouth: 'smile' },
  japanese: { accessory: 'samurai', hair: 'himecut', bodyStyle: 'turtleneck', eyes: 'focused', mouth: 'closedSmile' },
  desert_epic: { accessory: 'turban', facialHair: 'fullBeard', eyes: 'determined', mouth: 'flat' },
  fanfare: { accessory: 'partyHat', eyes: 'star', mouth: 'grin' },
};

/**
 * Build a themed avatar config for a style. The `default` style (no accent)
 * returns a plain random avatar. Themed parts are applied over a random base;
 * unspecified fields keep their random value.
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
    ...(hint?.facialHair ? { facialHair: hint.facialHair } : {}),
    ...(hint?.bodyStyle ? { bodyStyle: hint.bodyStyle } : {}),
    ...(hint?.eyes ? { eyes: hint.eyes } : {}),
    ...(hint?.mouth ? { mouth: hint.mouth } : {}),
    ...(hint?.accentHair ? { hairColor: accent } : {}),
  };
}
