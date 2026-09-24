/**
 * Visual theme for the unlock reveal, keyed by player-facing rarity. The
 * label/button color is ALWAYS the rarity token hex (lib/avatar/rarity.ts), so
 * a part reads as the same rarity here as in the editor and on the profile.
 * The burst field around it is a deeper, saturated partner of that hex — a
 * silver burst on navy alone would read grey, so rare gets an electric-blue
 * field; epic a molten amber; legendary a prismatic pink/cyan/gold. The
 * reward box the avatar pops out of is dressed in the same rarity.
 */
import { RARITY_TOKENS, type VisualTier } from '@/lib/avatar/rarity';
import { CUTOUT_CSS } from './avatarCutout';

export interface RevealBox {
  face: string;
  light: string;
  shade: string;
  /** Inside the open box (top of the gradient; it brightens toward the glow). */
  inside: string;
  ribbon: string;
  ribbonShade: string;
  /** Rim light the burst throws on the avatar's edges. */
  rim: string;
  /** Light pouring out of the open box. */
  glow: string;
}

export interface RevealTheme {
  /** Rarity token hex — label, CTA, badge face. */
  hex: string;
  /** Hot white-ish center of the burst. */
  core: string;
  /** Saturated field around the center. */
  field: string;
  /** Darker ring before the navy edge. */
  deep: string;
  /** Ray colors, cycled around the conic burst. */
  rays: readonly string[];
  box: RevealBox;
}

export const REVEAL_THEMES: Record<VisualTier, RevealTheme> = {
  common: {
    hex: RARITY_TOKENS.common.hex,
    core: '#FFF1DC',
    field: '#B7773A',
    deep: '#5A3414',
    rays: ['#FFE2B8'],
    box: {
      face: '#D9A56B', light: '#F3D2A2', shade: '#9A6A3A', inside: '#3A2410',
      ribbon: '#BFFF00', ribbonShade: '#86B300', rim: '#FFE2B8', glow: '#FFF1DC',
    },
  },
  rare: {
    hex: RARITY_TOKENS.rare.hex,
    core: '#FFFFFF',
    field: '#2F6BFF',
    deep: '#10307A',
    rays: ['#DCEBFF', '#7FDBFF'],
    box: {
      face: '#DCE6F5', light: '#FFFFFF', shade: '#97ABC9', inside: '#16244A',
      ribbon: '#22E5FF', ribbonShade: '#0FA3C0', rim: '#D8F1FF', glow: '#E8F7FF',
    },
  },
  epic: {
    hex: RARITY_TOKENS.epic.hex,
    core: '#FFFBE0',
    field: '#F29F05',
    deep: '#7A3A00',
    rays: ['#FFF3B0', '#FFD23F'],
    box: {
      face: '#FFC928', light: '#FFF0A8', shade: '#E08A00', inside: '#5A2A00',
      ribbon: '#9B6BFF', ribbonShade: '#6A3FD1', rim: '#FFF1B8', glow: '#FFF6C8',
    },
  },
  legendary: {
    hex: RARITY_TOKENS.legendary.hex,
    core: '#FFFFFF',
    field: '#FF1493',
    deep: '#4B0082',
    rays: ['#FFD700', '#00FFFF', '#FF1493'],
    box: {
      face: '#FF3D9A', light: '#FFB3DA', shade: '#B0106A', inside: '#3A0030',
      ribbon: '#FFD23F', ribbonShade: '#E08A00', rim: '#FFE3F5', glow: '#FFFFFF',
    },
  },
};

/** Repeating conic stripes cycling through the theme's ray colors. */
export function raysGradient(theme: RevealTheme): string {
  const step = 360 / 24;
  const stops: string[] = [];
  for (let i = 0; i < 24; i += 1) {
    const c = theme.rays[i % theme.rays.length];
    const a = i * step;
    stops.push(`${c} ${a}deg ${a + step * 0.34}deg`, `transparent ${a + step * 0.34}deg ${a + step}deg`);
  }
  return `conic-gradient(from 0deg, ${stops.join(', ')})`;
}

/** Deterministic star specks (no Math.random → no hydration drift). */
export const SPECKS: ReadonlyArray<{ x: number; y: number; s: number; d: number }> = Array.from({ length: 34 }, (_, i) => {
  const h = (i * 2654435761) >>> 0;
  return { x: h % 97, y: (h >>> 8) % 95, s: 2 + ((h >>> 16) % 3), d: ((h >>> 4) % 30) / 10 };
});

/** Speed streaks shooting out of the burst center. */
export const STREAKS: ReadonlyArray<{ angle: number; len: number; delay: number }> = [
  { angle: -160, len: 46, delay: 0 },
  { angle: -128, len: 38, delay: 0.5 },
  { angle: -100, len: 30, delay: 1.1 },
  { angle: -62, len: 40, delay: 0.3 },
  { angle: -28, len: 48, delay: 0.8 },
  { angle: 8, len: 36, delay: 1.4 },
  { angle: 34, len: 44, delay: 0.2 },
  { angle: 70, len: 32, delay: 0.9 },
  { angle: 112, len: 42, delay: 0.6 },
  { angle: 146, len: 38, delay: 1.2 },
];

/**
 * Scoped keyframes. Only small elements animate opacity (streaks, specks,
 * whoosh lines); the full-screen layers never fade in. Every entrance is done
 * by ~1s, so the settled frame is the hero frame. Reduced motion (OS setting
 * or data-motion="static") freezes everything at its final frame.
 */
export const REVEAL_CSS = `
@keyframes lcr-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
@keyframes lcr-streak { 0% { transform: rotate(var(--a)) translateX(8vmax) scaleX(0.2); opacity: 0; } 30% { opacity: 1; } 100% { transform: rotate(var(--a)) translateX(58vmax) scaleX(1); opacity: 0; } }
@keyframes lcr-twinkle { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
@keyframes lcr-slam { 0% { transform: scale(2.4) skewX(-8deg); } 60% { transform: scale(0.94) skewX(-8deg); } 100% { transform: scale(1) skewX(-8deg); } }
@keyframes lcr-rise { 0% { transform: translateY(18px); } 100% { transform: translateY(0); } }
@keyframes lcr-burst { 0% { transform: translate(-50%, -50%) scale(0.2) rotate(0deg); } }
@keyframes lcr-flutter { 0%, 100% { transform: rotate(0deg) translateY(0); } 50% { transform: rotate(24deg) translateY(5px); } }
@keyframes lcr-emerge {
  0% { transform: translateY(40%) scale(0.92); }
  55% { transform: translateY(-5%) scale(1.03); }
  78% { transform: translateY(1.5%) scale(0.995); }
  100% { transform: translateY(0) scale(1); }
}
@keyframes lcr-lid {
  0% { transform: translate(26px, 92px) rotate(26deg) scale(0.9); }
  60% { transform: translate(-4px, -6px) rotate(-7deg) scale(1.02); }
  100% { transform: none; }
}
@keyframes lcr-whoosh { 0% { transform: translate(10px, 8px); opacity: 0; } 100% { transform: none; opacity: 0.85; } }
@keyframes lcr-pop-in { 0% { transform: scale(0) rotate(-30deg); } 65% { transform: scale(1.2) rotate(8deg); } 100% { transform: none; } }
@keyframes lcr-float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-3.5px) rotate(5deg); } }
@keyframes lcr-sway { 0%, 100% { transform: rotate(-2.5deg); } 50% { transform: rotate(2.5deg); } }
.lcr-rays { animation: lcr-spin 38s linear infinite; }
.lcr-burst { animation: lcr-burst 900ms cubic-bezier(.12,.9,.3,1) both; }
.lcr-flutter { animation: lcr-flutter 1.8s ease-in-out 900ms infinite; }
.lcr-emerge { animation: lcr-emerge 720ms cubic-bezier(.2,1.2,.35,1) 120ms both; transform-origin: 50% 65%; will-change: transform; }
.lcr-lid { animation: lcr-lid 650ms cubic-bezier(.2,1,.3,1) 60ms both; }
.lcr-whoosh { animation: lcr-whoosh 420ms ease-out 380ms both; }
.lcr-pop-in { animation: lcr-pop-in 480ms cubic-bezier(.2,1.5,.4,1) both; transform-box: fill-box; transform-origin: center; }
.lcr-float { animation: lcr-float 2.6s ease-in-out 1s infinite; transform-box: fill-box; transform-origin: center; }
.lcr-shafts { animation: lcr-sway 7s ease-in-out infinite; transform-origin: 100px 138px; }
.lcr-twinkle { animation: lcr-twinkle 2.4s ease-in-out infinite; }
.lcr-streak { animation: lcr-streak 1.9s cubic-bezier(.3,.6,.4,1) infinite; }
.lcr-slam { animation: lcr-slam 480ms cubic-bezier(.2,1.3,.4,1) 80ms both; }
.lcr-rise { animation: lcr-rise 420ms cubic-bezier(.2,1,.3,1) 260ms both; }
[data-motion="static"] .lcr-anim { animation: none !important; }
[data-motion="static"] .lcr-streak { display: none; }
@media (prefers-reduced-motion: reduce) {
  .lcr-anim { animation: none !important; }
  .lcr-streak { display: none; }
}
${CUTOUT_CSS}
`;
