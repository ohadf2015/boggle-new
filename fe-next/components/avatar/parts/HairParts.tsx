/** Avatar Hair Parts — barrel. Implementations split across hairShared + 6 group files. */
import { type FC } from 'react';

import { None, type HairPartProps } from './hairShared';
import { HAIR_PARTS_CLASSIC } from './HairPartsClassic';
import { HAIR_PARTS_VOLUME } from './HairPartsVolume';
import { HAIR_PARTS_FANTASY } from './HairPartsFantasy';
import { HAIR_PARTS_MODERN } from './HairPartsModern';
import { HAIR_PARTS_TRENDY } from './HairPartsTrendy';
import { HAIR_PARTS_FEMININE } from './HairPartsFeminine';
import { HAIR_FRONT_MAP } from './HairPartsFront';

export const HAIR_PARTS = {
  none: None,
  spiky: HAIR_PARTS_CLASSIC.spiky,
  curly: HAIR_PARTS_CLASSIC.curly,
  long: HAIR_PARTS_CLASSIC.long,
  buzz: HAIR_PARTS_CLASSIC.buzz,
  mohawk: HAIR_PARTS_CLASSIC.mohawk,
  bob: HAIR_PARTS_CLASSIC.bob,
  ponytail: HAIR_PARTS_CLASSIC.ponytail,
  afro: HAIR_PARTS_VOLUME.afro,
  wavy: HAIR_PARTS_VOLUME.wavy,
  pigtails: HAIR_PARTS_VOLUME.pigtails,
  topknot: HAIR_PARTS_CLASSIC.topknot,
  sideshave: HAIR_PARTS_VOLUME.sideshave,
  dreads: HAIR_PARTS_VOLUME.dreads,
  braids: HAIR_PARTS_VOLUME.braids,
  bun: HAIR_PARTS_VOLUME.bun,
  bangs: HAIR_PARTS_VOLUME.bangs,
  twintails: HAIR_PARTS_VOLUME.twintails,
  mullet: HAIR_PARTS_VOLUME.mullet,
  combover: HAIR_PARTS_CLASSIC.combover,
  trumpSwoop: HAIR_PARTS_CLASSIC.trumpSwoop,
  elvis: HAIR_PARTS_CLASSIC.elvis,
  ramen: HAIR_PARTS_CLASSIC.ramen,
  flame: HAIR_PARTS_FANTASY.flame,
  galaxy: HAIR_PARTS_FANTASY.galaxy,
  neon: HAIR_PARTS_FANTASY.neon,
  pixie: HAIR_PARTS_FANTASY.pixie,
  undercut: HAIR_PARTS_FANTASY.undercut,
  spaceBuns: HAIR_PARTS_FANTASY.spaceBuns,
  lightning: HAIR_PARTS_FANTASY.lightning,
  rainbowMohawk: HAIR_PARTS_FANTASY.rainbowMohawk,
  iceSpikes: HAIR_PARTS_FANTASY.iceSpikes,
  cottonCandy: HAIR_PARTS_FANTASY.cottonCandy,
  vaporwave: HAIR_PARTS_FANTASY.vaporwave,
  straight: HAIR_PARTS_MODERN.straight,
  fade: HAIR_PARTS_MODERN.fade,
  cornrows: HAIR_PARTS_MODERN.cornrows,
  wolfCut: HAIR_PARTS_MODERN.wolfCut,
  curtainBangs: HAIR_PARTS_MODERN.curtainBangs,
  halfUp: HAIR_PARTS_MODERN.halfUp,
  himecut: HAIR_PARTS_MODERN.himecut,
  frenchBob: HAIR_PARTS_MODERN.frenchBob,
  shag: HAIR_PARTS_TRENDY.shag,
  flatTop: HAIR_PARTS_TRENDY.flatTop,
  lob: HAIR_PARTS_TRENDY.lob,
  fingerWaves: HAIR_PARTS_TRENDY.fingerWaves,
  curlyBangs: HAIR_PARTS_TRENDY.curlyBangs,
  quiff: HAIR_PARTS_TRENDY.quiff,
  sideSwept: HAIR_PARTS_TRENDY.sideSwept,
  fadeCurly: HAIR_PARTS_TRENDY.fadeCurly,
  frizzle: HAIR_PARTS_VOLUME.frizzle,
  durag: HAIR_PARTS_VOLUME.durag,
  locsShort: HAIR_PARTS_VOLUME.locsShort,
  /* Femme-only girly styles */
  heartBuns: HAIR_PARTS_FEMININE.heartBuns,
  sideBow: HAIR_PARTS_FEMININE.sideBow,
  milkmaidBraids: HAIR_PARTS_FEMININE.milkmaidBraids,
  butterflyClips: HAIR_PARTS_FEMININE.butterflyClips,
  lowPigtailsBow: HAIR_PARTS_FEMININE.lowPigtailsBow,
  princessBraid: HAIR_PARTS_FEMININE.princessBraid,
  sideBraidBow: HAIR_PARTS_FEMININE.sideBraidBow,
} as const;

export type HairPart = keyof typeof HAIR_PARTS;

export const HAIR_FRONT_PARTS: Partial<Record<HairPart, FC<HairPartProps>>> = HAIR_FRONT_MAP;
