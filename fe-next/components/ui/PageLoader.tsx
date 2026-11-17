import { cn } from '@/lib/utils';
import type { MascotVariant } from './mascotData';

interface PageLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  /** Picks the loader pose; variants without transparent art fall back to the default pose. */
  mascotVariant?: MascotVariant;
  /** Inside a flex parent that must be allowed to shrink (Suspense fallbacks, panels). */
  nested?: boolean;
  className?: string;
  /** Preload the mascot at high priority. Route boundaries pass false so it never competes with first paint. */
  priority?: boolean;
}

const DEFAULT_ART = '/mascot/hello-nobg.webp';

// Transparent art only: the dark-backed poses showed as a square against the page pattern.
const LOADER_ART: Partial<Record<MascotVariant, string>> = {
  thinking: '/mascot/bridge-think-nobg.webp',
  explorer: '/mascot/explorer-nobg.webp',
  explorerNobg: '/mascot/explorer-nobg.webp',
  spectating: '/mascot/popcorn-nobg.webp',
  waiting: '/mascot/waiting-hop-nobg.webp',
  onfire: '/mascot/onfire-nobg.webp',
  powerup: '/mascot/powerup-nobg.webp',
  celebration: '/mascot/bridge-cheer-nobg.webp',
  sleepy: '/mascot/sleepy-nobg.webp',
};

const SIZES = {
  sm: { mascot: 64, tile: 'size-2.5', gap: 'gap-2', text: 'text-xs' },
  md: { mascot: 88, tile: 'size-3', gap: 'gap-3', text: 'text-sm' },
  lg: { mascot: 116, tile: 'size-3.5', gap: 'gap-4', text: 'text-base' },
} as const;

const TILE_COLORS = ['bg-neo-lime', 'bg-neo-pink', 'bg-neo-cyan'] as const;

/** Page/section loading state: hopping mascot over three bouncing tiles. CSS-only, so SSR and client paint the same frame. */
export function PageLoader({
  size = 'lg',
  text,
  mascotVariant = 'happy',
  nested = false,
  className,
  priority = true,
}: PageLoaderProps) {
  const s = SIZES[size];

  return (
    <div
      role="status"
      aria-busy="true"
      data-testid="page-loader"
      className={cn('flex flex-1 items-center justify-center', nested && 'min-h-0', className)}
    >
      <div className={cn('lc-loader-in flex flex-col items-center', s.gap)}>
        <div className="relative flex flex-col items-center" style={{ width: s.mascot }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static transparent pose; a plain img keeps this server-renderable */}
          <img
            src={LOADER_ART[mascotVariant] ?? DEFAULT_ART}
            alt=""
            width={s.mascot}
            height={s.mascot}
            decoding="async"
            fetchPriority={priority ? 'high' : undefined}
            draggable={false}
            data-testid="loader-mascot"
            className="lc-loader-hop relative z-10 select-none object-contain drop-shadow-[0_4px_0_rgb(var(--neo-black)/0.35)]"
          />
          <span aria-hidden className="lc-loader-shadow -mt-3 h-2 w-3/5 rounded-[50%] bg-neo-black/35" />
        </div>
        <div aria-hidden className="flex items-end gap-2">
          {TILE_COLORS.map((color) => (
            <span
              key={color}
              data-testid="loader-tile"
              className={cn('lc-loader-tile rounded-[3px] border-2 border-neo-black shadow-hard-sm', s.tile, color)}
            />
          ))}
        </div>
        {text && <p className={cn('font-neo-body font-semibold text-center px-4', s.text)}>{text}</p>}
      </div>
    </div>
  );
}

export default PageLoader;
