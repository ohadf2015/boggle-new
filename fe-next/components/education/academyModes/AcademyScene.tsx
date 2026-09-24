'use client';

/**
 * Full-bleed world backdrop for the academy modes: the academy map itself,
 * zoomed into the island the mode lives on (so opening a mode feels like
 * stepping INTO the map the student just tapped), plus the mode's own light —
 * workshop lanterns and drifting gold letter runes, or the vault's cold
 * rune-light. Desktop gets a gentle pointer parallax.
 *
 * Mobile-web flash rules (60-recurring-pitfalls Class 5): the ground is a
 * hardcoded bg-neo-navy, big layers never start at opacity 0, and the entrance
 * zoom is transform-only. Loops are gated on BOTH the OS setting
 * (useReducedMotion) and the app's reduced-effects switch.
 */

import { useEffect, type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useReducedEffects } from '@/hooks/useReducedEffects';

export type SceneTheme = 'workshop' | 'vault';

const MAP = {
  portrait: '/images/education/academy-map-portrait.webp',
  landscape: '/images/education/academy-map-landscape.webp',
};

/** Where each mode's island sits on the map art (percent), and the scene's light. */
const THEME = {
  workshop: {
    portraitFocus: '30% 56%',
    landscapeFocus: '32% 48%',
    glow: 'radial-gradient(ellipse 70% 55% at 50% 62%, rgba(255,170,60,0.34) 0%, rgba(255,120,40,0.12) 45%, transparent 75%)',
    rune: '#ffd66b',
    runeGlow: 'rgba(255,190,70,0.9)',
    lantern: 'rgba(255,196,90,0.95)',
    halo: 'rgba(255,160,60,0.25)',
    runes: ['A', 'W', 'o', 'R', 'd', 'K', 'e', 'S', 'b', 'T', 'M', 'y'],
  },
  vault: {
    portraitFocus: '68% 40%',
    landscapeFocus: '72% 40%',
    glow: 'radial-gradient(ellipse 70% 55% at 50% 45%, rgba(0,255,255,0.18) 0%, rgba(139,92,246,0.22) 45%, transparent 78%)',
    rune: '#9ef6ff',
    runeGlow: 'rgba(0,255,255,0.85)',
    lantern: 'rgba(180,140,255,0.95)',
    halo: 'rgba(0,255,255,0.22)',
    runes: ['?', 'a', 'Q', 'z', 'E', 'l', 'N', 'u', 'G', 'r', 'P', 'i'],
  },
} as const;

/** Deterministic rune + lantern placement (no RNG → no SSR mismatch, no re-scatter). */
const RUNE_SPOTS = Array.from({ length: 12 }, (_, i) => ({
  left: `${(i * 37 + 7) % 94}%`,
  top: `${(i * 53 + 11) % 86}%`,
  size: 18 + ((i * 13) % 26),
  drift: 10 + ((i * 7) % 14),
  duration: 5 + ((i * 11) % 6),
  delay: ((i * 17) % 30) / 10,
  opacity: 0.28 + ((i * 29) % 30) / 100,
}));
const LANTERNS = [
  { left: '8%', top: '30%' },
  { left: '88%', top: '24%' },
  { left: '14%', top: '72%' },
  { left: '82%', top: '66%' },
  { left: '50%', top: '12%' },
];

function useSceneReducedMotion(): boolean {
  const prefers = useReducedMotion();
  const [reducedEffects] = useReducedEffects();
  return Boolean(prefers) || reducedEffects;
}

export function AcademyScene({ theme, children, dim = 0.5 }: { theme: SceneTheme; children: ReactNode; dim?: number }) {
  const reduce = useSceneReducedMotion();
  const cfg = THEME[theme];

  // Pointer parallax (desktop pointers only; springs keep it soft).
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 20 });
  const sy = useSpring(py, { stiffness: 60, damping: 20 });
  const backX = useTransform(sx, (v) => v * -14);
  const backY = useTransform(sy, (v) => v * -10);
  const frontX = useTransform(sx, (v) => v * 22);
  const frontY = useTransform(sy, (v) => v * 16);
  useEffect(() => {
    if (reduce || typeof window === 'undefined' || !window.matchMedia?.('(pointer: fine)').matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        px.set(e.clientX / window.innerWidth - 0.5);
        py.set(e.clientY / window.innerHeight - 0.5);
      });
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, [reduce, px, py]);

  return (
    <div data-testid="academy-scene" data-theme={theme} className="absolute inset-0 overflow-hidden bg-neo-navy">
      {/* The map, zoomed into this mode's island. Transform-only entrance. */}
      <motion.div aria-hidden className="absolute -inset-8" style={{ x: backX, y: backY }}>
        <motion.div
          className="absolute inset-0"
          initial={reduce ? false : { scale: 1.02 }}
          animate={{ scale: 1.14 }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative full-bleed art */}
          <img
            src={MAP.portrait}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover lg:hidden"
            style={{ objectPosition: cfg.portraitFocus, filter: 'blur(2px) saturate(1.15)' }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative full-bleed art */}
          <img
            src={MAP.landscape}
            alt=""
            draggable={false}
            className="absolute inset-0 hidden h-full w-full object-cover lg:block"
            style={{ objectPosition: cfg.landscapeFocus, filter: 'blur(2px) saturate(1.15)' }}
          />
        </motion.div>
      </motion.div>

      {/* Scene light + legibility: mode glow, dark vignette, floor fade. */}
      <div aria-hidden className="absolute inset-0" style={{ background: `rgba(14,14,34,${dim})` }} />
      <div aria-hidden className="absolute inset-0" style={{ background: cfg.glow }} />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 90% 80% at 50% 45%, transparent 45%, rgba(10,10,28,0.85) 100%)' }}
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: 'linear-gradient(to top, rgba(12,12,30,0.9), transparent)' }} />

      {/* Lanterns + runes drift in front, the other way from the map. */}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ x: frontX, y: frontY }}>
        {LANTERNS.map((l, i) => (
          <motion.span
            key={`l${i}`}
            className="absolute h-3 w-3 rounded-full lg:h-4 lg:w-4"
            style={{ left: l.left, top: l.top, background: cfg.lantern, boxShadow: `0 0 18px 8px ${cfg.lantern}, 0 0 60px 24px ${cfg.halo}` }}
            animate={reduce ? undefined : { opacity: [1, 0.55, 0.95, 0.7, 1], scale: [1, 0.9, 1.08, 0.95, 1] }}
            transition={reduce ? undefined : { duration: 2.6 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
        {RUNE_SPOTS.map((r, i) => (
          <motion.span
            key={`r${i}`}
            className="absolute select-none font-neo-display font-black"
            style={{
              left: r.left,
              top: r.top,
              fontSize: r.size,
              color: cfg.rune,
              opacity: r.opacity,
              textShadow: `0 0 12px ${cfg.runeGlow}, 0 0 2px ${cfg.runeGlow}`,
            }}
            animate={reduce ? undefined : { y: [0, -r.drift, 0], rotate: [0, i % 2 ? 8 : -8, 0] }}
            transition={reduce ? undefined : { duration: r.duration, delay: r.delay, repeat: Infinity, ease: 'easeInOut' }}
          >
            {cfg.runes[i % cfg.runes.length]}
          </motion.span>
        ))}
      </motion.div>

      <div className="relative z-10 flex h-full w-full flex-col">{children}</div>
    </div>
  );
}
