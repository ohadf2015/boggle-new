/** Resolved config → the colors every part draws with. */
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { luminance, shade, shadeFor, tint, type ArtCtx } from './kit';
import { headFor } from './heads';

export function buildCtx(cfg: CustomAvatarConfig, uid: string, animated: boolean): ArtCtx {
  const head = headFor(cfg.base);
  const skin = head.costume ?? cfg.skinColor;
  const hair = cfg.hairColor;
  const hairLum = luminance(hair);
  const gender = cfg.gender === 'female' ? 'female' : 'male';
  return {
    uid,
    gender,
    base: cfg.base,
    skin,
    skinShade: shadeFor(skin),
    hair,
    hairShade: shadeFor(hair),
    hairLight: tint(hair, hairLum < 0.25 ? 0.32 : 0.45),
    brow: hairLum > 0.55 ? shade(hair, 0.45) : shade(hair, 0.15),
    eye: cfg.eyeColor ?? '#4A6FA5',
    acc: cfg.accessoryColor,
    accShade: shade(cfg.accessoryColor, 0.2),
    shirt: cfg.shirtColor ?? (gender === 'female' ? '#E85D9B' : '#4A90D9'),
    animated,
  };
}

