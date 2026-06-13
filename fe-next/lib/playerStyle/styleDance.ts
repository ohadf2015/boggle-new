/**
 * Per-style "dance" move for the hero mascot.
 *
 * Each player style gets a CSS class whose `@keyframes` (defined in
 * app/globals.css, gated behind `prefers-reduced-motion: no-preference`) makes
 * the mascot bop in a way that suits its genre — rock headbangs, arcade does a
 * blocky 8-bit hop, latin shimmies, reggae chills, etc.
 *
 * This is the LOGIC half (genre → move) and is unit-tested. The motion itself is
 * presentation and is verified by eye. Keep this map in sync with the keyframes
 * block in globals.css and the `STYLE_KEYS` registry.
 */

import type { PlayerStyleKey } from './styles';

export const STYLE_DANCE: Record<PlayerStyleKey, string> = {
  default: 'hero-dance-bob', // gentle friendly bob (also the fallback)
  rock: 'hero-dance-headbang', // sharp downbeat head-snap
  hasidic: 'hero-dance-hop', // springy side-to-side hop
  jazz: 'hero-dance-sway', // smooth lounge sway
  arabic: 'hero-dance-shimmy', // sinuous hip shimmy
  epic: 'hero-dance-stomp', // heavy march stomp
  viking: 'hero-dance-headbutt', // big rocking headbutt
  arcade: 'hero-dance-8bit', // blocky stepped hop
  latin: 'hero-dance-salsa', // quick salsa side-step
  reggae: 'hero-dance-skank', // laid-back off-beat skank
  japanese: 'hero-dance-bounce', // dainty cute bounce
  desert_epic: 'hero-dance-dune', // slow swaying dune drift
  fanfare: 'hero-dance-triumph', // chest-out triumphant pulse
};

const FALLBACK = STYLE_DANCE.default;

/** Genre-suited dance class for a (possibly untrusted) style key. */
export function getStyleDanceClass(key: PlayerStyleKey): string {
  return STYLE_DANCE[key] ?? FALLBACK;
}
