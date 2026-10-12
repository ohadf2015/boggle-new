'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Mascot from '@/components/ui/Mascot';
import { cn } from '@/lib/utils';

// Contains 0, 1, I and O, which the real room-code generator never emits.
export const DEMO_JOIN_CODE = 'PLAY01';

type PlayerId = 'maya' | 'dani' | 'noa' | 'you';

const STUDENT_START: Record<Exclude<PlayerId, 'you'>, number> = { maya: 2, dani: 1, noa: 1 };
const RACE: Array<Exclude<PlayerId, 'you'>> = ['dani', 'noa', 'dani', 'maya', 'noa', 'dani'];
const POP_STEP_MS = 140;
const RACE_TICK_MS = 1600;
const REDUCED = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

const NAME_KEYS: Record<PlayerId, string> = {
  maya: 'eg6Land.projector.players.maya',
  dani: 'eg6Land.projector.players.dani',
  noa: 'eg6Land.projector.players.noa',
  you: 'eg6Land.projector.you',
};

const CHIP_TONE: Record<PlayerId, string> = {
  maya: 'bg-neo-lime text-neo-navy',
  dani: 'bg-neo-cyan text-neo-navy',
  noa: 'bg-neo-purple text-neo-cream',
  you: 'bg-neo-pink text-neo-navy',
};

const ORDER: PlayerId[] = ['maya', 'dani', 'noa', 'you'];

// Decorative frame; the sr-only sentence below carries the code for assistive tech.
export function EducationLandingProjector({ youScore }: { youScore: number }) {
  const { t } = useLanguage();
  const [popped, setPopped] = useState(REDUCED());
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    if (REDUCED()) return;
    const id = window.setTimeout(() => setPopped(true), 200);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!popped || REDUCED() || ticks >= RACE.length) return;
    const id = window.setTimeout(() => setTicks((n) => n + 1), RACE_TICK_MS);
    return () => window.clearTimeout(id);
  }, [popped, ticks]);

  const scores: Record<PlayerId, number> = { ...STUDENT_START, you: youScore };
  RACE.slice(0, ticks).forEach((p) => {
    scores[p] += 1;
  });

  const ranked = [...ORDER].sort((a, b) => scores[b] - scores[a] || ORDER.indexOf(a) - ORDER.indexOf(b));
  const top = Math.max(1, ...ORDER.map((p) => scores[p]));

  return (
    <>
      <div
        aria-hidden="true"
        className="rounded-neo border-neo-thick border-neo-cream/60 bg-neo-navy p-3 shadow-hard sm:p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="hidden sm:block">
              <Mascot variant="scholar" size="xs" clipShape="circle" clipBorder="lime" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-neo-cream/70">
              {t('eg6Land.projector.joinLabel')}
            </span>
          </div>
          <span className="font-neo-display text-2xl font-black tracking-[0.2em] text-neo-lime">{DEMO_JOIN_CODE}</span>
        </div>

        <ul className="mt-3 flex flex-wrap gap-2" dir="ltr">
          {ORDER.map((p, i) => (
            <li
              key={p}
              className={cn(
                'flex items-center gap-1.5 rounded-full border-2 border-black py-0.5 pe-3 ps-0.5 text-xs font-black shadow-hard-sm',
                'transition-transform duration-300 motion-reduce:transition-none',
                popped ? 'scale-100' : 'scale-0',
                p === 'you' ? 'text-neo-cream' : 'text-neo-cream/90',
              )}
              style={{ transitionDelay: popped ? `${i * POP_STEP_MS}ms` : '0ms' }}
            >
              <span className={cn('flex size-6 items-center justify-center rounded-full border-2 border-black', CHIP_TONE[p])}>
                {t(NAME_KEYS[p]).charAt(0)}
              </span>
              {t(NAME_KEYS[p])}
            </li>
          ))}
        </ul>

        <ol className="mt-3 space-y-1.5">
          {ranked.map((p, rank) => (
            <li
              key={p}
              data-player={p}
              className={cn(
                'flex items-center gap-2 transition-opacity duration-300 motion-reduce:transition-none',
                popped ? 'opacity-100' : 'opacity-0',
              )}
              style={{ transitionDelay: popped ? `${ORDER.length * POP_STEP_MS + rank * 60}ms` : '0ms' }}
            >
              <span className="w-4 text-xs font-black text-neo-cream/60">{rank + 1}</span>
              <span className="w-14 truncate text-xs font-bold text-neo-cream">{t(NAME_KEYS[p])}</span>
              <span className="h-3 flex-1 overflow-hidden rounded-full bg-neo-cream/15">
                <span
                  className={cn(
                    'block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none',
                    p === 'you' ? 'bg-neo-pink' : 'bg-neo-cyan/80',
                  )}
                  style={{ width: `${Math.round((scores[p] / top) * 100)}%` }}
                />
              </span>
              <span className="w-5 text-end font-neo-display text-sm font-black text-neo-cream">{scores[p]}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="sr-only">{t('eg6Land.projector.srOnly', undefined, { code: DEMO_JOIN_CODE })}</p>
    </>
  );
}

export default EducationLandingProjector;
