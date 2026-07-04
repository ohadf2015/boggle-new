import { cn } from '@/lib/utils';
import { getStyleDanceClass } from '@/lib/playerStyle/styleDance';
import type { PlayerStyleKey } from '@/lib/playerStyle/styles';

interface LoadingDancerProps {
  /** A non-`default` style key — its static pose lives at /mascots/styles/<key>.png. */
  styleKey: PlayerStyleKey;
  /** Sizing / layout classes for the mascot box. */
  className?: string;
}

/**
 * Lightweight dancing mascot for LOADING surfaces.
 *
 * A static style pose (~45–94KB PNG) bops via a genre-suited CSS `hero-dance-*`
 * keyframe — the same cheap trick the landing hero uses. Deliberately NOT the
 * pre-rendered animated WebP loop (`DancingMascot`, 294–973KB): loaders paint on
 * the critical path *before* content, so a ~500KB animated asset there stole boot
 * bandwidth from the HTML/JS (measured regression on the homepage loader).
 *
 * No hooks and a plain `<img>` → renders in both server (loading.tsx) and client
 * (dynamic import fallbacks) trees with zero JS.
 */
export function LoadingDancer({ styleKey, className }: LoadingDancerProps) {
  return (
    <div className={cn('relative', getStyleDanceClass(styleKey), className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static pose, no
          optimizer needed; a plain <img> keeps this a zero-JS component. */}
      <img
        src={`/mascots/styles/${styleKey}.png`}
        alt=""
        draggable={false}
        data-testid="dancing-mascot"
        className="w-full h-full object-contain select-none pointer-events-none"
      />
    </div>
  );
}

export default LoadingDancer;
