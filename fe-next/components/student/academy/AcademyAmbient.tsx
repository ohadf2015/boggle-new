'use client';

/**
 * Ambient magic over the map art, inside the art box so it tracks the islands:
 *  - the glowing letters painted into the sky (A, B, C, α on the landscape art;
 *    positions MEASURED on the webp) pulse like enchanted runes, each with a
 *    sparkle orbiting it — so they read as intentional magic, not stray glyphs;
 *  - gold motes rise slowly from the islands;
 *  - a few clouds drift at two depths (parallax).
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
    { x: -12, y: 70, w: 46, depth: 1 },
    { x: 70, y: 76, w: 44, depth: 2, flip: true },
  ],
  landscape: [
    { x: -4, y: 74, w: 22, depth: 1 },
    { x: 80, y: 78, w: 24, depth: 2, flip: true },
  ],
};

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
            opacity: cloud.depth === 0 ? 0.35 : 0.55,
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
