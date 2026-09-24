/**
 * Torso / outfit ("bodyStyle"). A bust cut off by the frame: shoulders from
 * y≈78 down past the bottom edge. Shirt color is the player's pick.
 */
import type { ReactNode } from 'react';
import { DETAIL, INK, L, O, Shaded, WHITE, shade, tint, type ArtCtx } from './kit';
import { Neck } from './heads';

const SHOULDERS = 'M16 104 Q16 86 31 81 L43 77 Q50 81 57 77 L69 81 Q84 86 84 104 Z';
const BARE = 'M18 104 Q18 87 32 82 L43 78 L57 78 L68 82 Q82 87 82 104 Z';

type BodyFn = (ctx: ArtCtx) => ReactNode;

function Tee(ctx: ArtCtx) {
  const collar = ctx.gender === 'female' ? 'M42 78 Q50 88 58 78' : 'M43 77.5 Q50 84 57 77.5';
  return (
    <g>
      <Neck ctx={ctx} />
      <Shaded ctx={ctx} name="body" d={SHOULDERS} fill={ctx.shirt} dx={3} dy={2}>
        <path d="M24 90 Q30 86 34 88" stroke={tint(ctx.shirt, 0.35)} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
      </Shaded>
      <path d={`${collar} L57 77 Q50 80 43 77 Z`} fill={ctx.skin} />
      <L d={collar} w={DETAIL} />
    </g>
  );
}

function Hoodie(ctx: ArtCtx) {
  const hood = shade(ctx.shirt, 0.22);
  return (
    <g>
      <O d="M30 86 Q30 76 42 75 L58 75 Q70 76 70 86 Z" fill={hood} />
      <Neck ctx={ctx} />
      <Shaded ctx={ctx} name="body" d={SHOULDERS} fill={ctx.shirt} dx={3} dy={2}>
        <path d="M36 104 L38 96 Q50 93 62 96 L64 104" fill="none" stroke={shade(ctx.shirt, 0.25)} strokeWidth="1.2" />
      </Shaded>
      <O d="M38 79 Q50 90 62 79 Q58 76 57 77 Q50 83 43 77 Q42 76 38 79 Z" fill={hood} sw={DETAIL} />
      <L d="M45 84 L44 93" w={1.1} />
      <L d="M55 84 L56 93" w={1.1} />
      <circle cx="44" cy="93.5" r="1.2" fill={WHITE} stroke={INK} strokeWidth="0.7" />
      <circle cx="56" cy="93.5" r="1.2" fill={WHITE} stroke={INK} strokeWidth="0.7" />
    </g>
  );
}

function Suit(ctx: ArtCtx) {
  const jacket = ctx.shirt;
  return (
    <g>
      <Neck ctx={ctx} />
      <Shaded ctx={ctx} name="body" d={SHOULDERS} fill={jacket} dx={3} dy={2} />
      <O d="M43 77.5 L50 84 L57 77.5 L57 104 L43 104 Z" fill={WHITE} sw={DETAIL} />
      <O d="M48.4 83 L51.6 83 L52.6 86 L51 100 L50 102 L49 100 L47.4 86 Z" fill="#E8303F" sw={1} />
      <O d="M43 77.5 L50 84 L46 104 L37 104 L36 86 Z" fill={shade(jacket, 0.12)} sw={DETAIL} />
      <O d="M57 77.5 L50 84 L54 104 L63 104 L64 86 Z" fill={shade(jacket, 0.18)} sw={DETAIL} />
    </g>
  );
}

function Turtleneck(ctx: ArtCtx) {
  const band = shade(ctx.shirt, 0.1);
  return (
    <g>
      <Neck ctx={ctx} />
      <Shaded ctx={ctx} name="body" d={SHOULDERS} fill={ctx.shirt} dx={3} dy={2} />
      <O d="M42 69 L58 69 Q59.5 75 59 81 Q50 84 41 81 Q40.5 75 42 69 Z" fill={band} />
      <g stroke={shade(ctx.shirt, 0.3)} strokeWidth="0.8" strokeLinecap="round">
        <path d="M45 71 L45 81.5 M48.5 71 L48.5 82.5 M51.5 71 L51.5 82.5 M55 71 L55 81.5" />
      </g>
    </g>
  );
}

function OffShoulder(ctx: ArtCtx) {
  return (
    <g>
      <Neck ctx={ctx} />
      <Shaded ctx={ctx} name="skinbody" d={BARE} fill={ctx.skin} dx={2.5} dy={2} />
      <Shaded ctx={ctx} name="body" d="M17 104 Q17 92 24 89 Q50 95 76 89 Q83 92 83 104 Z" fill={ctx.shirt} dx={3} dy={2} />
      <L d="M22 91 Q27 94 31 92 Q36 95 41 93 Q46 96 50 94 Q54 96 59 93 Q64 95 69 92 Q73 94 78 91" w={DETAIL} />
    </g>
  );
}

function CropTop(ctx: ArtCtx) {
  return (
    <g>
      <Neck ctx={ctx} />
      <Shaded ctx={ctx} name="skinbody" d={BARE} fill={ctx.skin} dx={2.5} dy={2} />
      <Shaded ctx={ctx} name="body" d="M26 104 L28 90 Q39 86 50 90 Q61 86 72 90 L74 104 Z" fill={ctx.shirt} dx={3} dy={2} />
      <L d="M33 82.5 L31 89" w={2.4} c={INK} />
      <L d="M67 82.5 L69 89" w={2.4} c={INK} />
      <L d="M33 82.5 L31 89" w={1.1} c={ctx.shirt} />
      <L d="M67 82.5 L69 89" w={1.1} c={ctx.shirt} />
    </g>
  );
}

export const BODIES: Record<string, BodyFn> = {
  default: Tee,
  hoodie: Hoodie,
  suit: Suit,
  turtleneck: Turtleneck,
  offShoulder: OffShoulder,
  cropTop: CropTop,
};

export function Body({ ctx, style }: { ctx: ArtCtx; style: string }) {
  const fn = BODIES[style] ?? Tee;
  return <>{fn(ctx)}</>;
}
