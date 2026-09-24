'use client';

/**
 * Ambient magic over the map art, inside the art box so it tracks the islands:
 *  - the glowing letters painted into the sky (A, B, C, α on the landscape art;
 *    positions MEASURED on the webp) pulse like enchanted runes, each with a
 *    sparkle orbiting it — so they read as intentional magic, not stray glyphs;
 *  - gold motes rise slowly from the islands;
 *  - a few clouds drift at three depths (parallax);
 *  - light falls down every painted waterfall (CSS, compositor-only).
 *
 * Layout is index-based (no Math.random in render — the hub is SSR'd). Every
 * loop is skipped under reduced motion; the static glow stays.
 */

import Image from 'next/image';
import { m, useReducedMotion } from 'framer-motion';
import type { MapLayout } from './AcademyMap';

const RUNES: Record<MapLayout, { x: number; y: number; r: number }[]> = {
  landscape: [
    { x: 27, y: 15.7, r: 7 },
    { x: 62.5, y: 20, r: 6.5 },
    { x: 88.3, y: 26.5, r: 6 },
    { x: 63.1, y: 74.4, r: 6.5 },
  ],
  portrait: [{ x: 59.8, y: 55.3, r: 6 }],
};

/** Deterministic mote field: golden-ratio spread across the art. */
const MOTES = Array.from({ length: 16 }, (_, i) => {
  const gx = (i * 0.618034) % 1;
  const gy = (i * 0.381966 + 0.13) % 1;
  return {
    x: 6 + gx * 88,
    y: 30 + gy * 55,
    size: 5 + (i % 3) * 2,
    dur: 7 + (i % 5) * 1.6,
    delay: (i * 0.73) % 6,
  };
});

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
 */
const AMBIENT_CSS = `
@keyframes academy-fall { from { transform: translateY(-50%); } to { transform: translateY(0); } }
@keyframes academy-fall-glint { 0%,100% { opacity: .35; } 50% { opacity: .7; } }
`;

function Sparkle({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true">
      <path d="M6 0 L7.2 4.8 L12 6 L7.2 7.2 L6 12 L4.8 7.2 L0 6 L4.8 4.8 Z" fill="#fff6c2" />
    </svg>
  );
}

export function AcademyAmbient({ layout, reducedMotion }: { layout: MapLayout; reducedMotion: boolean }) {
  const osReduced = useReducedMotion();
  const still = reducedMotion || !!osReduced;

  return (
    <div aria-hidden="true" data-testid="academy-ambient" className="pointer-events-none absolute inset-0">
      {!still && <style>{AMBIENT_CSS}</style>}
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
              WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 18%, #000 78%, transparent 100%)',
              maskImage: 'linear-gradient(180deg, transparent 0%, #000 18%, #000 78%, transparent 100%)',
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
      {RUNES[layout].map((rune, i) => (
        <span
          key={`rune-${i}`}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${rune.x}%`, top: `${rune.y}%`, width: `${rune.r * 2}%`, aspectRatio: '1' }}
        >
          <m.span
            className="absolute inset-0 rounded-full mix-blend-screen"
            style={{ background: 'radial-gradient(circle, rgba(255,214,90,0.55) 0%, rgba(255,170,40,0.18) 40%, transparent 68%)' }}
            animate={still ? undefined : { scale: [0.85, 1.15, 0.85], opacity: [0.55, 1, 0.55] }}
            transition={still ? undefined : { duration: 3.2 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.7 }}
          />
          {!still && (
            <m.span
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 9 + i * 2, repeat: Infinity, ease: 'linear' }}
            >
              <span className="absolute left-1/2 top-[8%] -translate-x-1/2 drop-shadow-[0_0_4px_rgba(255,220,120,0.9)]">
                <Sparkle size={10} />
              </span>
            </m.span>
          )}
        </span>
      ))}

      {!still &&
        MOTES.map((mote, i) => (
          <m.span
            key={`mote-${i}`}
            className="absolute rounded-full"
            style={{
              left: `${mote.x}%`,
              top: `${mote.y}%`,
              width: mote.size,
              height: mote.size,
              background: 'radial-gradient(circle, #fff7c8 0%, #ffd23a 45%, rgba(255,210,58,0) 72%)',
            }}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 0.9, 0], y: [0, -60], x: [0, i % 2 ? 10 : -10] }}
            transition={{ duration: mote.dur, repeat: Infinity, delay: mote.delay, ease: 'easeOut' }}
          />
        ))}

      {CLOUDS[layout].map((cloud, i) => (
        <m.span
          key={`cloud-${i}`}
          className="absolute"
          style={{
            left: `${cloud.x}%`,
            top: `${cloud.y}%`,
            width: `${cloud.w}%`,
            aspectRatio: '1264 / 848',
            opacity: cloud.depth === 0 ? 0.3 : 0.55,
            scaleX: cloud.flip ? -1 : 1,
          }}
          animate={still ? undefined : { x: [0, (cloud.depth + 1) * 14, 0] }}
          transition={still ? undefined : { duration: 16 + cloud.depth * 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Image
            src="/images/adventure/cloud.webp"
            alt=""
            fill
            unoptimized
            sizes="40vw"
            className="object-contain [filter:hue-rotate(40deg)_saturate(0.7)_brightness(0.85)]"
          />
        </m.span>
      ))}
    </div>
  );
}
