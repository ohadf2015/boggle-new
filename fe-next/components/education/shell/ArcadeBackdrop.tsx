import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

type Shape = 'circle' | 'triangle' | 'diamond' | 'square' | 'plus';

interface Piece {
  shape: Shape;
  color: string;
  pos: string;
  size: string;
  dur: number;
  delay: number;
}

// Pinned to the edges and corners so the busiest text column in the middle stays clear.
const PIECES: Piece[] = [
  { shape: 'circle', color: 'text-neo-cyan', pos: '-top-10 start-[6%]', size: 'size-44', dur: 34, delay: 0 },
  { shape: 'triangle', color: 'text-neo-pink', pos: 'top-[18%] -end-8', size: 'size-40', dur: 28, delay: -9 },
  { shape: 'diamond', color: 'text-neo-yellow', pos: 'bottom-[8%] start-[2%]', size: 'size-32', dur: 24, delay: -4 },
  { shape: 'square', color: 'text-neo-purple', pos: '-bottom-12 end-[14%]', size: 'size-48', dur: 38, delay: -16 },
  { shape: 'plus', color: 'text-neo-orange', pos: 'bottom-[38%] -start-6', size: 'size-20', dur: 22, delay: -7 },
  { shape: 'circle', color: 'text-neo-pink', pos: 'top-[6%] end-[34%]', size: 'size-16', dur: 26, delay: -12 },
];

function ShapeSvg({ shape }: { shape: Shape }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 6, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 100 100" className="size-full overflow-visible">
      {shape === 'circle' ? <circle cx="50" cy="50" r="44" {...common} /> : null}
      {shape === 'triangle' ? <path d="M50 6 94 90H6Z" {...common} /> : null}
      {shape === 'diamond' ? <path d="M50 4 96 50 50 96 4 50Z" {...common} /> : null}
      {shape === 'square' ? <rect x="8" y="8" width="84" height="84" rx="10" {...common} /> : null}
      {shape === 'plus' ? <path d="M38 6h24v32h32v24H62v32H38V62H6V38h32Z" {...common} /> : null}
    </svg>
  );
}

export function ArcadeBackdrop({ className }: { className?: string }) {
  return (
    <div
      data-testid="arcade-backdrop"
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 -z-10 overflow-hidden',
        '[background-image:radial-gradient(color-mix(in_srgb,var(--neo-cream)_9%,transparent)_1.5px,transparent_1.6px)] [background-size:28px_28px]',
        className,
      )}
    >
      {PIECES.map((p, i) => (
        <span
          key={i}
          data-testid="arcade-shape"
          className={cn('absolute block animate-edu-drift opacity-[0.13]', p.color, p.pos, p.size)}
          style={{ '--edu-drift-dur': `${p.dur}s`, animationDelay: `${p.delay}s` } as CSSProperties}
        >
          <ShapeSvg shape={p.shape} />
        </span>
      ))}
    </div>
  );
}
