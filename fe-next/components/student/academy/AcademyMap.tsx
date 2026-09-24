'use client';

/**
 * The floating-island world. The art "covers" the whole hub (container query
 * units, so no JS measuring), and nodes sit in % of the ART box — so they stay
 * glued to their islands at any viewport. Positions are physical left/top: the
 * picture does not mirror in Hebrew, so neither do its markers.
 *
 * Fewer destinations → fewer islands, and the art zooms in on the stretch of
 * path that is used (`mapFraming`), never padded with placeholders.
 */

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { ISLANDS, CASTLE, MAP_ASPECT } from './academyNodes';
import { mapFraming, placeIslands, type AcademyIsland, type SafeRect } from './academyIslands';
import { AcademyNodeButton } from './AcademyNodeButton';
import { AcademyAmbient } from './AcademyAmbient';

export type MapLayout = 'portrait' | 'landscape';

const LANDSCAPE_QUERY = '(min-aspect-ratio: 1/1)';

/** Where a node may sit, in % of the art, clear of the HUD and the bottom panel. */
const SAFE: Record<MapLayout, SafeRect> = {
  portrait: { x0: 12, x1: 88, y0: 18, y1: 74 },
  landscape: { x0: 8, x1: 92, y0: 24, y1: 72 },
};

function readLayout(): MapLayout {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'portrait';
  return window.matchMedia(LANDSCAPE_QUERY).matches ? 'landscape' : 'portrait';
}

/** Portrait art on a tall screen, landscape on a wide one — one layer, never both. */
export function useMapLayout(): MapLayout {
  const [layout, setLayout] = useState<MapLayout>(readLayout);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(LANDSCAPE_QUERY);
    const onChange = () => setLayout(mq.matches ? 'landscape' : 'portrait');
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return layout;
}

interface Props {
  layout: MapLayout;
  islands: AcademyIsland[];
  boss: AcademyIsland | null;
  recommendedKey: string | null;
  onOpen: (node: AcademyIsland) => void;
  reducedMotion: boolean;
}

export function AcademyMap({ layout, islands, boss, recommendedKey, onOpen, reducedMotion }: Props) {
  const ratio = MAP_ASPECT[layout];
  const points = useMemo(() => placeIslands(islands.length, ISLANDS[layout]), [islands.length, layout]);
  const frame = useMemo(
    () => mapFraming(islands.length ? [...points, ...(boss ? [CASTLE[layout]] : [])] : [], SAFE[layout]),
    [points, boss, layout, islands.length],
  );
  const big = layout === 'landscape';

  return (
    <div data-testid="academy-map" data-layout={layout} className="absolute inset-0 overflow-hidden" style={{ containerType: 'size' }}>
      <div
        data-testid="academy-map-art"
        data-zoom={frame.scale}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-700 ease-out"
        style={{
          // Cover the region: as wide as the region, or as wide as its height
          // demands — whichever is larger. Aspect-ratio derives the height.
          width: `max(100cqw, calc(100cqh * ${ratio.toFixed(4)}))`,
          aspectRatio: String(ratio),
          transform: frame.scale > 1 ? `scale(${frame.scale})` : undefined,
          transformOrigin: `${frame.originX}% ${frame.originY}%`,
        }}
      >
        <Image
          src={`/images/education/academy-map-${layout}.webp`}
          alt=""
          aria-hidden="true"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="pointer-events-none select-none object-cover"
          draggable={false}
        />
        <AcademyAmbient layout={layout} reducedMotion={reducedMotion} />

        {boss && (
          <AcademyNodeButton
            node={boss}
            at={CASTLE[layout]}
            index={islands.length}
            big={big}
            recommended={recommendedKey === boss.key}
            onOpen={onOpen}
            reducedMotion={reducedMotion}
          />
        )}
        {islands.map((node, i) => (
          <AcademyNodeButton
            key={node.key}
            node={node}
            at={points[i]}
            index={i}
            big={big}
            recommended={recommendedKey === node.key}
            onOpen={onOpen}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>
      {/* Ink vignette: the sky darkens toward the chrome so HUD and dock sit IN the scene. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(18,13,51,0.78) 0%, rgba(18,13,51,0) 18%, rgba(18,13,51,0) 70%, rgba(18,13,51,0.92) 100%)',
        }}
      />
    </div>
  );
}
