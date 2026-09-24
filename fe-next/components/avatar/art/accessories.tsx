/**
 * Accessories — common set. Every accessory picks a LAYER:
 *   back  — behind the whole character (wings, big ears)
 *   neck  — over the neck/body, under the face (scarves, collars)
 *   front — over hair (hats, glasses, halos)
 * Common accessories take the player's accessory color.
 */
import type { ReactNode } from 'react';
import { BRAND, DETAIL, INK, L, O, Shaded, WHITE, shade, tint, type ArtCtx } from './kit';
import { EyeHeart } from './eyes';

export type AccLayer = 'back' | 'neck' | 'front';

export interface AccDef {
  layer: AccLayer;
  render: (ctx: ArtCtx) => ReactNode;
  /** also draws a back piece (e.g. hat brim behind hair) */
  back?: (ctx: ArtCtx) => ReactNode;
}

/** Accessory color, but never lost against the outline. */
export function accFill(ctx: ArtCtx): string {
  return ctx.acc.toUpperCase() === '#000000' ? '#2A3150' : ctx.acc;
}

function Lens({ cx, cy = 49, r = 7, frame, tintColor, glare = true }: { cx: number; cy?: number; r?: number; frame: string; tintColor?: string; glare?: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={tintColor ?? WHITE} fillOpacity={tintColor ? 0.92 : 0.18} stroke={INK} strokeWidth={DETAIL + 1.6} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={frame} strokeWidth={DETAIL} />
      {glare && <path d={`M${cx - r * 0.55} ${cy - r * 0.15} L${cx - r * 0.1} ${cy - r * 0.6}`} stroke={WHITE} strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />}
    </g>
  );
}

function Temples({ color }: { color: string }) {
  return (
    <g>
      <L d="M33 48 L28 46.5 M67 48 L72 46.5" w={DETAIL + 1.4} />
      <L d="M33 48 L28 46.5 M67 48 L72 46.5" w={DETAIL} c={color} />
    </g>
  );
}

export const ACC_FREE: Record<string, AccDef> = {
  none: { layer: 'front', render: () => null },
  glasses: {
    layer: 'front',
    render: ctx => {
      const c = accFill(ctx);
      return (
        <g>
          <Temples color={c} />
          <L d="M47 48.5 Q50 46.5 53 48.5" w={DETAIL + 1.2} />
          <L d="M47 48.5 Q50 46.5 53 48.5" w={DETAIL - 0.3} c={c} />
          <Lens cx={40} frame={c} />
          <Lens cx={60} frame={c} />
        </g>
      );
    },
  },
  sunglasses: {
    layer: 'front',
    render: ctx => {
      const c = accFill(ctx);
      const lens = (x: number) => `M${x - 8} 44.5 L${x + 8} 44.5 L${x + 7} 51 Q${x} 55.5 ${x - 7} 51 Z`;
      return (
        <g>
          <Temples color={c} />
          <O d={lens(40)} fill="#1D2240" />
          <O d={lens(60)} fill="#1D2240" />
          <L d="M48 45.5 L52 45.5" w={DETAIL + 1} />
          <path d="M42 44.5 L32 44.5 L42 44.5 M62 44.5 L52 44.5" stroke={c} strokeWidth="1.6" />
          <path d="M35 46.8 L39 46.8 M55 46.8 L59 46.8" stroke={WHITE} strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
        </g>
      );
    },
  },
  heartGlasses: {
    layer: 'front',
    render: ctx => (
      <g>
        <Temples color={accFill(ctx)} />
        <L d="M46.5 47 L53.5 47" w={DETAIL + 0.6} />
        <EyeHeart cx={40} cy={48} s={6.4} fill="#FF4F8B" />
        <EyeHeart cx={60} cy={48} s={6.4} fill="#FF4F8B" />
        <path d="M36 45 L38.5 43.2 M56 45 L58.5 43.2" stroke={WHITE} strokeWidth="1.3" strokeLinecap="round" />
      </g>
    ),
  },
  goggles: {
    layer: 'front',
    render: ctx => (
      <g>
        <O d="M24.5 30 Q50 22 75.5 30 L75.5 34 Q50 26 24.5 34 Z" fill={accFill(ctx)} />
        <circle cx="41" cy="29" r="6.4" fill="#8BE8FF" stroke={INK} strokeWidth={DETAIL + 0.8} />
        <circle cx="59" cy="29" r="6.4" fill="#8BE8FF" stroke={INK} strokeWidth={DETAIL + 0.8} />
        <circle cx="41" cy="29" r="6.4" fill="none" stroke="#C9D3E3" strokeWidth="1.2" />
        <circle cx="59" cy="29" r="6.4" fill="none" stroke="#C9D3E3" strokeWidth="1.2" />
        <path d="M38 27 L40 25 M56 27 L58 25" stroke={WHITE} strokeWidth="1.4" strokeLinecap="round" />
      </g>
    ),
  },
  cap: {
    layer: 'front',
    render: ctx => {
      const c = accFill(ctx);
      return (
        <g>
          <Shaded ctx={ctx} name="acc" d="M25 33 Q24 11 50 10 Q76 11 75 33 Q50 28 25 33 Z" fill={c}>
            <path d="M50 11 L50 29 M38 13 Q35 22 36 30 M62 13 Q65 22 64 30" stroke={shade(c, 0.25)} strokeWidth="0.9" fill="none" />
          </Shaded>
          <O d="M21 34 Q50 25 79 34 L80.5 38.5 Q50 31 19.5 38.5 Z" fill={shade(c, 0.12)} />
          <circle cx="50" cy="10.5" r="2" fill={c} stroke={INK} strokeWidth={DETAIL} />
          <circle cx="50" cy="20" r="4.2" fill={WHITE} stroke={INK} strokeWidth={DETAIL} />
          <path d="M48 20.5 L50 18 L52 20.5" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    },
  },
  beanie: {
    layer: 'front',
    render: ctx => {
      const c = accFill(ctx);
      return (
        <g>
          <circle cx="50" cy="7.5" r="4.4" fill={tint(c, 0.4)} stroke={INK} strokeWidth={DETAIL} />
          <Shaded ctx={ctx} name="acc" d="M26 31 Q25 10 50 10 Q75 10 74 31 Z" fill={c}>
            <path d="M38 13 L37 30 M44 11 L43.5 30 M50 10 L50 30 M56 11 L56.5 30 M62 13 L63 30" stroke={shade(c, 0.2)} strokeWidth="0.9" />
          </Shaded>
          <O d="M24 29 Q50 25 76 29 L76.5 36 Q50 32 23.5 36 Z" fill={shade(c, 0.1)} />
        </g>
      );
    },
  },
  headband: {
    layer: 'front',
    render: ctx => (
      <g>
        <O d="M26.5 32 Q50 16 73.5 32 L72.5 35.5 Q50 21 27.5 35.5 Z" fill={accFill(ctx)} />
        <path d="M34 27 Q42 22.5 50 22" stroke={WHITE} strokeWidth="1" fill="none" opacity="0.6" strokeLinecap="round" />
      </g>
    ),
  },
  bandana: {
    layer: 'front',
    render: ctx => {
      const c = accFill(ctx);
      return (
        <g>
          <Shaded ctx={ctx} name="acc" d="M25.5 34 Q24 12 50 11.5 Q76 12 74.5 34 Q50 28 25.5 34 Z" fill={c}>
            <g fill={WHITE} opacity="0.75">
              <circle cx="38" cy="20" r="1.1" /><circle cx="48" cy="16" r="1.1" /><circle cx="58" cy="20" r="1.1" /><circle cx="44" cy="25" r="1.1" /><circle cx="64" cy="26" r="1.1" /><circle cx="33" cy="28" r="1.1" />
            </g>
          </Shaded>
          <O d="M74 30 L82 26 L80 33 Z" fill={c} sw={DETAIL} />
          <O d="M74 31 L83 36 L76 38 Z" fill={shade(c, 0.15)} sw={DETAIL} />
        </g>
      );
    },
  },
  bow: {
    layer: 'front',
    render: ctx => {
      const c = accFill(ctx);
      return (
        <g>
          <O d="M62 18 L52 11 Q49 17 52 25 Z" fill={c} />
          <O d="M62 18 L72 11 Q75 17 72 25 Z" fill={c} />
          <circle cx="62" cy="18" r="3" fill={shade(c, 0.15)} stroke={INK} strokeWidth={DETAIL} />
          <path d="M54 14.5 L55 20" stroke={WHITE} strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
        </g>
      );
    },
  },
  catEars: {
    layer: 'front',
    render: ctx => {
      const c = accFill(ctx);
      return (
        <g>
          <L d="M27 30 Q50 14 73 30" w={3.4} />
          <L d="M27 30 Q50 14 73 30" w={1.6} c={c} />
          <O d="M30 24 L29 8 L42 17 Z" fill={c} />
          <path d="M31.5 21 L31 12.5 L38 17.5 Z" fill="#FF9EC7" />
          <O d="M70 24 L71 8 L58 17 Z" fill={c} />
          <path d="M68.5 21 L69 12.5 L62 17.5 Z" fill="#FF9EC7" />
        </g>
      );
    },
  },
  bunnyEars: {
    layer: 'front',
    render: ctx => {
      const c = accFill(ctx);
      return (
        <g>
          <O d="M38 22 Q30 2 36 -4 Q44 2 44 20 Z" fill={c} />
          <path d="M39 18 Q35 5 37.5 1 Q41.5 6 41.5 17 Z" fill="#FFC2DA" />
          <O d="M56 20 Q58 0 66 -2 Q70 8 62 22 Z" fill={c} />
          <path d="M58.5 18 Q60 4 64.5 2.5 Q66.5 9 61.5 19 Z" fill="#FFC2DA" />
          <L d="M27 30 Q50 14 73 30" w={3.4} />
          <L d="M27 30 Q50 14 73 30" w={1.6} c={c} />
        </g>
      );
    },
  },
  horns: {
    layer: 'front',
    render: () => (
      <g>
        <O d="M33 24 Q27 16 31 8 Q35 16 40 20 Z" fill="#E8303F" />
        <O d="M67 24 Q73 16 69 8 Q65 16 60 20 Z" fill="#E8303F" />
        <path d="M32 18 Q31 13 32 10" stroke={WHITE} strokeWidth="1" fill="none" opacity="0.6" strokeLinecap="round" />
      </g>
    ),
  },
  halo: {
    layer: 'front',
    render: () => (
      <g className="av-float">
        <ellipse cx="50" cy="8" rx="15" ry="4.4" fill="none" stroke={INK} strokeWidth="5" />
        <ellipse cx="50" cy="8" rx="15" ry="4.4" fill="none" stroke={BRAND.gold} strokeWidth="2.8" />
        <path d="M39 6.5 Q44 4.4 50 4.2" stroke={BRAND.goldLight} strokeWidth="1" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  partyHat: {
    layer: 'front',
    render: ctx => {
      const c = accFill(ctx);
      return (
        <g>
          <Shaded ctx={ctx} name="acc" d="M50 -1 L63 22 Q50 26 37 22 Z" fill={c}>
            <path d="M44 10 L56 16 M41 16 L60 22 M47 4 L53 8" stroke={WHITE} strokeWidth="2" opacity="0.8" />
          </Shaded>
          <circle cx="50" cy="-1" r="3" fill={BRAND.lime} stroke={INK} strokeWidth={DETAIL} />
        </g>
      );
    },
  },
  propellerHat: {
    layer: 'front',
    render: ctx => {
      const c = accFill(ctx);
      return (
        <g>
          <Shaded ctx={ctx} name="acc" d="M31 24 Q31 10 50 10 Q69 10 69 24 Q50 20 31 24 Z" fill={c}>
            <path d="M50 10 L50 22 M40 12 L41 22 M60 12 L59 22" stroke={WHITE} strokeWidth="1.6" opacity="0.5" />
          </Shaded>
          <L d="M50 10 L50 5" w={DETAIL + 0.3} />
          <g className="av-spin-prop">
            <O d="M50 5 Q42 1 37 4 Q42 7 50 5 Z" fill={BRAND.cyan} sw={DETAIL} />
            <O d="M50 5 Q58 9 63 6 Q58 3 50 5 Z" fill={BRAND.pink} sw={DETAIL} />
          </g>
          <circle cx="50" cy="5" r="1.5" fill={BRAND.gold} stroke={INK} strokeWidth="0.8" />
        </g>
      );
    },
  },
  earring: {
    layer: 'neck',
    render: () => (
      <g>
        <circle cx="27" cy="59.5" r="2.4" fill="none" stroke={INK} strokeWidth="2.6" />
        <circle cx="27" cy="59.5" r="2.4" fill="none" stroke={BRAND.gold} strokeWidth="1.2" />
        <circle cx="73" cy="59.5" r="2.4" fill="none" stroke={INK} strokeWidth="2.6" />
        <circle cx="73" cy="59.5" r="2.4" fill="none" stroke={BRAND.gold} strokeWidth="1.2" />
      </g>
    ),
  },
  scarf: {
    layer: 'neck',
    render: ctx => {
      const c = accFill(ctx);
      return (
        <g>
          <O d="M55 78 L60 96 L53 97 L50 80 Z" fill={shade(c, 0.15)} />
          <Shaded ctx={ctx} name="acc" d="M37 72 Q50 78 63 72 Q66 76 64 81 Q50 87 36 81 Q34 76 37 72 Z" fill={c}>
            <path d="M40 76 L40 83 M46 78 L46 85 M52 78 L52 85 M58 77 L58 84" stroke={tint(c, 0.4)} strokeWidth="1.4" />
          </Shaded>
        </g>
      );
    },
  },
};
