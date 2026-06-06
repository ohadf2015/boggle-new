/**
 * Pure mascot metadata + resolvers — NO `'use client'`.
 *
 * Lives outside the client boundary so server components (e.g.
 * NativePageEnhancements) can call these during render without tripping
 * "Attempted to call X from the server but X is on the client"
 * (Sentry JAVASCRIPT-NEXTJS-1MQ). The animated <Mascot> component stays in
 * Mascot.tsx ('use client') and re-exports everything here for back-compat.
 */

export type MascotVariant =
  | 'happy'       // winner.webp (dark)
  | 'gaming'      // play.webp (dark)
  | 'thinking'    // question.webp (dark)
  | 'oops'        // oops.webp (dark)
  | 'celebration' // celebration.webp (dark)
  | 'dj'          // dj.webp (dark)
  | 'trophy'      // trophy.webp (dark)
  | 'panic'       // panic.webp (dark)
  | 'crying'      // crying.webp (dark)
  | 'onfire'      // onfire-nobg.webp (nobg)
  | 'bored'       // bored-nobg.webp (nobg)
  | 'mindblown'   // mindblown-nobg.webp (nobg)
  | 'encouraging' // encouraging.webp (white)
  | 'explorer'    // explorer.webp (dark)
  | 'flexing'     // flexing.webp (dark)
  | 'scared'      // scared.webp (white)
  | 'shopkeeper'  // shopkeeper.webp (dark)
  | 'spectating'  // spectating.webp (dark)
  | 'waving'      // waving.webp (white)
  | 'powerup'     // powerup-nobg.webp (nobg)
  | 'sleepy'      // ghostly.webp (dark)
  | 'waiting'     // waiting.webp (dark)
  | 'gg'          // gg.webp (dark)
  | 'scholar'     // scholar.webp (dark)
  | 'rage'        // rage.webp (dark)
  | 'bomber'      // bomber.webp (dark)
  | 'winner'      // winner.webp (dark)
  | 'knight'      // knight.webp (dark)
  | 'sad'         // crying.webp (dark)
  | 'ghostly'     // ghostly.webp (dark)
  | 'dance'       // dance.webp (dark)
  | 'question'    // question.webp (dark)
  | 'trophyNobg'  // trophy-nobg.webp (nobg)
  | 'explorerNobg'// explorer-nobg.webp (nobg)
  | 'cryingNobg'; // crying-nobg.webp (nobg)

/**
 * Background type for each mascot GIF.
 * Determines automatic rendering treatment.
 */
export type MascotBgType = 'dark' | 'white' | 'nobg';

/**
 * Mascot paths — all animated WebP. Replaced MP4s for cross-device compatibility
 * (some Android/iOS/TV browsers fail to autoplay or render H.264 mascots).
 */
export const MASCOT_IMAGES: Record<MascotVariant, string> = {
  happy: '/mascot/winner.webp',
  gaming: '/mascot/play.webp',
  thinking: '/mascot/question.webp',
  oops: '/mascot/oops.webp',
  celebration: '/mascot/celebration.webp',
  dj: '/mascot/dj.webp',
  trophy: '/mascot/trophy.webp',
  panic: '/mascot/panic.webp',
  crying: '/mascot/crying.webp',
  onfire: '/mascot/onfire-nobg.webp',
  bored: '/mascot/bored-nobg.webp',
  mindblown: '/mascot/mindblown-nobg.webp',
  encouraging: '/mascot/encouraging.webp',
  explorer: '/mascot/explorer.webp',
  flexing: '/mascot/flexing.webp',
  scared: '/mascot/scared.webp',
  shopkeeper: '/mascot/shopkeeper.webp',
  spectating: '/mascot/spectating.webp',
  waving: '/mascot/waving.webp',
  powerup: '/mascot/powerup-nobg.webp',
  sleepy: '/mascot/ghostly.webp',
  waiting: '/mascot/waiting.webp',
  gg: '/mascot/gg.webp',
  scholar: '/mascot/scholar.webp',
  rage: '/mascot/rage.webp',
  bomber: '/mascot/bomber.webp',
  winner: '/mascot/winner.webp',
  knight: '/mascot/knight.webp',
  sad: '/mascot/crying.webp',
  ghostly: '/mascot/ghostly.webp',
  dance: '/mascot/dance.webp',
  question: '/mascot/question.webp',
  trophyNobg: '/mascot/trophy-nobg.webp',
  explorerNobg: '/mascot/explorer-nobg.webp',
  cryingNobg: '/mascot/crying-nobg.webp',
};

/**
 * Background type for each mascot variant.
 * - dark: Dark bg matching neo-navy — no clip needed, blends with app bg
 * - white: White bg — auto-clipped to circle with neo border
 * - nobg: Transparent — works on any surface without treatment
 */
export const MASCOT_BG_TYPE: Record<MascotVariant, MascotBgType> = {
  happy: 'dark',
  gaming: 'dark',
  thinking: 'dark',
  oops: 'dark',
  celebration: 'dark',
  dj: 'dark',
  trophy: 'dark',
  panic: 'dark',
  crying: 'dark',
  onfire: 'nobg',
  bored: 'nobg',
  mindblown: 'nobg',
  encouraging: 'white',
  explorer: 'dark',
  flexing: 'dark',
  scared: 'white',
  shopkeeper: 'dark',
  spectating: 'dark',
  waving: 'white',
  powerup: 'nobg',
  sleepy: 'dark',
  waiting: 'dark',
  gg: 'dark',
  scholar: 'dark',
  rage: 'dark',
  bomber: 'dark',
  winner: 'dark',
  knight: 'dark',
  sad: 'dark',
  ghostly: 'dark',
  dance: 'dark',
  question: 'dark',
  trophyNobg: 'nobg',
  explorerNobg: 'nobg',
  cryingNobg: 'nobg',
};

/**
 * Get the image path for a mascot variant.
 */
export function getMascotImagePath(variant: MascotVariant): string {
  return MASCOT_IMAGES[variant];
}

/**
 * Get the background type for a mascot variant.
 */
export function getMascotBgType(variant: MascotVariant): MascotBgType {
  return MASCOT_BG_TYPE[variant];
}

/** Reverse lookup: variant src path → its background type. */
const SRC_TO_BG_TYPE: Record<string, MascotBgType> = Object.fromEntries(
  (Object.keys(MASCOT_IMAGES) as MascotVariant[]).map((v) => [MASCOT_IMAGES[v], MASCOT_BG_TYPE[v]]),
);

/**
 * Resolve a mascot's background type from a raw asset path (for renderers that
 * take a `src` string rather than a variant — e.g. EnhancedEmptyState). Falls
 * back to filename heuristics: `-nobg` → transparent, otherwise opaque dark.
 * Used to drive the `data-mascot-bg` cosy-framing hook.
 */
export function getMascotBgTypeForSrc(src: string): MascotBgType {
  if (SRC_TO_BG_TYPE[src]) return SRC_TO_BG_TYPE[src];
  if (src.includes('-nobg')) return 'nobg';
  return 'dark';
}

/**
 * Check if a variant is rendered as <video> (opaque MP4).
 * Transparent variants use animated WebP via <Image unoptimized>.
 */
export function isVideoVariant(variant: MascotVariant): boolean {
  return MASCOT_IMAGES[variant].endsWith('.mp4');
}

/** @deprecated kept for backward-compat with tests; always true since animated assets bypass Next/Image optimization. */
export function isGifVariant(_variant: MascotVariant): boolean {
  return true;
}
