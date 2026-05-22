'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { visiblePropsAt, type ActiveParallaxProp } from '@/lib/wordTower/parallaxProps';

/** Eased glide so altitude jumps (one per word) read as continuous descent. */
const FLOW = 'transform 900ms cubic-bezier(0.22,1,0.36,1), opacity 700ms ease-out';

/**
 * One floating altitude-reference prop. The OUTER div carries the altitude
 * parallax (translateY from `offsetPx`); the INNER div carries a GSAP idle bob
 * so the two transforms never fight. Mounted only while the prop is within its
 * altitude window — so its image loads lazily on approach and unloads once past.
 */
function FloatingProp({ prop, reducedMotion }: { prop: ActiveParallaxProp; reducedMotion: boolean }) {
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const el = innerRef.current;
    if (!el) return;
    const seed = prop.id.charCodeAt(0);
    const tween = gsap.to(el, {
      y: 8 + (seed % 3) * 4,
      rotation: prop.id === 'birds' ? 0 : (seed % 2 ? 3 : -3),
      duration: 3 + (seed % 4) * 0.6,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    });
    return () => { tween.kill(); };
  }, [reducedMotion, prop.id]);

  return (
    <div
      className="absolute"
      style={{
        left: `${prop.xPct}%`,
        top: `${prop.topPct}%`,
        width: prop.width,
        // Parallax position is altitude-driven motion → collapse it under reduced-motion.
        transform: `translateY(${reducedMotion ? 0 : prop.offsetPx}px)`,
        opacity: prop.opacity,
        transition: reducedMotion ? 'opacity 400ms ease-out' : FLOW,
        willChange: 'transform',
      }}
    >
      <div ref={innerRef}>
        <Image
          src={prop.src}
          alt=""
          width={prop.width}
          height={prop.width}
          draggable={false}
          className="select-none"
          priority={false}
        />
      </div>
    </div>
  );
}

/**
 * Lazy, altitude-anchored parallax props behind the tower (balloon → birds →
 * plane → satellite → UFO) that descend past the climber as height references.
 * A pure DOM layer (NOT Pixi — avoids the v8 strict-mode canvas race) sitting
 * behind the transparent Pixi canvas. Inert + reduced-motion safe.
 */
export function WordTowerParallaxProps({ heightM = 0, reducedMotion = false }: { heightM?: number; reducedMotion?: boolean }) {
  const active = visiblePropsAt(heightM);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {active.map((p) => (
        <FloatingProp key={p.id} prop={p} reducedMotion={reducedMotion} />
      ))}
    </div>
  );
}
