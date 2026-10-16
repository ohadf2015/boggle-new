'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { EduMascot } from '@/components/education/EduMascot';
import { cn } from '@/lib/utils';

// Contains 0, 1, I and O, which the real room-code generator never emits.
export const DEMO_JOIN_CODE = 'PLAY01';

type PlayerId = 'maya' | 'dani' | 'noa' | 'you';

const STUDENT_START: Record<Exclude<PlayerId, 'you'>, number> = { maya: 2, dani: 1, noa: 1 };
const RACE: Array<Exclude<PlayerId, 'you'>> = ['dani', 'noa', 'dani', 'maya', 'noa', 'dani'];
const POP_STEP_MS = 90;
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
  noa: 'bg-neo-purple text-neo-black',
  you: 'bg-neo-pink text-neo-black',
};

const ORDER: PlayerId[] = ['maya', 'dani', 'noa', 'you'];

/**
 * The class moment on a projector: join bar, the board (children) and a live leaderboard.
 * Bar and leaderboard are decorative; the sr-only sentence carries the code.
 */
export function EducationLandingProjector({ youScore, children }: { youScore: number; children?: ReactNode }) {
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
        className="flex items-center justify-between gap-3 border-b-3 border-neo-cream/40 bg-neo-navy px-3 py-2 sm:px-4"
      >
        <div className="flex min-w-0 items-center gap-2">
          <EduMascot moment="gameStart" size={36} className="size-9 shrink-0" />
          <span className="truncate text-xs font-black uppercase tracking-wider text-neo-cream/75">
            {t('eg6Land.projector.joinLabel')}
          </span>
        </div>
        <span className="rounded-neo border-2 border-neo-black bg-neo-lime px-2.5 py-0.5 font-neo-display text-xl font-black tracking-[0.18em] text-neo-navy shadow-hard-sm">
          {DEMO_JOIN_CODE}
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,8.5rem)] items-start gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,11rem)] sm:gap-4 sm:p-4">
        <div className="min-w-0">{children}</div>
        <ol aria-hidden="true" className="space-y-1.5">
          {ranked.map((p, rank) => (
            <li
              key={p}
              data-player={p}
              className={cn(
                'rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-1.5 py-1 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
                popped ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
                p === 'you' && 'border-neo-pink',
              )}
              style={{ transitionDelay: popped ? `${rank * POP_STEP_MS}ms` : '0ms' }}
            >
              <div className="flex items-center gap-1.5">
                <span className={cn('grid size-5 shrink-0 place-items-center rounded-full border-2 border-neo-black text-[10px] font-black', CHIP_TONE[p])}>
                  {t(NAME_KEYS[p]).charAt(0)}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-neo-cream">{t(NAME_KEYS[p])}</span>
                <span className="font-neo-display text-sm font-black tabular-nums text-neo-cream">{scores[p]}</span>
              </div>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-neo-cream/15">
                <span
                  className={cn(
                    'block h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none',
                    p === 'you' ? 'bg-neo-pink' : 'bg-neo-cyan/80',
                  )}
                  style={{ width: `${Math.round((scores[p] / top) * 100)}%` }}
                />
              </span>
            </li>
          ))}
        </ol>
      </div>
      <p className="sr-only">{t('eg6Land.projector.srOnly', undefined, { code: DEMO_JOIN_CODE })}</p>
    </>
  );
}

export default EducationLandingProjector;
