/**
 * Avatar Eye Parts — barrel
 * Splits 38 SVG variants across category sub-files; preserves EYE_PARTS map + EyePart type.
 */

import { Round, Sleepy, Wink, Happy, Closed, None, Sad, Crying } from './EyePartsBasic';
import { Angry, Curious, Determined, Doe, Wide, Squint, Confident, Relaxed, Focused } from './EyePartsExpressive';
import { Cool, Lashes, MonocleEye, CrossEyed, CatPupils, WingedLiner, SmokyEye } from './EyePartsStyled';
import { Star, Sparkle, Hearts, Dizzy, Cyclops, Laser, Hypno, Money, Alien, Galaxy, FlameEyes, Robot, Void, Infinity, PixelEyes, TargetEyes, Kawaii, GlitchEyes, RainbowEyes, ThirdEye } from './EyePartsFantasy';
import { EYE_PARTS_PREMIUM } from './EyePartsPremium';

export const EYE_PARTS = {
  none: None,
  round: Round,
  sleepy: Sleepy,
  star: Star,
  wink: Wink,
  happy: Happy,
  angry: Angry,
  cool: Cool,
  sparkle: Sparkle,
  hearts: Hearts,
  dizzy: Dizzy,
  cyclops: Cyclops,
  lashes: Lashes,
  monocleEye: MonocleEye,
  crossEyed: CrossEyed,
  laser: Laser,
  hypno: Hypno,
  money: Money,
  alien: Alien,
  crying: Crying,
  galaxy: Galaxy,
  flame: FlameEyes,
  robot: Robot,
  void: Void,
  infinity: Infinity,
  curious: Curious,
  determined: Determined,
  doe: Doe,
  closed: Closed,
  catPupils: CatPupils,
  wide: Wide,
  squint: Squint,
  sad: Sad,
  wingedLiner: WingedLiner,
  smokyEye: SmokyEye,
  confident: Confident,
  relaxed: Relaxed,
  focused: Focused,
  pixelEyes: PixelEyes,
  targetEyes: TargetEyes,
  kawaii: Kawaii,
  glitchEyes: GlitchEyes,
  rainbowEyes: RainbowEyes,
  thirdEye: ThirdEye,
  ...EYE_PARTS_PREMIUM,
} as const;

export type EyePart = keyof typeof EYE_PARTS;
