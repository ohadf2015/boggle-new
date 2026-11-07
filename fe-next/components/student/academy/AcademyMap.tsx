'use client';

/**
 * The floating-island world. The art is a px rect solved per viewport by
 * `fitArt` — cover when that keeps every island on screen, otherwise smaller
 * (over a blurred copy of itself, feathered in) — and nodes sit in % of the ART
 * box, so they stay glued to their islands at any size. Positions are physical
 * left/top: the picture does not mirror in Hebrew, so neither do its markers.
 *
 * Fewer destinations → fewer islands, and the art zooms in on the stretch of
 * path that is used, never padded with placeholders. A crowded view sheds node
 * detail, then whole islands (`mapPlan`), until the rest fit apart and clear of
 * the chrome.
 */

import Image from 'next/image';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CASTLE, type IslandPoint } from './academyNodes';
import type { AcademyIsland } from './academyIslands';
import type { Insets } from './artFit';
import { planMap } from './mapPlan';
import { nodeExtents } from './nodeExtents';
import { AcademyNodeButton, bossChip, nodeLabel } from './AcademyNodeButton';
import { AcademyAmbient } from './AcademyAmbient';
import type { Tone } from './chrome';

/** Beam light per spotlight tone (r,g,b). */
const BEAM_RGB: Partial<Record<Tone, string>> = { gold: '255,238,160', pink: '255,130,200', teal: '140,245,235' };

export type MapLayout = 'portrait' | 'landscape';

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
export function useRegionSize(ref: React.RefObject<HTMLDivElement | null>) {
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
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 35%, rgb(var(--neo-black)) 72%, transparent 100%)',
          maskImage: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 35%, rgb(var(--neo-black)) 72%, transparent 100%)',
          animation: still ? undefined : 'academy-beam 3.2s ease-in-out infinite',
        }}
      />
    </>
  );
}

export function AcademyMap({ layout, islands, boss, recommendedKey, spotlightTag, spotlightTone = 'gold', onOpen, reducedMotion, insets, big, scale }: Props) {
  const { t } = useLanguage();
  const regionRef = useRef<HTMLDivElement>(null);
  const region = useRegionSize(regionRef);
  const view = useMemo(() => ({ width: region.width, height: region.height }), [region.width, region.height]);
  // Without a layout engine (tests, a first frame) there is nothing real to crowd: full detail.
  const { shown, points, fit, compact, focus } = useMemo(
    () =>
      planMap({
        islands,
        boss,
        recommendedKey,
        layout,
        view,
        insets,
        measured: region.measured,
        extentsOf: (node, recommended, level) =>
          nodeExtents(
            node,
            nodeLabel(node, t),
            node.kind === 'boss' ? bossChip(node, t) : null,
            { big, recommended, tag: recommended && !!spotlightTag, compact: level },
            scale,
          ),
      }),
    [islands, boss, recommendedKey, layout, view, insets, region.measured, spotlightTag, big, scale, t],
  );

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
    gapX ? 'linear-gradient(90deg, transparent 0%, rgb(var(--neo-black)) 6%, rgb(var(--neo-black)) 94%, transparent 100%)' : '',
    gapY ? 'linear-gradient(180deg, transparent 0%, rgb(var(--neo-black)) 6%, rgb(var(--neo-black)) 94%, transparent 100%)' : '',
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

        {boss && shown.length > 0 && (
          <AcademyNodeButton
            node={boss}
            at={CASTLE[layout]}
            index={shown.length}
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
        {shown.map((node, i) => (
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
