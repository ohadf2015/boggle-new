'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { cn } from '@/lib/utils';
import type { RivalMarker } from '@/lib/wordTower/rivals';
import { sabotageFloorsFor, SABOTAGE_M_PER_FLOOR, heightToBlocks } from '@/lib/wordTower/sabotage';

interface WordTowerSmashSceneProps {
  target: RivalMarker;
  onDone: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  reducedMotion?: boolean;
}

type SceneState = 'swing' | 'result';

/**
 * WordTowerSmashScene — full-screen interactive smash overlay.
 *
 * Flow:
 * - Mounts showing a wrecking ball that swings left↔right (GSAP pendulum)
 * - Player taps SMASH! to release
 * - Ball arcs into the building, blocks shatter / fly off (staggered)
 * - Shows the result: "💥 -N FLOORS!" and the rival's new height
 * - Auto-closes after ~2.2s or when player taps DONE
 * - onDone is called exactly once at the end, committing the hit server-side
 *
 * Reduced motion: SMASH jumps straight to result state; DONE still calls onDone.
 */
export function WordTowerSmashScene({
  target,
  onDone,
  t,
  reducedMotion,
}: WordTowerSmashSceneProps) {
  const [state, setState] = useState<SceneState>(reducedMotion ? 'result' : 'swing');
  const containerRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const buildingRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate damage and new height
  const floorsDestroyed = sabotageFloorsFor();
  const newHeightM = Math.max(0, target.heightM - floorsDestroyed * SABOTAGE_M_PER_FLOOR);
  const blockCount = heightToBlocks(target.heightM);
  const blocksDestroyed = Math.ceil((floorsDestroyed * SABOTAGE_M_PER_FLOOR) / SABOTAGE_M_PER_FLOOR);

  // GSAP animations with useGSAP for auto-cleanup
  useGSAP(
    () => {
      if (!containerRef.current) return;
      if (!ballRef.current || reducedMotion) return;

      // Swing the ball left↔right continuously until released
      if (state === 'swing') {
        gsap.set(ballRef.current, { transformOrigin: '50% 0%' });
        gsap.to(ballRef.current, {
          rotation: 15,
          y: 8,
          duration: 1.6,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      }

      // Release animation: arc into the building + impact
      if (state === 'result' && buildingRef.current) {
      const timeline = gsap.timeline();

      // Ball arcs across toward the building
      timeline.to(
        ballRef.current,
        {
          x: 200,
          y: 300,
          rotation: 360,
          opacity: 0,
          duration: 0.6,
          ease: 'power2.in',
        },
        0,
      );

      // Building blocks shatter upward from the top, staggered
      const blocks = buildingRef.current.querySelectorAll('[data-block]');
      blocks.forEach((block, i) => {
        if (i >= blockCount - blocksDestroyed) {
          timeline.to(
            block,
            {
              y: -150 - Math.random() * 100,
              x: (Math.random() - 0.5) * 200,
              rotation: Math.random() * 360,
              opacity: 0,
              duration: 0.5,
              ease: 'power2.out',
            },
            0.1 + i * 0.08,
          );
        }
      });

      // Impact flash
      const flash = document.createElement('div');
      flash.className = 'pointer-events-none fixed inset-0 z-[101] bg-neo-yellow opacity-0';
      document.body.appendChild(flash);
      timeline.to(flash, { opacity: 0.5, duration: 0.1, ease: 'power2.out' }, 0.5);
      timeline.to(flash, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0.6);
      timeline.add(() => flash.remove(), 0.8);

      // Screen shake (slight)
      timeline.to(
        document.documentElement,
        {
          '--shake-x': '4px',
          duration: 0.05,
          repeat: 3,
          yoyo: true,
          ease: 'power1.inOut',
        },
        0.5,
      );

      // Auto-close after result animation + beat
      timeline.add(() => {
        if (!doneRef.current) {
          doneRef.current = true;
          autoCloseTimerRef.current = setTimeout(() => {
            onDone();
          }, 2200);
        }
      });
      }
    },
    { scope: containerRef, dependencies: [state, reducedMotion] },
  );

  // Release the ball when SMASH is tapped
  const handleSmash = () => {
    gsap.killTweensOf(ballRef.current);
    setState('result');
  };

  // Done button or auto-close callback
  const handleDone = () => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    if (!doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-auto fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('wordTower.sabotage.smashTitle')}
      style={{ '--shake-x': '0px' } as React.CSSProperties}
    >
      <style>{`
        @property --shake-x {
          syntax: '<length>';
          initial-value: 0px;
          inherits: false;
        }
        [data-scene-wrapper] {
          transform: translateX(var(--shake-x));
        }
      `}</style>

      <div
        data-scene-wrapper
        className="flex w-full max-w-md flex-col items-center gap-6 rounded-neo border-neo-thick border-black bg-neo-navy p-6 shadow-hard"
      >
        {/* Target info header */}
        <div className="w-full text-center">
          <h2 className="font-neo-display text-lg font-black uppercase text-neo-white">
            {state === 'swing' ? t('wordTower.sabotage.smashTitle') : t('wordTower.sabotage.floorsDestroyed', { n: floorsDestroyed })}
          </h2>
          {state === 'swing' && (
            <p className="mt-1 font-neo-body text-sm text-neo-white/70">
              {target.name}
            </p>
          )}
        </div>

        {/* Wrecking ball + building visualization */}
        {state === 'swing' && (
          <div className="relative h-[280px] w-full">
            {/* Chain */}
            <div className="absolute left-1/2 top-0 h-20 w-1 -translate-x-1/2 bg-black" />

            {/* Ball */}
            <div
              ref={ballRef}
              className="absolute left-1/2 top-20 h-10 w-10 -translate-x-1/2 rounded-full border-neo-thick border-black bg-neo-pink shadow-hard"
              aria-hidden
            >
              <span className="flex h-full items-center justify-center text-xl">💥</span>
            </div>

            {/* Building */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 space-y-1">
              <div
                ref={buildingRef}
                className="flex flex-col gap-1"
              >
                {Array.from({ length: blockCount }).map((_, i) => (
                  <div
                    key={i}
                    data-block
                    className={cn(
                      'h-6 w-20 rounded-sm border-neo border-black shadow-hard transition-colors',
                      i >= blockCount - blocksDestroyed
                        ? 'bg-neo-red/70'
                        : 'bg-neo-yellow',
                    )}
                  />
                ))}
              </div>
              <div className="pt-1 text-center font-neo-body text-xs text-neo-white/60">
                {Math.round(target.heightM)}m
              </div>
            </div>
          </div>
        )}

        {/* Result state */}
        {state === 'result' && (
          <div className="flex w-full flex-col items-center gap-4">
            {/* Impact emoji + damage */}
            <div className="text-center">
              <div className="mb-2 text-4xl">💥</div>
              <div className="font-neo-display text-2xl font-black uppercase text-neo-pink">
                −{floorsDestroyed * SABOTAGE_M_PER_FLOOR}m
              </div>
              <div className="mt-2 font-neo-display text-base font-black uppercase text-neo-white">
                {target.name}
              </div>
            </div>

            {/* New height readout */}
            <div className="flex items-center gap-2 rounded-neo border-neo border-black bg-neo-navy-light px-3 py-2">
              <span className="font-neo-body text-sm text-neo-white/70">
                {t('wordTower.sabotage.newHeight')}
              </span>
              <span className="font-neo-display text-lg font-black text-neo-cyan">
                {Math.round(newHeightM)}m
              </span>
            </div>

            {/* Building preview (shorter) */}
            <div className="flex flex-col gap-1">
              {Array.from({ length: blockCount }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-4 w-16 rounded-sm border-neo border-black shadow-hard',
                    i >= blockCount - blocksDestroyed
                      ? 'bg-neo-navy/40'
                      : 'bg-neo-yellow',
                  )}
                />
              ))}
              <div className="pt-1 text-center font-neo-body text-xs text-neo-white/60">
                {Math.round(newHeightM)}m
              </div>
            </div>
          </div>
        )}

        {/* Action button */}
        <button
          type="button"
          onClick={state === 'swing' ? handleSmash : handleDone}
          className={cn(
            'w-full rounded-neo border-neo-thick border-black px-4 py-3 font-neo-display text-base font-black uppercase shadow-hard transition-transform active:translate-y-px',
            state === 'swing'
              ? 'bg-neo-pink text-neo-white hover:scale-105'
              : 'bg-neo-lime text-neo-black hover:scale-105',
          )}
        >
          {state === 'swing' ? t('wordTower.sabotage.smashCta') : t('wordTower.sabotage.done')}
        </button>
      </div>
    </div>
  );
}
