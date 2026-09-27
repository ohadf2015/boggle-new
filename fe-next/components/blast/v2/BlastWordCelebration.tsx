'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { classifyOvation } from '@/lib/blast/v2/engine/ovation';
import { pickQuipKey } from '@/lib/blast/v2/fx/mascotQuips';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  /** Increments on every word commit — drives the celebration spawn. */
  eventKey: number;
  /** Viewport-absolute centers of cleared tiles (clientX/Y coords). */
  centers: Array<{ x: number; y: number }>;
  /** Mode color for tinting rings + pixels. */
  modeColor: string;
  /** Cascade depth for the just-committed word — drives ovation intensity. */
  chainDepth?: number;
  /** Level number — seeds the quip picker so repeated mega-chains rotate lines. */
  levelNumber?: number;
};

const PIXEL_COUNT_PER_CELL = 14;
const SPARKLE_COUNT_PER_CELL = 6;
const RING_LAYERS: Array<{ color: string; delay: number; scale: number; width: number }> = [
  { color: 'cyan', delay: 0, scale: 1.0, width: 4 },
  { color: 'magenta', delay: 0.07, scale: 1.15, width: 3 },
  { color: 'yellow', delay: 0.14, scale: 1.3, width: 3 },
];

// GSAP-driven DOM celebration FX on word found. Sits ABOVE the Pixi canvas
// (z-index 60) so even if the Pixi layer fails to mount or render the player
// still sees: a tinted radial shockwave at each cleared tile, three concentric
// chromatic rings (cyan/magenta/yellow staggered for RGB-split feel), a burst
// of square "pixels" flying outward with gravity, and sparkle dots.
//
// Why DOM and not Pixi: the Pixi FX layer ships in this codebase but playtest
// reports it as invisible on some devices (likely a canvas-init race with the
// page transition). DOM + GSAP is rock-solid and renders the same on every
// browser — a guaranteed visual payoff for finding a word.
export function BlastWordCelebration({ eventKey, centers, modeColor, chainDepth = 0, levelNumber = 0 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastKeyRef = useRef<number | undefined>(undefined);
  const { t } = useLanguage();

  useEffect(() => {
    if (eventKey === undefined || eventKey === lastKeyRef.current) return;
    lastKeyRef.current = eventKey;
    const root = containerRef.current;
    if (!root) return;
    if (centers.length === 0) return;

    const rootRect = root.getBoundingClientRect();
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const spawned: HTMLElement[] = [];

    for (const center of centers) {
      const lx = center.x - rootRect.left;
      const ly = center.y - rootRect.top;

      // Chromatic shockwave wrap — three rings staggered. Each ring expands
      // from 0 to a chain-scaled radius while fading out.
      const ringScaleMul = 1 + Math.min(chainDepth, 4) * 0.18;
      RING_LAYERS.forEach((layer) => {
        const ring = document.createElement('span');
        ring.className = 'pointer-events-none absolute rounded-full';
        Object.assign(ring.style, {
          left: `${lx}px`,
          top: `${ly}px`,
          width: '6px',
          height: '6px',
          marginLeft: '-3px',
          marginTop: '-3px',
          border: `${layer.width}px solid ${layer.color}`,
          boxShadow: `0 0 22px ${layer.color}`,
          opacity: '0',
          willChange: 'transform, opacity',
        });
        root.appendChild(ring);
        spawned.push(ring);
        const targetScale = 22 * ringScaleMul + layer.scale * 4;
        gsap.fromTo(
          ring,
          { scale: 0.3, opacity: 0 },
          {
            scale: targetScale,
            opacity: 0,
            duration: 0.7,
            ease: 'power2.out',
            delay: layer.delay,
            keyframes: {
              opacity: [0, 0.95, 0.7, 0],
              easeEach: 'power2.out',
            },
            onComplete: () => ring.remove(),
          },
        );
      });

      // Tinted core flash — a soft glow disk that pops then fades. Sits at
      // each cleared tile center to read as the "impact" before the rings.
      const core = document.createElement('span');
      core.className = 'pointer-events-none absolute rounded-full';
      Object.assign(core.style, {
        left: `${lx}px`,
        top: `${ly}px`,
        width: '46px',
        height: '46px',
        marginLeft: '-23px',
        marginTop: '-23px',
        background: `radial-gradient(circle, ${modeColor} 0%, transparent 70%)`,
        opacity: '0',
        willChange: 'transform, opacity',
      });
      root.appendChild(core);
      spawned.push(core);
      gsap.fromTo(
        core,
        { scale: 0.4, opacity: 0 },
        {
          scale: 2.2,
          opacity: 0,
          duration: 0.5,
          ease: 'power2.out',
          keyframes: {
            opacity: [0, 0.9, 0],
            easeEach: 'power2.out',
          },
          onComplete: () => core.remove(),
        },
      );

      // Square "pixels" flying outward with gravity — the "pieces of tile"
      // the user asked for. Bursts in a full circle and arcs down.
      for (let i = 0; i < PIXEL_COUNT_PER_CELL; i++) {
        const pixel = document.createElement('span');
        const size = 5 + Math.random() * 5;
        const angle = (i / PIXEL_COUNT_PER_CELL) * Math.PI * 2 + Math.random() * 0.6;
        const speed = 70 + Math.random() * 90;
        const dx = Math.cos(angle) * speed;
        const dy = Math.sin(angle) * speed;
        const tint = i % 3 === 0 ? modeColor : i % 3 === 1 ? '#ffffff' : '#fbbf24';
        Object.assign(pixel.style, {
          position: 'absolute',
          left: `${lx}px`,
          top: `${ly}px`,
          width: `${size}px`,
          height: `${size}px`,
          marginLeft: `${-size / 2}px`,
          marginTop: `${-size / 2}px`,
          background: tint,
          borderRadius: '1.5px',
          boxShadow: `0 0 6px ${tint}`,
          willChange: 'transform, opacity',
        });
        pixel.className = 'pointer-events-none';
        root.appendChild(pixel);
        spawned.push(pixel);
        gsap.to(pixel, {
          x: dx,
          y: dy + 140, // gravity offset
          rotation: (Math.random() - 0.5) * 540,
          opacity: 0,
          duration: 0.75 + Math.random() * 0.35,
          ease: 'power2.in',
          onComplete: () => pixel.remove(),
        });
      }

      // Sparkle dots — small white stars that twinkle then fade. Layered on
      // top of the pixels so the burst reads as multi-textured.
      for (let i = 0; i < SPARKLE_COUNT_PER_CELL; i++) {
        const sparkle = document.createElement('span');
        const dist = 22 + Math.random() * 28;
        const angle = Math.random() * Math.PI * 2;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        Object.assign(sparkle.style, {
          position: 'absolute',
          left: `${lx}px`,
          top: `${ly}px`,
          width: '4px',
          height: '4px',
          marginLeft: '-2px',
          marginTop: '-2px',
          background: '#ffffff',
          borderRadius: '50%',
          boxShadow: '0 0 8px #ffffff, 0 0 16px #ffffff',
          willChange: 'transform, opacity',
        });
        sparkle.className = 'pointer-events-none';
        root.appendChild(sparkle);
        spawned.push(sparkle);
        gsap.fromTo(
          sparkle,
          { scale: 0, opacity: 0 },
          {
            x: dx,
            y: dy,
            scale: 1.4,
            opacity: 0,
            duration: 0.6 + Math.random() * 0.25,
            ease: 'power2.out',
            keyframes: {
              opacity: [0, 1, 0],
              easeEach: 'power2.out',
            },
            onComplete: () => sparkle.remove(),
          },
        );
      }
    }

    // Mascot quip — a short pop-text label on big / mega chains. Rides above
    // the rings so the player can read it without the burst-burst-burst FX
    // drowning it out. Picker lives in lib/blast/v2/fx/mascotQuips (pure).
    const tier = classifyOvation(chainDepth);
    const quipKey = pickQuipKey(tier, chainDepth, levelNumber);
    if (quipKey) {
      const rootRect = root.getBoundingClientRect();
      // Anchor at the centroid of the cleared cells so the quip rides the
      // action, not a fixed banner position.
      const cx = centers.reduce((s, c) => s + c.x - rootRect.left, 0) / centers.length;
      const cy = centers.reduce((s, c) => s + c.y - rootRect.top, 0) / centers.length;
      const quip = document.createElement('div');
      quip.setAttribute('data-blast-quip', tier);
      quip.textContent = t(quipKey, tier === 'mega' ? 'MEGA COMBO!' : 'NICE CHAIN!');
      Object.assign(quip.style, {
        position: 'absolute',
        left: `${cx}px`,
        top: `${cy - 40}px`,
        transform: 'translate(-50%, -50%)',
        padding: '6px 14px',
        background: modeColor,
        color: '#0b1530',
        fontFamily: 'var(--font-neo-display, system-ui)',
        fontWeight: '900',
        fontSize: tier === 'mega' ? '20px' : '16px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        borderRadius: '10px',
        boxShadow: `3px 3px 0 #0b1530`,
        border: '2px solid #0b1530',
        opacity: '0',
        whiteSpace: 'nowrap',
        willChange: 'transform, opacity',
      });
      root.appendChild(quip);
      spawned.push(quip);
      gsap.fromTo(
        quip,
        { scale: 0.5, opacity: 0, y: 0 },
        {
          scale: 1,
          opacity: 1,
          y: -10,
          duration: 0.35,
          ease: 'back.out(2.4)',
          onComplete: () => {
            gsap.to(quip, {
              opacity: 0,
              y: -28,
              duration: 0.5,
              delay: 0.55,
              ease: 'power2.in',
              onComplete: () => quip.remove(),
            });
          },
        },
      );
    }

    // Cascade screen-burst — a quick radial flash overlay that scales with
    // chain depth. Reads as "big moment" punctuation when chains stack.
    if (chainDepth >= 1) {
      const burst = document.createElement('div');
      burst.className = 'pointer-events-none absolute inset-0';
      Object.assign(burst.style, {
        background: `radial-gradient(circle at 50% 50%, color-mix(in srgb, ${modeColor} ${20 + chainDepth * 10}%, transparent) 0%, transparent 65%)`,
        opacity: '0',
        willChange: 'opacity',
      });
      root.appendChild(burst);
      spawned.push(burst);
      gsap.to(burst, {
        opacity: 0,
        duration: 0.55,
        ease: 'power2.out',
        keyframes: {
          opacity: [0, 0.85, 0],
          easeEach: 'power2.out',
        },
        onComplete: () => burst.remove(),
      });
    }

    return () => {
      // Defensive: tear down anything still in flight if the component unmounts
      // mid-celebration (fast level transition).
      spawned.forEach((el) => {
        gsap.killTweensOf(el);
        el.remove();
      });
    };
  }, [eventKey, centers, modeColor, chainDepth, levelNumber, t]);

  return (
    <div
      ref={containerRef}
      data-testid="blast-word-celebration"
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ zIndex: 60 }}
      aria-hidden
    />
  );
}
