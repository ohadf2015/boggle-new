'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import type { Guide } from './useGuidedFirstWord';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Ring {
  slot: number;
  x: number;
  y: number;
  size: number;
}

/** Where each guided wheel tile sits, relative to the overlay box. */
function useTileRings(box: HTMLElement | null, path: number[] | null, active: boolean): Ring[] {
  const [rings, setRings] = useState<Ring[]>([]);
  useLayoutEffect(() => {
    if (!box || !path || !active) {
      setRings([]);
      return;
    }
    const measure = () => {
      const origin = box.getBoundingClientRect();
      setRings(
        path.flatMap((slot) => {
          const el = document.querySelector<HTMLElement>(`[data-wheel-index="${slot}"]`);
          if (!el) return [];
          const r = el.getBoundingClientRect();
          return [{ slot, x: r.left - origin.left + r.width / 2, y: r.top - origin.top + r.height / 2, size: Math.max(r.width, r.height) + 12 }];
        }),
      );
    };
    measure();
    // The wheel deals its tiles in with a spin: measure again once it settles.
    const late = window.setTimeout(measure, 450);
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(late);
      window.removeEventListener('resize', measure);
    };
  }, [box, path, active]);
  return rings;
}

/**
 * The first daily word, taught on the real wheel: numbered rings over the
 * letters to swipe, the next one pulsing; then "tap to drop"; then a cheer for
 * the first floor. Never blocks a touch — the player is playing the whole time.
 */
export function GuidedWordCoach({ t, guide, swinging, selected, reducedMotion }: { t: T; guide: Guide; swinging: boolean; selected: number[]; reducedMotion: boolean }) {
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const spelling = guide.status === 'spell';
  const rings = useTileRings(box, guide.path, spelling);
  const { playSound } = useSoundEffects();
  useEffect(() => {
    if (guide.status === 'done') playSound('levelUp', { volume: 0.5 });
  }, [guide.status, playSound]);

  // Stays mounted after it finishes, so the cheer can fade out.
  if (guide.status === 'pending' || (guide.status === 'off' && !guide.path)) return null;
  const showDrop = guide.status === 'drop' && swinging;
  const onPath = !!guide.path && selected.every((s, i) => guide.path?.[i] === s);

  return (
    <div
      ref={setBox}
      data-testid="wt2-guide"
      data-status={guide.status}
      data-word={guide.word}
      className="pointer-events-none absolute inset-0 z-[35]"
    >
      {rings.map((r, i) => {
        const isNext = guide.next === r.slot;
        const taken = selected.includes(r.slot);
        return (
          <div
            key={r.slot}
            data-guide-slot={r.slot}
            data-next={isNext || undefined}
            className="absolute"
            style={{ left: r.x, top: r.y, width: r.size, height: r.size, transform: 'translate(-50%, -50%)' }}
          >
            <m.span
              className={`absolute inset-0 rounded-full border-4 ${isNext ? 'border-neo-pink' : taken ? 'border-neo-lime' : 'border-neo-white/60'}`}
              animate={isNext && !reducedMotion ? { scale: [1, 1.18, 1] } : { scale: 1 }}
              transition={isNext && !reducedMotion ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : SPRING_PRESETS.snappy}
            />
            <span className="absolute -end-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-neo-black bg-neo-yellow font-neo-display text-xs font-black text-neo-navy">
              {i + 1}
            </span>
          </div>
        );
      })}

      <AnimatePresence>
        {spelling || showDrop ? (
          <m.div
            key={guide.status}
            className="absolute inset-x-4 bottom-[calc(var(--wt2-dock,16rem)+0.75rem)] mx-auto flex max-w-sm flex-col items-center gap-2 rounded-neo border-neo-thick border-neo-cream bg-neo-navy-light px-4 py-3 shadow-hard"
            initial={reducedMotion ? false : { scale: 0.85, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={reducedMotion ? undefined : { scale: 0.9, opacity: 0 }}
            transition={SPRING_PRESETS.bouncy}
          >
            <span className="font-neo-display text-sm font-black uppercase tracking-wide text-neo-white">
              {spelling ? t('wordTowerV2.guide.spell') : t('wordTowerV2.guide.drop')}
            </span>
            {spelling ? (
              <span className="flex gap-1.5" dir="auto">
                {guide.word.split('').map((l, i) => (
                  <span
                    key={i}
                    className={`flex h-8 w-8 items-center justify-center rounded-md border-2 border-neo-black font-neo-display text-lg font-black ${
                      onPath && i < selected.length ? 'bg-neo-lime text-neo-navy' : 'bg-neo-navy text-neo-white'
                    }`}
                  >
                    {l}
                  </span>
                ))}
              </span>
            ) : null}
          </m.div>
        ) : null}
        {guide.status === 'done' ? (
          <m.div
            key="done"
            data-testid="wt2-guide-done"
            className="absolute inset-x-4 top-1/3 mx-auto w-fit rounded-neo border-neo-thick border-neo-black bg-neo-lime px-5 py-3 text-center font-neo-display text-2xl font-black uppercase text-neo-navy shadow-hard-lg"
            initial={reducedMotion ? false : { scale: 0.4, rotate: -6 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={reducedMotion ? undefined : { scale: 0.8, opacity: 0 }}
            transition={SPRING_PRESETS.bouncy}
          >
            {t('wordTowerV2.guide.done')}
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
