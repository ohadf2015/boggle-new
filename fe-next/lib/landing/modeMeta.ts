/**
 * MODE_META — static presentation table for the `cubes` landing variant.
 *
 * SOURCE OF TRUTH for mode *logic* (order, gating, visibility) stays in
 * `LandingChallengeCards`; this table only restates the static per-mode
 * presentation (i18n keys, route, icon, color) so the cube layout can render
 * the SAME computed mode list without duplicating the gating switch. A parity
 * test (`__tests__/modeMeta.test.ts`) pins these to the control switch values.
 *
 * `daily` is intentionally absent — it renders as `DailyChallengeBanner`, never
 * as a generic cube.
 */
import {
  Swords, BookOpen, Map, Bomb, Link2, Brain, Layers, Building2,
  Hammer, Vault, PartyPopper, FlaskConical, ScrollText, Gavel, Grid3x3,
  CloudRain,
  type LucideIcon,
} from 'lucide-react';

export const CUBE_VARIANTS = ['pink', 'cyan', 'purple', 'orange', 'lime', 'blue'] as const;
export type ModeCubeVariant = (typeof CUBE_VARIANTS)[number];

/**
 * Shared LQIP blur for every cube `next/image`. A 4×4 solid `neo-navy` (#1a1a2e)
 * PNG — the SAME colour every cube tile already paints — so the blur-up is
 * seamless (tile shows instantly, the mascot art fades in over an identical
 * navy) and costs one inline 122-byte data URI instead of 16 per-image LQIPs.
 */
export const CUBE_BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR42mOQktKDIwbiOACeNAYhWqpQcwAAAABJRU5ErkJggg==';

export interface ModeMetaEntry {
  /** i18n key for the cube title */
  readonly titleKey: string;
  /** i18n key for the (short) description — cubes may omit it, kept for a11y/title */
  readonly descKey: string;
  /** route suffix appended after `/{language}` (may include a query string) */
  readonly path: string;
  readonly Icon: LucideIcon;
  readonly variant: ModeCubeVariant;
  readonly badge?: string;
  /** existing raster sticker (reused from control cards) */
  readonly modeImage?: string;
  /**
   * Optional generated cube icon (kawaii arcade glyph). When present the cube
   * renders this raster via next/image; otherwise it falls back to `Icon`.
   * Only a tight, consistent set of public modes gets one (perf + brand).
   */
  readonly genIcon?: string;
  /**
   * Per-asset CSS scale for the cube art (default 1). The kawaii stickers are
   * framed inconsistently — blast/daily/adventure bleed their FX to the
   * edges, while practice/connections/wordCraft float small + centred
   * in a wide navy margin. A scale >1 grows the small ones; a scale <1 shrinks
   * an over-large one (e.g. arena's knights, which the wider 2×2 anchor tile
   * zooms via object-cover) to restore margin. The baked navy bg is identical
   * to the tile, so any scale composites seamlessly (no seam). Only caveat: a
   * scale >1 on a true bleeding asset would clip its FX — keep those at 1.
   */
  readonly imgScale?: number;
}

export const MODE_META: Record<string, ModeMetaEntry> = {
  arena: {
    titleKey: 'landing.arena', descKey: 'landing.arenaDesc', path: '/multiplayer',
    Icon: Swords, variant: 'pink', modeImage: '/modes/arena.png', genIcon: '/modes/cubes/arena.png',
    imgScale: 0.82, // anchor (2×2) tile is wider-than-tall → object-cover zooms the knights+burst and clips the navy margin; scale <1 shrinks the box to restore breathing room (baked navy == tile bg, no seam, no clip)
  },
  practice: {
    titleKey: 'landing.practice', descKey: 'landing.practiceDesc', path: '/practice',
    Icon: BookOpen, variant: 'cyan', modeImage: '/modes/practice.png', genIcon: '/modes/cubes/practice.png',
    imgScale: 1.6, // sticker fills ~47% of frame → scale up to read full-bleed
  },
  blast: {
    titleKey: 'landing.blastMode', descKey: 'landing.blastModeDesc', path: '/blast',
    Icon: Bomb, variant: 'orange', badge: 'NEW', modeImage: '/modes/blast.png', genIcon: '/modes/cubes/blast.png',
  },
  adventure: {
    titleKey: 'landing.adventureMode', descKey: 'landing.adventureModeDesc', path: '/adventure',
    Icon: Map, variant: 'lime', badge: 'BETA', modeImage: '/modes/adventure.png', genIcon: '/modes/cubes/adventure.png',
  },
  connections: {
    titleKey: 'landing.wordChainMode', descKey: 'landing.wordChainModeDesc', path: '/connections/play',
    Icon: Link2, variant: 'blue', badge: 'NEW', modeImage: '/modes/connections.png', genIcon: '/modes/cubes/connections.png',
    imgScale: 1.15, // subject ~50% framed; 1.6 over-grew it (hard sticker outline crammed the top edge) → gentle bump that reads full-bleed with margin
  },
  brainGym: {
    titleKey: 'landing.brainTraining', descKey: 'landing.brainTrainingDesc', path: '/brain',
    Icon: Brain, variant: 'purple', modeImage: '/modes/practice.png', genIcon: '/modes/cubes/braingym.png',
    // No imgScale: the character is already large-framed (brain + dumbbell + feet
    // span ~75% of the tile). Upscaling clipped the brain at the top edge and the
    // feet at the bottom, reading oversized — natural framing matches the other tiles.
  },
  wordCraft: {
    titleKey: 'wordcraft.modeTitle', descKey: 'wordcraft.modeDesc', path: '/word-craft',
    Icon: Layers, variant: 'orange', badge: 'NEW', modeImage: '/modes/word-craft.png', genIcon: '/modes/cubes/wordcraft.png',
    imgScale: 1.1, // hammer + anvil already fill ~60% → a gentle bump to match wordForge, not overgrow
  },
  crossword: {
    titleKey: 'crossword.name', descKey: 'crossword.tagline', path: '/crossword',
    Icon: Grid3x3, variant: 'cyan', badge: 'NEW', genIcon: '/modes/cubes/crossword.png',
  },
  // Admin-only dev previews — also carry generated cube icons so the "+ More"
  // grid is full-bleed art across the board. Colours spread to avoid clusters.
  wordTower: {
    titleKey: 'wordTower.cardTitle', descKey: 'wordTower.cardDesc', path: '/word-tower',
    Icon: Building2, variant: 'lime', badge: 'ADMIN', modeImage: '/modes/word-tower.png', genIcon: '/modes/cubes/wordtower.png',
  },
  wordForge: {
    titleKey: 'landing.wordForgeMode', descKey: 'landing.wordForgeModeDesc', path: '/word-forge',
    Icon: Hammer, variant: 'orange', badge: 'ADMIN', genIcon: '/modes/cubes/wordforge.png',
  },
  wordVault: {
    titleKey: 'landing.wordVaultMode', descKey: 'landing.wordVaultModeDesc', path: '/word-vault',
    Icon: Vault, variant: 'cyan', badge: 'ADMIN', genIcon: '/modes/cubes/wordvault.png',
  },
  party: {
    titleKey: 'landing.partyMode', descKey: 'landing.partyModeDesc', path: '/party',
    Icon: PartyPopper, variant: 'pink', badge: 'ADMIN', genIcon: '/modes/cubes/party.png',
  },
  wordAlchemy: {
    titleKey: 'landing.wordAlchemyMode', descKey: 'landing.wordAlchemyModeDesc', path: '/word-alchemy',
    Icon: FlaskConical, variant: 'purple', badge: 'ADMIN', genIcon: '/modes/cubes/wordalchemy.png',
  },
  shiritori: {
    titleKey: 'landing.shiritoriMode', descKey: 'landing.shiritoriModeDesc', path: '/shiritori/solo',
    Icon: ScrollText, variant: 'blue', badge: 'ADMIN', genIcon: '/modes/cubes/shiritori.png',
  },
  sealedBid: {
    titleKey: 'landing.sealedBidMode', descKey: 'landing.sealedBidModeDesc', path: '/sealed-bid',
    Icon: Gavel, variant: 'cyan', badge: 'ADMIN', genIcon: '/modes/cubes/sealedbid.png',
  },
  // Wordfall = Blast V2 (falling-tile blast). Admin/beta dev preview. Shares the
  // blast cube art (same game family) until a bespoke Wordfall sticker exists.
  wordfall: {
    titleKey: 'landing.wordfallMode', descKey: 'landing.wordfallModeDesc', path: '/blast/v2',
    Icon: CloudRain, variant: 'purple', badge: 'ADMIN', genIcon: '/modes/cubes/blast.png',
  },
};

/**
 * Runtime model the `cubes` layout renders — static MODE_META merged with the
 * dynamic, already-gated state computed in `LandingChallengeCards` (live counts,
 * highlight, offline lock, tracking closure). Daily is excluded (banner).
 */
export interface ModeCubeModel {
  readonly key: string;
  readonly title: string;
  readonly href: string;
  readonly variant: ModeCubeVariant;
  readonly Icon: LucideIcon;
  readonly genIcon?: string;
  /** per-asset CSS scale for the cube art (default 1) — see ModeMetaEntry.imgScale */
  readonly imgScale?: number;
  readonly badge?: string;
  /** "Start Here" first-timer spotlight */
  readonly highlighted?: boolean;
  readonly highlightLabel?: string;
  readonly locked?: boolean;
  readonly lockedMessage?: string;
  /** e.g. live "1.2k playing now" — only the arena anchor sets this */
  readonly livePill?: string;
  /** bento role: the anchor gets the 2×2 hero slot, the rest are 1×1 cubes */
  readonly role: 'anchor' | 'normal';
  readonly onClick: () => void;
}

/** Full route for a mode cube, language-prefixed. Returns null for unknown keys. */
export function modeRoute(key: string, language: string): string | null {
  const meta = MODE_META[key];
  if (!meta) return null;
  return `/${language}${meta.path}`;
}
