/**
 * Rarity presentation baked INTO the avatar SVG, so it reads everywhere the
 * avatar goes — including the static PNG (push images, AvatarLite).
 *
 *   common    — clean background, no rarity frame; a circular token only
 *               gets a slate ink edge (the bottom rung of the ring ladder
 *               slate → silver-cyan → purple → gold) so a dark bg still
 *               reads as a disc on a navy page.
 *   rare      — soft light rays + a cool silver-cyan rim.
 *   epic      — violet burst + studded purple frame + twinkling sparkles.
 *   legendary — gold sunburst, faceted gold frame with gems, sparkles and a
 *               sheen sweep. Should look like a prize from across the room.
 *
 * The static frame (no animation) is the hero frame: sparkles are visible at
 * t=0, animation only adds twinkle/rotation on top.
 */
import type { VisualTier } from '@/lib/avatar/rarity';
import { BRAND, INK, Sparkle, WHITE } from './kit';

function rays(count: number, r: number): string {
  const step = (Math.PI * 2) / count;
  const half = step * 0.28;
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = i * step;
    const x1 = 50 + Math.cos(a - half) * r;
    const y1 = 50 + Math.sin(a - half) * r;
    const x2 = 50 + Math.cos(a + half) * r;
    const y2 = 50 + Math.sin(a + half) * r;
    d += `M50 50 L${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
  }
  return d;
}

const RAYS_12 = rays(12, 80);
const RAYS_16 = rays(16, 80);

interface FxProps {
  tier: VisualTier;
  uid: string;
  circular: boolean;
}

/** Behind the character. */
export function RarityBackdrop({ tier, uid }: FxProps) {
  if (tier === 'common') return null;
  if (tier === 'rare') {
    return (
      <g data-rarity-backdrop="rare">
        <path d={RAYS_12} fill={WHITE} opacity="0.16" className="av-rays" />
      </g>
    );
  }
  // The player's bgColor stays the base (it is a pick — sometimes a paid one);
  // the tier adds light ON it: a glow disc behind the head + tinted rays.
  const g = `${uid}-rg`;
  const epic = tier === 'epic';
  return (
    <g data-rarity-backdrop={tier}>
      <defs>
        <radialGradient id={g} cx="50%" cy="46%" r="50%">
          <stop offset="0" stopColor={epic ? '#F6D2FF' : '#FFF8C4'} stopOpacity="0.95" />
          <stop offset="0.45" stopColor={epic ? '#C58BFF' : '#FFD23F'} stopOpacity="0.55" />
          <stop offset="1" stopColor={epic ? BRAND.purple : '#FFB81F'} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={RAYS_16} fill={epic ? '#E3B6FF' : '#FFE680'} opacity={epic ? 0.42 : 0.55} className="av-rays" />
      <circle cx="50" cy="46" r="46" fill={`url(#${g})`} />
    </g>
  );
}

function Ring({ circular, outer, inner, w }: { circular: boolean; outer: string; inner: string; w: number }) {
  if (circular) {
    return (
      <g>
        <circle cx="50" cy="50" r={50 - w / 2 - 0.4} fill="none" stroke={outer} strokeWidth={w + 2.2} />
        <circle cx="50" cy="50" r={50 - w / 2 - 0.4} fill="none" stroke={inner} strokeWidth={w} />
      </g>
    );
  }
  const o = w / 2 + 0.4;
  return (
    <g>
      <rect x={o} y={o} width={100 - o * 2} height={100 - o * 2} rx={16 - o} fill="none" stroke={outer} strokeWidth={w + 2.2} />
      <rect x={o} y={o} width={100 - o * 2} height={100 - o * 2} rx={16 - o} fill="none" stroke={inner} strokeWidth={w} />
    </g>
  );
}

function Gem({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  return (
    <g>
      <path d={`M${x} ${y - r} L${x + r} ${y} L${x} ${y + r} L${x - r} ${y} Z`} fill={fill} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <path d={`M${x} ${y - r} L${x - r} ${y} L${x} ${y} Z`} fill={WHITE} opacity="0.55" />
    </g>
  );
}

/** Over the character, under mode frame / badges. */
export function RarityFrame({ tier, uid, circular, showRing }: FxProps & { showRing: boolean }) {
  if (tier === 'common') return null;
  if (tier === 'rare') {
    return (
      <g data-rarity-frame="rare">
        {showRing && <Ring circular={circular} outer={INK} inner="#BDEBFF" w={2.4} />}
        <Sparkle x={86} y={18} r={3.2} cls="av-tw" />
      </g>
    );
  }
  if (tier === 'epic') {
    return (
      <g data-rarity-frame="epic">
        {showRing && <Ring circular={circular} outer={INK} inner={BRAND.purple} w={3.4} />}
        {showRing && circular && (
          <g fill="#E7D6FF" stroke={INK} strokeWidth="0.8">
            <circle cx="50" cy="2.6" r="1.6" /><circle cx="97.4" cy="50" r="1.6" /><circle cx="2.6" cy="50" r="1.6" />
          </g>
        )}
        <Sparkle x={85} y={17} r={4.6} cls="av-tw" />
        <Sparkle x={14} y={80} r={3.4} cls="av-tw" delay={0.7} />
        <Sparkle x={17} y={22} r={2.4} fill="#FFD6FF" cls="av-tw" delay={1.2} />
      </g>
    );
  }
  const sheen = `${uid}-sheen`;
  const clip = `${uid}-fclip`;
  return (
    <g data-rarity-frame="legendary">
      <defs>
        <linearGradient id={sheen} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={WHITE} stopOpacity="0" />
          <stop offset="0.5" stopColor={WHITE} stopOpacity="0.55" />
          <stop offset="1" stopColor={WHITE} stopOpacity="0" />
        </linearGradient>
        <clipPath id={clip}>
          {circular ? <circle cx="50" cy="50" r="50" /> : <rect x="0" y="0" width="100" height="100" rx="16" />}
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect x="-60" y="-10" width="26" height="120" fill={`url(#${sheen})`} transform="rotate(20 50 50)" className="av-sheen" />
      </g>
      {showRing && (
        <g>
          <Ring circular={circular} outer={INK} inner={BRAND.gold} w={4.2} />
          {circular ? (
            <circle cx="50" cy="50" r="47.4" fill="none" stroke={BRAND.goldLight} strokeWidth="1" strokeDasharray="6 5" opacity="0.9" />
          ) : null}
          <Gem x={50} y={3.2} r={4} fill={BRAND.pink} />
          <Gem x={96.8} y={50} r={3.2} fill={BRAND.cyan} />
          <Gem x={3.2} y={50} r={3.2} fill={BRAND.lime} />
        </g>
      )}
      <Sparkle x={84} y={16} r={5.2} fill="#FFF7C2" cls="av-tw" />
      <Sparkle x={13} y={24} r={3.6} fill="#FFF7C2" cls="av-tw" delay={0.5} />
      <Sparkle x={86} y={78} r={3} fill={WHITE} cls="av-tw" delay={1.1} />
      <Sparkle x={16} y={80} r={4} fill="#FFF7C2" cls="av-tw" delay={0.9} />
    </g>
  );
}

/** Common circular avatars: a plain slate edge. Not a reward, just a rim. */
export function TokenEdge() {
  return (
    <g data-token-edge="">
      <circle cx="50" cy="50" r="48.6" fill="none" stroke={INK} strokeWidth="2.8" />
      <circle cx="50" cy="50" r="48.6" fill="none" stroke="#7D86A8" strokeWidth="1.2" />
    </g>
  );
}
