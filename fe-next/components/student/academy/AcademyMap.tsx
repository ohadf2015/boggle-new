'use client';

/**
 * The floating-island world. The art is a px rect solved per viewport by
 * `fitArt` — cover when that keeps every island on screen, otherwise smaller
 * (over a blurred copy of itself, feathered in) — and nodes sit in % of the ART
 * box, so they stay glued to their islands at any size. Positions are physical
 * left/top: the picture does not mirror in Hebrew, so neither do its markers.
 *
 * Fewer destinations → fewer islands, and the art zooms in on the stretch of
 * path that is used, never padded with placeholders. A crowded view (small
 * phone) sheds node detail step by step (`nodeExtents`) until the islands fit
 * apart.
 */

import Image from 'next/image';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ISLANDS, CASTLE, MAP_ASPECT, type IslandPoint } from './academyNodes';
import { placeIslands, type AcademyIsland } from './academyIslands';
import { fitArt, type ArtFit, type FitPoint, type Insets } from './artFit';
import { nodeExtents } from './nodeExtents';
import { AcademyNodeButton, bossChip, nodeLabel } from './AcademyNodeButton';
import { AcademyAmbient } from './AcademyAmbient';
import type { Tone } from './chrome';

/** Beam light per spotlight tone (r,g,b). */
const BEAM_RGB: Partial<Record<Tone, string>> = { gold: '255,238,160', pink: '255,130,200', teal: '140,245,235' };

export type MapLayout = 'portrait' | 'landscape';

/** Deepest crowding level (see nodeExtents). */
const MAX_COMPACT = 3;

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
  /** px of chrome on each edge (HUD, hero + dock) the islands must clear. */
  insets: Insets;
  /** Big (desktop) island art. */
  big: boolean;
  /** UI scale (TV / tablet). */
  scale: number;
}

function readWindow() {
  return typeof window === 'undefined'
    ? { width: 390, height: 844, measured: false }
    : { width: window.innerWidth, height: window.innerHeight, measured: false };
}

/** The map region's size in px — measured, falling back to the window (no layout engine, first frame). */
function useRegionSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState(readWindow);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      const next = r.width > 0 && r.height > 0 ? { width: r.width, height: r.height, measured: true } : readWindow();
      setSize((prev) =>
        prev.measured === next.measured && Math.abs(prev.width - next.width) < 0.5 && Math.abs(prev.height - next.height) < 0.5 ? prev : next,
      );
    };
    read();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', read);
      return () => window.removeEventListener('resize', read);
    }
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
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

export function AcademyMap({ layout, islands, boss, recommendedKey, spotlightTag, spotlightTone = 'gold', onOpen, reducedMotion, insets, big, scale }: Props) {
  const { t } = useLanguage();
  const regionRef = useRef<HTMLDivElement>(null);
  const region = useRegionSize(regionRef);
  const view = useMemo(() => ({ width: region.width, height: region.height }), [region.width, region.height]);
  // Without a layout engine (tests, a first frame) there is nothing real to crowd: full detail.
  const maxLevel = region.measured ? MAX_COMPACT : 0;
  const aspect = MAP_ASPECT[layout];
  const points = useMemo(() => placeIslands(islands.length, ISLANDS[layout]), [islands.length, layout]);
  const focusIndex = islands.findIndex((n) => n.key === recommendedKey);
  const focus: IslandPoint | null =
    focusIndex >= 0 ? points[focusIndex] : boss && recommendedKey === boss.key ? CASTLE[layout] : null;

  // Solve the art rect; if the islands cannot be kept apart, shed detail and solve again.
  const { fit, compact } = useMemo(() => {
    const nodes: Array<{ node: AcademyIsland; at: IslandPoint }> = islands.length
      ? [...islands.map((node, i) => ({ node, at: points[i] })), ...(boss ? [{ node: boss, at: CASTLE[layout] }] : [])]
      : [];
    let last: ArtFit | null = null;
    for (let level = 0; level <= maxLevel; level++) {
      const pts: FitPoint[] = nodes.map(({ node, at }) => {
        const recommended = node.key === recommendedKey;
        const ext = nodeExtents(
          node,
          nodeLabel(node, t),
          node.kind === 'boss' ? bossChip(node, t) : null,
          { big, recommended, tag: recommended && !!spotlightTag, compact: level },
          scale,
        );
        return { ...at, ...ext };
      });
      last = fitArt({ view, aspect, points: pts, insets, focus });
      if (!last.crowded) return { fit: last, compact: level };
    }
    return { fit: last as ArtFit, compact: maxLevel };
  }, [islands, boss, points, layout, recommendedKey, spotlightTag, big, scale, t, view, aspect, insets, focus, maxLevel]);

  // Glide only between solved rects after the first paint — never in from a default.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const glide = settled && !reducedMotion;

  const still = reducedMotion;
  const rect: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: fit.width,
    height: fit.height,
    // A global landscape-phone rule caps every element at 100% width; the art
    // is deliberately wider than the view when it covers.
    maxWidth: 'none',
    maxHeight: 'none',
    transform: `translate3d(${fit.left}px, ${fit.top}px, 0)`,
    transition: glide ? 'transform 900ms cubic-bezier(.2,.8,.2,1)' : undefined,
  };
  // Letterboxed axes fade into the blurred backdrop instead of ending on a hard edge.
  const gapX = fit.left > 0.5 || fit.left + fit.width < view.width - 0.5;
  const gapY = fit.top > 0.5 || fit.top + fit.height < view.height - 0.5;
  const feather = [
    gapX ? 'linear-gradient(90deg, transparent 0%, #000 6%, #000 94%, transparent 100%)' : '',
    gapY ? 'linear-gradient(180deg, transparent 0%, #000 6%, #000 94%, transparent 100%)' : '',
  ].filter(Boolean);
  const mask: CSSProperties = feather.length
    ? { WebkitMaskImage: feather.join(','), maskImage: feather.join(','), WebkitMaskComposite: 'source-in', maskComposite: 'intersect' }
    : {};
  const src = `/images/education/academy-map-${layout}.webp`;
  const bigArt = layout === 'landscape';

  return (
    <div
      ref={regionRef}
      data-testid="academy-map"
      data-layout={layout}
      data-covers={fit.covers ? 'true' : 'false'}
      data-compact={compact}
      className="absolute inset-0 overflow-hidden"
      style={{ position: 'absolute', inset: 0, maxWidth: 'none' }}
    >
      {/* Backdrop: only where the art does not reach — the same sky, out of focus. */}
      {!fit.covers && (
        <Image
          src={src}
          alt=""
          aria-hidden="true"
          fill
          unoptimized
          sizes="100vw"
          data-testid="academy-map-backdrop"
          className="pointer-events-none select-none object-cover"
          style={{ filter: 'blur(14px) brightness(.55) saturate(.85)', transform: 'scale(1.08)', maxWidth: 'none' }}
          draggable={false}
        />
      )}
      {/* The art itself, feathered on any letterboxed edge. */}
      <div aria-hidden="true" data-testid="academy-map-canvas" style={{ ...rect, ...mask }}>
        <Image
          src={src}
          alt=""
          aria-hidden="true"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="pointer-events-none select-none object-cover"
          style={{ maxWidth: 'none' }}
          draggable={false}
        />
        <AcademyAmbient layout={layout} reducedMotion={reducedMotion} />
      </div>
      {/* Nodes and light, in the same art box (unmasked). */}
      <div
        data-testid="academy-map-art"
        data-left={Math.round(fit.left)}
        data-top={Math.round(fit.top)}
        data-width={Math.round(fit.width)}
        style={rect}
      >
        {/* The locked castle sits in shadow until its words are mastered. */}
        {boss && boss.state === 'locked' && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(ellipse ${bigArt ? '16% 30%' : '34% 14%'} at ${CASTLE[layout].x}% ${CASTLE[layout].y}%, rgba(14,10,40,0.62) 0%, rgba(14,10,40,0.4) 55%, rgba(14,10,40,0) 100%)`,
            }}
          />
        )}
        {focus && <Spotlight at={focus} still={still} tone={spotlightTone} />}

        {boss && islands.length > 0 && (
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
            compact={compact}
            scale={scale}
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
            compact={compact}
            scale={scale}
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
