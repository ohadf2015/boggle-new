'use client';

/**
 * Ambient life over the daytime map art, inside the art box so it tracks the
 * islands: a few clouds drift at three depths, and light falls down every
 * painted waterfall (CSS, compositor-only). Index-based layout (the hub is
 * SSR'd); every loop is skipped under reduced motion.
 */

import Image from 'next/image';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';
import { useCompositorLoop } from '@/lib/education/motion/compositorLoop';
import type { MapLayout } from './AcademyMap';

const CLOUDS: Record<MapLayout, { x: number; y: number; w: number; depth: number; flip?: boolean }[]> = {
  portrait: [
    { x: 58, y: 8, w: 40, depth: 0 },
    { x: -12, y: 70, w: 46, depth: 1 },
    { x: 70, y: 76, w: 44, depth: 2, flip: true },
  ],
  landscape: [
    { x: 36, y: 4, w: 16, depth: 0, flip: true },
    { x: -4, y: 74, w: 22, depth: 1 },
    { x: 80, y: 78, w: 24, depth: 2, flip: true },
  ],
};

/**
 * Waterfalls MEASURED on the webp (bright blue-white vertical runs): x, top,
 * height, width — all % of the art. A shimmer of falling light rides each one.
 */
const FALLS: Record<MapLayout, { x: number; y: number; h: number; w: number }[]> = {
  portrait: [
    { x: 31.5, y: 22, h: 10, w: 3 },
    { x: 67.5, y: 20, h: 14, w: 3 },
    { x: 28.5, y: 38, h: 8, w: 3 },
    { x: 73.5, y: 46, h: 12, w: 2.5 },
    { x: 28.5, y: 56, h: 12, w: 3 },
    { x: 72.5, y: 70, h: 12, w: 3 },
    { x: 33.5, y: 84, h: 12, w: 3 },
    { x: 52.5, y: 84, h: 14, w: 3 },
  ],
  landscape: [
    { x: 6.8, y: 45, h: 22, w: 1.2 },
    { x: 14.3, y: 50, h: 22, w: 1.2 },
    { x: 22.1, y: 50, h: 20, w: 1.2 },
    { x: 35.4, y: 52, h: 22, w: 1.4 },
    { x: 54.4, y: 50, h: 26, w: 1.4 },
    { x: 74.5, y: 54, h: 24, w: 1.4 },
    { x: 94.3, y: 59, h: 21, w: 1.4 },
  ],
};

/**
 * Compositor-only CSS loops (transform/opacity) — cheaper than a framer loop
 * per waterfall on a low-end phone. Only mounted when motion is allowed.
 * Keyframes live in app/globals.css (single definition, no per-mount injection).
 */

const pulse = (from: number, to: number) => [{ transform: `scale(${from})` }, { transform: `scale(${to})` }, { transform: `scale(${from})` }];

function Cloud({ cloud, still }: { cloud: (typeof CLOUDS)[MapLayout][number]; still: boolean }) {
  const drift = (cloud.depth + 1) * 14;
  // `translate`, not `transform`: the flip lives on transform.
  const ref = useCompositorLoop<HTMLSpanElement>(still ? null : { keyframes: [{ translate: '0px' }, { translate: `${drift}px` }, { translate: '0px' }], duration: (16 + cloud.depth * 6) * 1000 });
  return (
    <span
      ref={ref}
      className="absolute"
      style={{
        left: `${cloud.x}%`,
        top: `${cloud.y}%`,
        width: `${cloud.w}%`,
        aspectRatio: '1264 / 848',
        opacity: cloud.depth === 0 ? 0.3 : 0.55,
        transform: cloud.flip ? 'scaleX(-1)' : undefined,
      }}
    >
      <Image
        src="/images/adventure/cloud.webp"
        alt=""
        fill
        unoptimized
        sizes="40vw"
        className="object-contain"
      />
    </span>
  );
}

export function AcademyAmbient({ layout, reducedMotion }: { layout: MapLayout; reducedMotion: boolean }) {
  const osReduced = useEduReducedMotion();
  const still = reducedMotion || !!osReduced;

  return (
    <div aria-hidden="true" data-testid="academy-ambient" className="pointer-events-none absolute inset-0">
      {!still &&
        FALLS[layout].map((fall, i) => (
          <span
            key={`fall-${i}`}
            data-testid="academy-fall"
            className="absolute -translate-x-1/2 overflow-hidden mix-blend-screen"
            style={{
              left: `${fall.x}%`,
              top: `${fall.y}%`,
              width: `${fall.w}%`,
              height: `${fall.h}%`,
              WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, rgb(var(--neo-black)) 18%, rgb(var(--neo-black)) 78%, transparent 100%)',
              maskImage: 'linear-gradient(180deg, transparent 0%, rgb(var(--neo-black)) 18%, rgb(var(--neo-black)) 78%, transparent 100%)',
              animation: `academy-fall-glint ${2.4 + (i % 3) * 0.7}s ease-in-out ${(i * 0.37) % 2}s infinite`,
            }}
          >
            <span
              className="absolute inset-x-0 top-0 block h-[200%]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(180deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 14px, rgba(225,250,255,0.95) 18px, rgba(255,255,255,0) 26px)',
                animation: `academy-fall ${0.9 + (i % 4) * 0.15}s linear infinite`,
                willChange: 'transform',
              }}
            />
          </span>
        ))}
      {CLOUDS[layout].map((cloud, i) => <Cloud key={`cloud-${i}`} cloud={cloud} still={still} />)}
    </div>
  );
}
