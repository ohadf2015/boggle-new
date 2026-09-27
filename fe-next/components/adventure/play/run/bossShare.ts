/**
 * The boss-defeat share card: `app/api/og/boss-defeat` rendered for the world
 * the run just cleared. The route existed with zero callers; this is the only
 * place that builds its URL.
 *
 * Two rules, both learned from a broken capture that read "Unknown Boss /
 * WORLD NAN / VICTORY":
 *  - share ART carries no emoji (`no-emojis-share-needs-og-image`), so a
 *    display name is stripped before it reaches the card;
 *  - a field the run cannot supply is LEFT OUT of the URL rather than sent as a
 *    placeholder. The card drops the element it cannot fill, so nothing on a
 *    share image is ever asserted from a missing value. `shareReady` is the
 *    matching client gate: no tap can request a card the run cannot fill.
 */
import { WORLDS_COUNT } from '@/lib/adventure/constants';
import { getWorldConfig } from '@/lib/adventure/worldConfig';
import { stripEmoji, MAX_CARD_TEXT } from '@/lib/adventure/play/bossCard';

export interface BossShareInput {
  world: number;
  /** Best word of the run — the card stamps it as the killing blow. */
  word?: string | null;
  player: string;
  stars?: number | null;
}

const int = (n: unknown): number | null =>
  typeof n === 'number' && Number.isFinite(n) ? Math.floor(n) : null;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Can this run fill a share card? The button stays disabled until it can, so a
 * half-resolved run never rasterizes an image with holes in it.
 */
export function shareReady(input: BossShareInput): boolean {
  const w = int(input.world);
  return w != null && w >= 1 && w <= WORLDS_COUNT
    && int(input.stars) != null
    && !!stripEmoji(String(input.word ?? '')).trim();
}

/** The OG image URL (relative — same origin as the app). */
export function bossDefeatImageUrl({ world, word, player, stars }: BossShareInput): string {
  const w = int(world);
  const params = new URLSearchParams();
  if (w != null && w >= 1 && w <= WORLDS_COUNT) {
    params.set('world', String(w));
    params.set('boss', getWorldConfig(w).bossName);
  }
  const cleanWord = stripEmoji(String(word ?? '')).toUpperCase().slice(0, MAX_CARD_TEXT);
  if (cleanWord) params.set('word', cleanWord);
  const s = int(stars);
  if (s != null) params.set('stars', String(clamp(s, 0, 3)));
  params.set('player', stripEmoji(player).slice(0, MAX_CARD_TEXT) || 'Adventurer');
  return `/api/og/boss-defeat?${params.toString()}`;
}

export const bossShareFilename = (world: number) => {
  const w = int(world);
  return w != null && w >= 1 && w <= WORLDS_COUNT ? `lexiclash-world-${w}.png` : 'lexiclash-adventure.png';
};
