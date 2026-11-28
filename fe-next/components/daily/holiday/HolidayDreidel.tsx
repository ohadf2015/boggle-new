'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useHoliday } from '@/hooks/useHoliday';
import { DREIDEL_ORDER, dreidelFaces, type DreidelFace } from '@/lib/holidays/dailyDreidel';
import { cn } from '@/lib/utils';
import { holidayApi } from './holidayApi';
import { reducedMotion, spawnBurst } from './holidayBurst';
import styles from './holidayDaily.module.css';

type Phase = { s: 'ready' } | { s: 'spinning' } | { s: 'landed'; face: DreidelFace; coins: number } | { s: 'error' } | { s: 'not_played' };

const SPIN_MS = 2400;
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

export default function HolidayDreidel({ puzzleDate, initial }: { puzzleDate: string; initial?: { face: DreidelFace; coins: number } | null }) {
  const { t } = useLanguage();
  const { region } = useHoliday();
  const sfx = useSoundEffects();
  const faces = dreidelFaces(region);
  const [phase, setPhase] = useState<Phase>(initial ? { s: 'landed', ...initial } : { s: 'ready' });
  const [shown, setShown] = useState(initial ? DREIDEL_ORDER.indexOf(initial.face) : 0);
  const topRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const spin = async () => {
    setPhase({ s: 'spinning' });
    const result = holidayApi.spin('dreidel', puzzleDate);
    const land = (face: DreidelFace, coins: number) => {
      setShown(DREIDEL_ORDER.indexOf(face));
      setPhase({ s: 'landed', face, coins });
      if (coins > 0) {
        sfx.playCoinCascadeSound();
        const el = topRef.current;
        if (el) spawnBurst(el, el.offsetWidth / 2, el.offsetHeight / 2, 'coin', 14);
      } else {
        sfx.playButtonClickSound();
      }
    };
    const finish = async () => {
      try {
        const r = await result;
        if ('face' in r) land(r.face, r.coins);
        else setPhase({ s: r.status === 'not_played' ? 'not_played' : 'error' });
      } catch {
        setPhase({ s: 'error' });
      }
    };
    if (reducedMotion()) return finish();

    const start = performance.now();
    let last = -1;
    const turns = 7;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / SPIN_MS);
      const angle = easeOut(p) * 360 * turns;
      const wobble = Math.sin(p * Math.PI * 10) * (1 - p) * 12;
      if (topRef.current) topRef.current.style.transform = `rotate(${wobble}deg) rotateY(${angle}deg)`;
      const face = Math.floor(angle / 90) % 4;
      if (face !== last) {
        last = face;
        setShown(face);
        if (p < 0.9) sfx.playTileSelectSound();
      }
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else {
        if (topRef.current) topRef.current.style.transform = '';
        void finish();
      }
    };
    raf.current = requestAnimationFrame(tick);
  };

  const outcome = phase.s === 'landed' ? phase : null;
  return (
    <div data-testid="holiday-dreidel" className="flex flex-col items-center gap-2">
      <div className="relative flex h-28 w-28 items-center justify-center [perspective:400px]">
        <div ref={topRef} className="relative flex h-24 w-20 items-center justify-center will-change-transform">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/holidays/props-dreidel.webp" alt="" width={182} height={256} className="h-full w-auto" />
          <span
            className={cn(
              'absolute bottom-6 rounded-lg border-2 border-black bg-neo-holiday-blue px-1.5 font-neo-display text-2xl font-black leading-tight text-neo-white',
              outcome && styles.pop,
            )}
            aria-hidden="true"
          >
            {faces[shown]}
          </span>
        </div>
      </div>
      <p role="status" className="min-h-[2.5rem] text-center font-neo-display text-sm font-bold">
        {outcome
          ? t(`holiday.dreidel.${outcome.face}`, OUTCOME_FALLBACK[outcome.face], { coins: outcome.coins, letter: faces[DREIDEL_ORDER.indexOf(outcome.face)] })
          : phase.s === 'not_played'
            ? t('holiday.dreidel.notPlayed', 'Finish tonight’s daily while signed in to spin.')
            : phase.s === 'error'
            ? t('holiday.dreidel.error', 'The dreidel slipped. Try again.')
            : t('holiday.dreidel.prompt', 'Spin the dreidel for tonight’s gelt')}
      </p>
      {(phase.s === 'ready' || phase.s === 'error') && (
        <button
          type="button"
          onClick={spin}
          className="rounded-xl border-[3px] border-black bg-neo-holiday-blue px-5 py-2 font-neo-display text-base font-bold text-neo-white shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed"
        >
          {t('holiday.dreidel.spin', 'Spin!')}
        </button>
      )}
    </div>
  );
}

const OUTCOME_FALLBACK: Record<DreidelFace, string> = {
  nun: '{letter}: nothing this time. Spin again tomorrow night!',
  gimel: '{letter}: you take it all! +{coins} coins',
  hei: '{letter}: half the pot! +{coins} coins',
  shin: '{letter}: a little extra. +{coins} coins',
};
