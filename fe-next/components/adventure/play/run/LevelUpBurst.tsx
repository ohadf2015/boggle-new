'use client';

/**
 * The payoff beat on its own screen (Bookworm "LEVEL UP!"): a spinning
 * sunburst, stars and confetti bursting out, a slammed stamp and a ribbon
 * saying what changed. Tap (or wait) to move on to the loot.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Heart, Star } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { MAP_ROWS } from '@/lib/adventure/play/runMap';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import { COIN_ART } from './art';

interface Props {
  run: PublicRun | null;
  stars: number;
  gold: number;
  onDone: () => void;
}

const COLORS = ['#c6ff00', '#ff40a0', '#00e5ff', '#ffd600', '#fff4e0'];
const AUTO_MS = 2400;

export default function LevelUpBurst({ run, stars, gold, onDone }: Props) {
  const { t } = useLanguageSafe();
  const { playLevelUpSound } = useSoundEffects();
  const reduce = useReducedMotion();
  const done = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  const finish = useCallback(() => { if (!done.current) { done.current = true; onDoneRef.current(); } }, []);

  useEffect(() => {
    playLevelUpSound?.();
    const id = setTimeout(finish, AUTO_MS);
    return () => clearTimeout(id);
  }, [playLevelUpSound, finish]);

  const bits = useMemo(() => Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2 + (i % 3) * 0.2;
    const d = 150 + ((i * 37) % 110);
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, star: i % 4 === 0, c: COLORS[i % COLORS.length], r: (i * 53) % 360, delay: (i % 5) * 0.03 };
  }), []);

  const step = run?.step ?? 1;
  const next = Math.min(MAP_ROWS, step + 1);

  return (
    <button type="button" onClick={finish} data-testid="level-up"
      className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-[#0f1b3d] text-neo-cream">
      {/* sunburst */}
      <motion.span aria-hidden className="absolute left-1/2 top-[42%] h-[180vmax] w-[180vmax] -translate-x-1/2 -translate-y-1/2 opacity-25"
        style={{ background: 'repeating-conic-gradient(from 0deg, #ffd600 0deg 9deg, transparent 9deg 22deg)' }}
        animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }} />
      <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,214,0,0.35)_0%,rgba(15,27,61,0.9)_45%,#0f1b3d_70%)]" />

      <span className="relative flex flex-col items-center">
        {!reduce && bits.map((b, i) => (
          <motion.span key={i} aria-hidden className="absolute left-1/2 top-1/2"
            initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
            animate={{ x: b.x, y: [0, b.y, b.y + 90], scale: [0, 1.2, 0.8], rotate: b.r + 360, opacity: [1, 1, 0] }}
            transition={{ duration: 2.2, delay: 0.18 + b.delay, ease: 'easeOut', times: [0, 0.45, 1] }}>
            {b.star
              ? <Star className="h-6 w-6 -translate-x-1/2 -translate-y-1/2 stroke-black stroke-2" style={{ fill: b.c }} />
              : <span className="block h-3 w-2 -translate-x-1/2 -translate-y-1/2 border-2 border-black" style={{ background: b.c }} />}
          </motion.span>
        ))}

        <motion.span
          initial={reduce ? false : { scale: 3, rotate: -18, opacity: 0 }}
          animate={{ scale: 1, rotate: -6, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 13 }}
          className="relative block rounded-3xl border-[5px] border-black bg-neo-yellow px-6 py-2 font-neo-display text-[3.4rem] font-bold uppercase leading-none text-black shadow-[8px_8px_0_#000]">
          {t('adventurePlay.loot.levelUp')}
        </motion.span>

        <motion.span
          initial={reduce ? false : { scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: reduce ? 0 : 0.35, type: 'spring', stiffness: 300, damping: 20 }}
          className="relative mt-6 block min-w-[17rem] rounded-xl border-[3px] border-black bg-neo-cream px-4 py-3 text-center text-black shadow-[5px_5px_0_#000]">
          <span className="block text-xs font-black uppercase tracking-widest opacity-70">
            {t('adventurePlay.loot.levelUpCleared', { step, total: MAP_ROWS })}
          </span>
          <span className="mt-0.5 block font-neo-display text-xl font-bold leading-tight">
            {step >= MAP_ROWS ? t('adventurePlay.loot.levelUpDone') : t('adventurePlay.loot.levelUpNext', { next })}
          </span>
          <span className="mt-2 flex items-center justify-center gap-3 font-neo-display text-base font-bold tabular-nums">
            <span className="inline-flex items-center gap-1"><Star className="h-5 w-5 fill-neo-yellow stroke-black stroke-2" />{stars}/3</span>
            {run && <span className="inline-flex items-center gap-1"><Heart className="h-5 w-5 fill-neo-pink stroke-black stroke-2" />{run.hp}/{run.maxHp}</span>}
            {gold > 0 && (
              <span className="inline-flex items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
                <img src={COIN_ART} alt="" className="h-5 w-5" />+{gold}
              </span>
            )}
          </span>
        </motion.span>
      </span>

      <motion.span initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.5, 1] }} transition={{ delay: reduce ? 0 : 0.9, duration: 1.4, repeat: reduce ? 0 : Infinity }}
        className="absolute bottom-[max(2rem,env(safe-area-inset-bottom))] text-sm font-black uppercase tracking-widest">
        {t('adventurePlay.loot.tapToContinue')}
      </motion.span>
    </button>
  );
}
