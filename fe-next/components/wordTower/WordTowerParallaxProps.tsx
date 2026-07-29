'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { visiblePropsAt, type ActiveParallaxProp } from '@/lib/wordTower/parallaxProps';

/** Eased glide so altitude jumps (one per word) read as continuous descent. */
const FLOW = 'transform 900ms cubic-bezier(0.22,1,0.36,1), opacity 700ms ease-out';

/**
 * Per-prop idle-motion archetype so the sky feels alive instead of a row of
 * identically bobbing stickers:
 *  - sway  : pendulum swing from the top (things that dangle / drift in wind)
 *  - hover : quick small bob + jitter (powered flyers holding station)
 *  - spin  : slow continuous rotation (rings / orbs)
 *  - float : gentle bob + breathe (default — characters doing their thing)
 */
type Motion = 'sway' | 'hover' | 'spin' | 'float';
const MOTION: Record<string, Motion> = {
  kite: 'sway', balloon: 'sway', paraglider: 'sway', narwhal: 'sway', teacup: 'sway',
  drone: 'hover', helicopter: 'hover', ufo: 'hover',
  disco: 'spin', portal: 'spin', planetRing: 'spin',
};

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
    const seed = prop.id.charCodeAt(0) + prop.id.charCodeAt(prop.id.length - 1);
    const dir = seed % 2 ? 1 : -1;
    const motion = MOTION[prop.id] ?? 'float';
    const tweens: gsap.core.Tween[] = [];

    if (motion === 'spin') {
      gsap.set(el, { transformOrigin: '50% 50%' });
      tweens.push(gsap.to(el, { rotation: 360, duration: 16 + (seed % 5) * 2, ease: 'none', repeat: -1 }));
    } else if (motion === 'sway') {
      gsap.set(el, { transformOrigin: '50% 0%' }); // hangs / swings from the top
      tweens.push(gsap.to(el, { rotation: dir * 7, y: 6, duration: 3.4 + (seed % 4) * 0.4, ease: 'sine.inOut', repeat: -1, yoyo: true }));
      tweens.push(gsap.to(el, { x: dir * 8, duration: 4.6, ease: 'sine.inOut', repeat: -1, yoyo: true }));
    } else if (motion === 'hover') {
      tweens.push(gsap.to(el, { y: 5, duration: 1.1 + (seed % 3) * 0.2, ease: 'sine.inOut', repeat: -1, yoyo: true }));
      tweens.push(gsap.to(el, { x: dir * 3, rotation: dir * 2, duration: 2.3, ease: 'sine.inOut', repeat: -1, yoyo: true }));
    } else {
      tweens.push(gsap.to(el, { y: 9 + (seed % 3) * 3, rotation: dir * 3, duration: 3 + (seed % 4) * 0.6, ease: 'sine.inOut', repeat: -1, yoyo: true }));
      tweens.push(gsap.to(el, { scale: 1.04, duration: 2.6 + (seed % 3) * 0.5, ease: 'sine.inOut', repeat: -1, yoyo: true }));
    }
    return () => { tweens.forEach((t) => t.kill()); gsap.killTweensOf(el); };
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
