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
import { ISLANDS, CASTLE, MAP_ASPECT, type IslandPoint } from './academyNodes';
import { focusShift, mapFraming, placeIslands, type AcademyIsland, type SafeRect } from './academyIslands';
import { AcademyNodeButton } from './AcademyNodeButton';
import { AcademyAmbient } from './AcademyAmbient';
import type { Tone } from './chrome';

/** Beam light per spotlight tone (r,g,b). */
const BEAM_RGB: Partial<Record<Tone, string>> = { gold: '255,238,160', pink: '255,130,200', teal: '140,245,235' };

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
  /** Short word over the spotlit island — the SAME word the hero button leads with. */
  spotlightTag?: string;
  /** …and the same colour. */
  spotlightTone?: Tone;
  onOpen: (node: AcademyIsland) => void;
  reducedMotion: boolean;
}

/** Light falling on the ONE recommended island, and a hush over everything else. */
function Spotlight({ at, still, tone }: { at: IslandPoint; still: boolean; tone: Tone }) {
  const rgb = BEAM_RGB[tone] ?? BEAM_RGB.gold;
  return (
    <>
      <span
        aria-hidden="true"
        data-testid="academy-spotlight"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${at.x}% ${at.y - 4}%, rgba(18,13,51,0) 0%, rgba(18,13,51,0) 13%, rgba(18,13,51,0.38) 34%, rgba(18,13,51,0.5) 70%)`,
        }}
      />
      {/* The beam: soft on every edge (a horizontal falloff inside a flared
          wedge, faded in from the sky and out into the island's glow). */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -translate-x-1/2 mix-blend-screen"
        style={{
          left: `${at.x}%`,
          top: 0,
          height: `${Math.max(8, at.y + 2)}%`,
          width: '26%',
          clipPath: 'polygon(40% 0, 60% 0, 100% 100%, 0 100%)',
          background:
            `linear-gradient(90deg, rgba(${rgb},0) 0%, rgba(${rgb},0.1) 22%, rgba(${rgb},0.75) 50%, rgba(${rgb},0.1) 78%, rgba(${rgb},0) 100%)`,
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 35%, #000 72%, transparent 100%)',
          maskImage: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 35%, #000 72%, transparent 100%)',
          animation: still ? undefined : 'academy-beam 3.2s ease-in-out infinite',
        }}
      />
      {!still && <style>{'@keyframes academy-beam { 0%,100% { opacity: .65; } 50% { opacity: 1; } }'}</style>}
    </>
  );
}

export function AcademyMap({ layout, islands, boss, recommendedKey, spotlightTag, spotlightTone = 'gold', onOpen, reducedMotion }: Props) {
  const ratio = MAP_ASPECT[layout];
  const points = useMemo(() => placeIslands(islands.length, ISLANDS[layout]), [islands.length, layout]);
  const all = useMemo(
    () => (islands.length ? [...points, ...(boss ? [CASTLE[layout]] : [])] : []),
    [points, boss, layout, islands.length],
  );
  const frame = useMemo(() => mapFraming(all, SAFE[layout]), [all, layout]);
  const focusIndex = islands.findIndex((n) => n.key === recommendedKey);
  const focus: IslandPoint | null =
    focusIndex >= 0 ? points[focusIndex] : boss && recommendedKey === boss.key ? CASTLE[layout] : null;
  const lean = useMemo(() => focusShift(all, frame, focus, SAFE[layout]), [all, frame, focus, layout]);
  const big = layout === 'landscape';
  const still = reducedMotion;
  const transform = [
    lean.dx || lean.dy ? `translate(${lean.dx}%, ${lean.dy}%)` : '',
    frame.scale > 1 ? `scale(${frame.scale})` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div data-testid="academy-map" data-layout={layout} className="absolute inset-0 overflow-hidden" style={{ containerType: 'size' }}>
      <div
        data-testid="academy-map-art"
        data-zoom={frame.scale}
        data-lean={`${lean.dx},${lean.dy}`}
        className="absolute left-1/2 top-1/2 transition-transform duration-1000 ease-out"
        style={{
          // Cover the region: as wide as the region, or as wide as its height
          // demands — whichever is larger. Aspect-ratio derives the height.
          width: `max(100cqw, calc(100cqh * ${ratio.toFixed(4)}))`,
          aspectRatio: String(ratio),
          // Zoom about the used stretch, then lean toward the spotlit island.
          // (`translate` is in % of the art box — the unit the points use.)
          transform: `translate(-50%, -50%)${transform ? ` ${transform}` : ''}`,
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
        {/* The locked castle sits in shadow until its words are mastered. */}
        {boss && boss.state === 'locked' && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(ellipse ${big ? '16% 30%' : '34% 14%'} at ${CASTLE[layout].x}% ${CASTLE[layout].y}%, rgba(14,10,40,0.62) 0%, rgba(14,10,40,0.4) 55%, rgba(14,10,40,0) 100%)`,
            }}
          />
        )}
        {focus && <Spotlight at={focus} still={still} tone={spotlightTone} />}

        {boss && (
          <AcademyNodeButton
            node={boss}
            at={CASTLE[layout]}
            index={islands.length}
            big={big}
            recommended={recommendedKey === boss.key}
            tag={recommendedKey === boss.key ? spotlightTag : undefined}
            tone={spotlightTone}
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
            tag={recommendedKey === node.key ? spotlightTag : undefined}
            tone={spotlightTone}
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
