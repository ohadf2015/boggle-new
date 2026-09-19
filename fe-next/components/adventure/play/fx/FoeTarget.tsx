'use client';

/**
 * The foe on normal (non-combat) levels — something for a word to HIT.
 * The level's score race is drawn as damage: the world's creature, a chunky pip
 * HP bar (HP = top-star score) with the three stars on it, a hurt flash + recoil
 * when a word lands, and a K.O. stamp at 3 stars. BoardFx flies the letters to the
 * `[data-adv-hit-target]` portrait and prints the "-N" there.
 */
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, Swords } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { HitEvent } from '../events';
import { foeView } from './foeView';
import { castTiming } from './castPath';
import { countTween } from './markSpot';

/** The bar drops when the cast lands (same timing BoardFx flies with); the white "ghost" chunk drains after. */
const GHOST_LAG_MS = 900;
const COUNT_MS = 420;

/** The HP number counts down (ease-out) instead of snapping. */
function useCountDown(value: number, ms: number): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value || ms <= 0) { from.current = value; setShown(value); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const v = countTween(start, value, now - t0, ms);
      from.current = v;
      setShown(v);
      if (v !== value) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}
/** The foe holds its hurt frame + red flash this long, so the hit reads in every frame after impact. */
const HURT_MS = 760;

interface Props {
  world: number;
  score: number;
  stars: readonly number[];
  lastHit: HitEvent | null;
}

export default function FoeTarget({ world, score, stars, lastHit }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  // What the bar shows lags the real score so HP drops when the letters land, not on submit.
  const [shown, setShown] = useState(score);
  const [ghost, setGhost] = useState(score);
  const [hurt, setHurt] = useState(false);
  const [chip, setChip] = useState<{ id: number; dmg: number } | null>(null);
  const seen = useRef<number | null>(lastHit?.id ?? null);
  const impactMs = reduce || !lastHit ? 0 : castTiming(Array.from(lastHit.word).length, false).impactMs;

  useEffect(() => {
    if (reduce || score < shown) { setShown(score); setGhost(score); return; }
    const a = setTimeout(() => setShown(score), impactMs);
    const b = setTimeout(() => setGhost(score), impactMs + GHOST_LAG_MS);
    return () => { clearTimeout(a); clearTimeout(b); };
    // A score change (or the hit that caused it) re-arms the timers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, reduce, impactMs, lastHit?.id]);

  useEffect(() => {
    if (!lastHit || lastHit.result !== 'ok' || seen.current === lastHit.id) return;
    seen.current = lastHit.id;
    const hit = lastHit;
    const a = setTimeout(() => { setHurt(true); setChip({ id: hit.id, dmg: hit.pts }); }, impactMs);
    const b = setTimeout(() => setHurt(false), impactMs + HURT_MS);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [lastHit, impactMs]);

  const view = foeView(shown, stars);
  const trail = foeView(ghost, stars);
  const down = view.defeated;
  const hpNum = useCountDown(view.hp, reduce ? 0 : COUNT_MS);
  const name = t(`adventurePlay.combat.elite.w${world}`);
  const frame = down || hurt ? 'hurt' : 'idle';

  return (
    <div className="relative w-full" data-testid="adv-foe">
      <div className="relative flex items-center gap-2.5 rounded-2xl border-[3px] border-black bg-[#0f1b3d]/90 p-2 shadow-[4px_4px_0_#000]">
        {/* Portrait — the hit target */}
        <div data-adv-hit-target className="relative shrink-0 w-[5.75rem] h-[5.75rem]">
          <div className={cn('absolute inset-0 rounded-xl border-[3px] border-black',
            hurt ? 'bg-[radial-gradient(circle,#ff4d4d_0%,#3b0a1e_75%)]' : 'bg-[radial-gradient(circle,#3a5a2a_0%,#0b1330_75%)]')} />
          <motion.div
            className="absolute inset-1"
            animate={reduce ? undefined
              : down ? { rotate: -12, y: 6, scale: 0.92 }
                : hurt ? { x: [0, 16, 13, 10, -4, 0], y: [0, -8, -6, -3, 0, 0], rotate: [0, 12, 9, 6, -3, 0], scale: [1, 0.86, 0.92, 0.96, 1.02, 1] }
                  : { y: [0, -3, 0] }}
            transition={down ? { duration: 0.4 } : hurt ? { duration: HURT_MS / 1000, times: [0, 0.06, 0.3, 0.55, 0.8, 1] } : { duration: 2.2, repeat: Infinity }}
          >
            <Image src={`/images/adventure/enemies/w${world}-${frame}.webp`} alt={name} fill sizes="92px" priority
              className={cn('object-contain drop-shadow-[3px_3px_0_#000]', hurt && !down && 'brightness-150 saturate-50', down && 'grayscale opacity-70')} />
          </motion.div>
          {down && (
            <span role="status" className="absolute inset-x-[-6px] top-1/2 -translate-y-1/2 -rotate-[8deg] text-center rounded-lg border-[3px] border-black bg-neo-yellow px-1 py-0.5 font-neo-display font-black text-sm uppercase text-black shadow-[3px_3px_0_#000]">
              {t('adventurePlay.juice.foeDown')}
            </span>
          )}
        </div>

        {/* Name + pip HP with the star thresholds on it */}
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-neo-lime px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
              <Swords className="w-3 h-3" /> {t('adventurePlay.juice.foeTag')}
            </span>
            <span className="font-neo-display font-bold text-neo-cream text-base truncate">{name}</span>
          </div>
          <div className="relative pb-3">
            <div className="flex gap-[3px] rounded-lg border-[3px] border-black bg-black p-[2px]"
              role="progressbar" aria-label={t('adventurePlay.juice.foeGoal', { max: view.max })}
              aria-valuemin={0} aria-valuemax={view.max} aria-valuenow={view.hp}>
              {view.pips.map((f, i) => (
                <div key={i} className="relative h-5 flex-1 rounded-[3px] bg-[#2a1030] overflow-hidden">
                  <div className="absolute inset-y-0 start-0 bg-neo-cream transition-[width] duration-500 ease-in" style={{ width: `${trail.pips[i] * 100}%` }} />
                  <div className="absolute inset-y-0 start-0 bg-[#ff4d4d] transition-[width] duration-300 ease-out" style={{ width: `${f * 100}%` }} />
                  {/* Quarter ticks: each pip is four chunks of damage */}
                  <div className="absolute inset-0 grid grid-cols-4 divide-x divide-black/40" aria-hidden>
                    <span /><span /><span /><span />
                  </div>
                </div>
              ))}
            </div>
            {view.marks.map((m, i) => (
              <Star key={i} aria-hidden
                className={cn('absolute bottom-0 w-5 h-5 -translate-x-1/2 rtl:translate-x-1/2 stroke-black stroke-[2.5]',
                  m.earned ? 'fill-neo-yellow' : 'fill-[#2a2a4e]')}
                style={{ insetInlineStart: `clamp(10px, ${m.at * 100}%, calc(100% - 10px))` }} />
            ))}
          </div>
          <div className="flex items-baseline justify-between text-xs font-bold">
            <span className="relative inline-flex items-center gap-1">
              <span className={cn('tabular-nums text-[#ff8080] transition-colors', hpNum !== view.hp && 'text-white')}>{t('adventurePlay.juice.foeHp', { hp: hpNum, max: view.max })}</span>
              {chip && chip.dmg > 0 && (
                <span key={chip.id} dir="ltr" className="adv-hp-chip inline-block rounded-md border-2 border-black bg-[#ff4d4d] px-1 font-neo-display text-sm font-black leading-tight text-black shadow-[2px_2px_0_#000] tabular-nums">
                  -{chip.dmg}
                </span>
              )}
            </span>
            <span className="tabular-nums text-neo-cream/80">{t('adventurePlay.score')} <span className="font-neo-display text-base text-neo-cream">{score}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
