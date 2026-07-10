'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { visiblePropsAt, type ActiveParallaxProp } from '@/lib/wordTower/parallaxProps';
import { biomeBlendAt } from '@/lib/wordTower/biomeBlend';
import { BIOME_THEME, type BiomeEvent } from './biomeTheme';

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
 * Transient background event (shooting star, plane flyby, etc). Pure CSS + GSAP,
 * no image load — animates and self-destructs. Respects reducedMotion.
 */
function BackgroundEvent({ eventType, reducedMotion, onDone }: { eventType: BiomeEvent; reducedMotion: boolean; onDone: () => void }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (reducedMotion) return;
    const el = elementRef.current;
    if (!el) return;

    const tl = gsap.timeline({ onComplete: () => onDoneRef.current() });

    switch (eventType) {
      case 'shootingStar': {
        gsap.set(el, { left: '-5%', top: `${10 + Math.random() * 40}%` });
        tl.to(el, { left: '105%', top: `${20 + Math.random() * 30}%`, duration: 1.2, ease: 'power1.in' }, 0);
        tl.to(el, { opacity: 0, duration: 0.3 }, '-=0.2');
        break;
      }
      case 'planeFlyby': {
        const fromLeft = Math.random() > 0.5;
        gsap.set(el, { left: fromLeft ? '-10%' : '110%', top: `${15 + Math.random() * 35}%`, scaleX: fromLeft ? 1 : -1 });
        tl.to(el, { left: fromLeft ? '110%' : '-10%', duration: 2.5, ease: 'power2.inOut' }, 0);
        tl.to(el, { opacity: 0, duration: 0.4 }, '-=0.3');
        break;
      }
      case 'helicopterPass': {
        const fromLeft = Math.random() > 0.5;
        gsap.set(el, { left: fromLeft ? '-15%' : '115%', top: `${20 + Math.random() * 30}%`, scaleX: fromLeft ? 1 : -1 });
        tl.to(el, { left: fromLeft ? '115%' : '-15%', duration: 3, ease: 'sine.inOut' }, 0);
        tl.to(el, { rotation: 360, duration: 1.5, ease: 'none', repeat: 1 }, 0);
        tl.to(el, { opacity: 0, duration: 0.3 }, '-=0.2');
        break;
      }
      case 'cometStreak': {
        gsap.set(el, { left: '10%', top: '-10%', opacity: 0.8 });
        tl.to(el, { left: `${30 + Math.random() * 40}%`, top: '110%', duration: 1.6, ease: 'power2.in' }, 0);
        tl.to(el, { opacity: 0, duration: 0.4 }, '-=0.3');
        break;
      }
      case 'meteorShower': {
        for (let i = 0; i < 3; i++) {
          const meteor = document.createElement('div');
          meteor.style.position = 'absolute';
          meteor.style.width = '2px';
          meteor.style.height = '16px';
          meteor.style.background = 'rgba(255,200,100,0.7)';
          meteor.style.left = `${20 + Math.random() * 60}%`;
          meteor.style.top = '-5%';
          meteor.style.boxShadow = '0 0 4px rgba(255,200,100,0.9)';
          el.appendChild(meteor);
          gsap.to(meteor, { top: '110%', duration: 1.2 + i * 0.2, ease: 'power2.in', delay: i * 0.15 });
        }
        tl.to(el, { opacity: 0, duration: 0.5 }, '+=1.8');
        break;
      }
      case 'starTwinkle': {
        const x = `${15 + Math.random() * 70}%`;
        const y = `${10 + Math.random() * 50}%`;
        gsap.set(el, { left: x, top: y, opacity: 0.2, boxShadow: '0 0 4px rgba(255,255,255,0.8)' });
        tl.to(el, { opacity: 0.9, duration: 0.3, ease: 'sine.inOut' }, 0);
        tl.to(el, { opacity: 0.2, duration: 0.4, ease: 'sine.inOut' });
        tl.to(el, { opacity: 0.8, duration: 0.3, ease: 'sine.inOut' });
        tl.to(el, { opacity: 0, duration: 0.5, ease: 'sine.out' });
        break;
      }
      case 'satelliteGlint': {
        gsap.set(el, { left: '-5%', top: `${5 + Math.random() * 40}%`, opacity: 0.3, scaleX: 2 });
        tl.to(el, { left: '105%', opacity: 0.8, duration: 4, ease: 'linear' }, 0);
        tl.to(el, { opacity: 0.2, duration: 0.6 }, '-=1.5');
        break;
      }
      case 'auroraFlare': {
        gsap.set(el, { top: '20%', inset: '0 20%', opacity: 0 });
        tl.to(el, { opacity: 0.3, duration: 0.8, ease: 'sine.out' }, 0);
        tl.to(el, { opacity: 0, duration: 1.2, ease: 'sine.in' });
        break;
      }
      case 'ufoZoom': {
        const fromLeft = Math.random() > 0.5;
        gsap.set(el, { left: fromLeft ? '-12%' : '112%', top: `${25 + Math.random() * 30}%`, scaleX: fromLeft ? 1 : -1 });
        tl.to(el, { left: fromLeft ? '112%' : '-12%', duration: 1.8, ease: 'power2.inOut' }, 0);
        tl.to(el, { rotation: 720, duration: 1.8, ease: 'none' }, 0);
        tl.to(el, { opacity: 0, duration: 0.3 }, '-=0.2');
        break;
      }
    }
  }, [eventType, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div
      ref={elementRef}
      className="pointer-events-none absolute"
      style={{
        width: '1px',
        height: '1px',
        background: 'rgba(255,255,255,0.6)',
        borderRadius: '50%',
        boxShadow: '0 0 8px rgba(200,200,255,0.6)',
        willChange: 'transform, opacity',
      }}
    />
  );
}

/**
 * Manages random background events (shooting stars, plane flybys, etc) for the
 * current biome. Emits transient animations at random intervals.
 */
function BiomeEventEmitter({ heightM = 0, reducedMotion = false }: { heightM?: number; reducedMotion?: boolean }) {
  const [events, setEvents] = useState<Array<{ key: string; type: BiomeEvent }>>([]);
  const countRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (reducedMotion) return;

    const biome = biomeBlendAt(heightM).fromId;
    const themeData = BIOME_THEME[biome];
    const eventTypes = themeData.eventTypes || [];
    const intervalMs = themeData.eventIntervalMs || 10000;

    if (eventTypes.length === 0) return;

    // ponytail: cap concurrent events to 2 so screen never feels busy
    const MAX = 2;
    const schedule = () => {
      setEvents((prev) => {
        if (prev.length >= MAX) return prev;
        const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const key = `${type}-${++countRef.current}`;
        return [...prev, { key, type }];
      });
    };

    schedule();
    intervalRef.current = setInterval(schedule, intervalMs);

    return () => { clearInterval(intervalRef.current); };
  }, [heightM, reducedMotion]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {events.map((e) => (
        <BackgroundEvent
          key={e.key}
          eventType={e.type}
          reducedMotion={reducedMotion}
          onDone={() => setEvents((prev) => prev.filter((x) => x.key !== e.key))}
        />
      ))}
    </div>
  );
}

/**
 * Lazy, altitude-anchored parallax props behind the tower (balloon → birds →
 * plane → satellite → UFO) that descend past the climber as height references.
 * Includes biome-native creatures + random background events (shooting stars,
 * plane flybys, etc). A pure DOM layer (NOT Pixi — avoids the v8 strict-mode
 * canvas race) sitting behind the transparent Pixi canvas. Inert + reduced-motion safe.
 */
export function WordTowerParallaxProps({ heightM = 0, reducedMotion = false }: { heightM?: number; reducedMotion?: boolean }) {
  const biome = biomeBlendAt(heightM).fromId;
  const themeData = BIOME_THEME[biome];
  const nativePropIds = new Set(themeData.nativePropIds || []);

  const allActive = visiblePropsAt(heightM);
  // Filter to keep native props (if specified) + generic props always visible
  const active = nativePropIds.size > 0 ? allActive.filter((p) => nativePropIds.has(p.id)) : allActive;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {active.map((p) => (
        <FloatingProp key={p.id} prop={p} reducedMotion={reducedMotion} />
      ))}
      <BiomeEventEmitter heightM={heightM} reducedMotion={reducedMotion} />
    </div>
  );
}
