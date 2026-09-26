/**
 * Sticker art for the lobby mode tiles — the lobby's answer to Gartic's
 * illustrated preset cards. Inline SVG (no image requests, crisp at TV scale),
 * drawn in the brand's neo-brutalist hand: flat electric fills, one heavy ink
 * outline, a hard offset shadow. Decorative only: the tile's label names it.
 */
import type { ReactNode } from 'react';
import { MODE_ICONS, type GameModeOption } from '@/components/GameModeSelector';
import { cn } from '@/lib/utils';

const INK = '#0b0b14';
const C = {
  lime: 'var(--neo-lime, #bfff00)',
  pink: 'var(--neo-pink, #ff1493)',
  cyan: 'var(--neo-cyan, #00ffff)',
  purple: 'var(--neo-purple, #8b5cf6)',
  orange: 'var(--neo-orange, #ff8a00)',
  cream: 'var(--neo-cream, #fff8e7)',
  yellow: '#ffd400',
};
const S = { stroke: INK, strokeWidth: 2.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** One letter tile with a hard shadow. */
function Tile({ x, y, ch, fill = C.cream, size = 16 }: { x: number; y: number; ch: string; fill?: string; size?: number }) {
  return (
    <g>
      <rect x={x + 2} y={y + 2} width={size} height={size} rx={3} fill={INK} />
      <rect x={x} y={y} width={size} height={size} rx={3} fill={fill} {...S} />
      <text x={x + size / 2} y={y + size * 0.72} textAnchor="middle" fontFamily="var(--font-fredoka, Fredoka), system-ui, sans-serif" fontWeight={800} fontSize={size * 0.62} fill={INK}>
        {ch}
      </text>
    </g>
  );
}

const ART: Partial<Record<GameModeOption, ReactNode>> = {
  // Two tumbling dice.
  random: (
    <>
      <g transform="rotate(-14 22 26)">
        <rect x={10} y={14} width={22} height={22} rx={5} fill={INK} transform="translate(2 2)" />
        <rect x={10} y={14} width={22} height={22} rx={5} fill={C.pink} {...S} />
        {[[16, 20], [26, 30], [21, 25]].map(([cx, cy]) => <circle key={`${cx}${cy}`} cx={cx} cy={cy} r={2.2} fill={INK} />)}
      </g>
      <g transform="rotate(12 44 22)">
        <rect x={34} y={10} width={20} height={20} rx={5} fill={INK} transform="translate(2 2)" />
        <rect x={34} y={10} width={20} height={20} rx={5} fill={C.cyan} {...S} />
        {[[39, 15], [49, 15], [39, 25], [49, 25]].map(([cx, cy]) => <circle key={`${cx}${cy}`} cx={cx} cy={cy} r={2} fill={INK} />)}
      </g>
    </>
  ),
  // A 2×2 board with a traced word.
  classic: (
    <>
      <Tile x={14} y={6} ch="L" fill={C.lime} />
      <Tile x={33} y={6} ch="E" fill={C.lime} />
      <Tile x={14} y={25} ch="X" />
      <Tile x={33} y={25} ch="I" fill={C.lime} />
      <path d="M22 14 L41 14 L41 33" fill="none" stroke={INK} strokeWidth={2} strokeDasharray="0 4" strokeLinecap="round" opacity={0.55} />
    </>
  ),
  // A letter caught in the crosshair.
  'word-hunt': (
    <>
      <Tile x={24} y={14} ch="?" />
      <circle cx={32} cy={22} r={15} fill="none" stroke={INK} strokeWidth={6} opacity={0.9} />
      <circle cx={32} cy={22} r={15} fill="none" stroke={C.pink} strokeWidth={3} />
      {[[32, 3, 32, 9], [32, 35, 32, 41], [13, 22, 19, 22], [45, 22, 51, 22]].map(([x1, y1, x2, y2]) => (
        <line key={`${x1}${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} {...S} strokeWidth={3} />
      ))}
    </>
  ),
  // The letter wheel, mid-spin.
  'wheel-rush': (
    <>
      <circle cx={34} cy={26} r={17} fill={INK} />
      <circle cx={32} cy={24} r={17} fill={C.purple} {...S} />
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const r = (deg * Math.PI) / 180;
        return <circle key={deg} cx={32 + Math.cos(r) * 11} cy={24 + Math.sin(r) * 11} r={3.2} fill={C.cream} stroke={INK} strokeWidth={1.5} />;
      })}
      <circle cx={32} cy={24} r={4.5} fill={C.lime} stroke={INK} strokeWidth={2} />
      <path d="M8 12 q-4 12 2 22 M56 12 q4 12 -2 22" fill="none" stroke={C.lime} strokeWidth={2.5} strokeLinecap="round" />
    </>
  ),
  // A lit bomb.
  blast: (
    <>
      <circle cx={30} cy={29} r={15} fill={INK} transform="translate(2 2)" />
      <circle cx={30} cy={29} r={15} fill="#2a2a44" {...S} />
      <path d="M24 22 a8 8 0 0 1 8 -4" fill="none" stroke={C.cream} strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />
      <rect x={34} y={11} width={8} height={7} rx={1.5} transform="rotate(35 38 14)" fill="#2a2a44" {...S} />
      <path d="M41 11 q4 -6 9 -4" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M51 1 l2 5 5 1 -4 3 1 5 -4 -3 -5 2 2 -5 -3 -4 5 0 z" fill={C.yellow} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={52} cy={8} r={2} fill={C.orange} />
    </>
  ),
};

export function ModeArt({ mode, className }: { mode: GameModeOption; className?: string }) {
  const art = ART[mode];
  if (!art) {
    // Admin previews keep their line icon, scaled up to sit in the same slot.
    return (
      <span data-testid={`mode-art-${mode}`} aria-hidden="true" className={cn('inline-flex items-center justify-center [&_svg]:w-3/5 [&_svg]:h-3/5', className)}>
        {MODE_ICONS[mode]}
      </span>
    );
  }
  return (
    <svg data-testid={`mode-art-${mode}`} aria-hidden="true" focusable="false" viewBox="0 0 64 48" className={className}>
      {art}
    </svg>
  );
}
