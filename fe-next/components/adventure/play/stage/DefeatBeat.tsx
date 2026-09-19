'use client';

/**
 * The player's death, as a beat before the run summary: the screen bleeds
 * red, every heart shatters in turn, the enemy looms in its attack pose, and
 * the blow that did it is named ("Slain by Heavy Slam"), with how close the
 * fight was. Tap to continue once the beat has landed.
 */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Heart, HeartCrack } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import type { CombatState } from '@/lib/adventure/play/combat';
import { enemyArt, moveKey } from './combatView';

const TAP_AFTER_MS = 1400;

interface Props {
  world: number;
  isBoss: boolean;
  name: string;
  combat: CombatState;
  defeatLine: string | null;
  onDone: () => void;
}

export default function DefeatBeat({ world, isBoss, name, combat, defeatLine, onDone }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const [canTap, setCanTap] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setCanTap(true), TAP_AFTER_MS);
    const b = setTimeout(onDone, 5200);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [onDone]);

  const hearts = Math.max(1, combat.maxHp);
  const pct = combat.enemyMaxHp > 0 ? Math.max(1, Math.round((combat.enemyHp / combat.enemyMaxHp) * 100)) : 0;

  return (
    <motion.button type="button" onClick={() => canTap && onDone()} aria-label={t('adventurePlay.combat.skip')} data-testid="defeat-beat"
      className="absolute inset-0 pointer-events-auto grid place-items-center overflow-hidden bg-[#12040b]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }} transition={{ duration: 0.5 }}>
      <motion.div aria-hidden className="absolute inset-0" style={{ boxShadow: 'inset 0 0 180px 70px rgba(255,20,60,0.75)' }}
        animate={reduce ? undefined : { opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.6, repeat: Infinity }} />

      {/* The enemy looms over the fallen hero */}
      <motion.div aria-hidden className="absolute top-[4%] left-1/2 h-[46vh] w-[46vh] max-w-[95vw] -translate-x-1/2"
        initial={reduce ? false : { scale: 0.6, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 0.9 }} transition={{ duration: 0.9, ease: 'easeOut' }}>
        <Image src={enemyArt(world, isBoss, isBoss ? 'enraged' : 'attack')} alt="" fill sizes="46vh" className="object-contain drop-shadow-[6px_6px_0_#000]" />
      </motion.div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#12040b] via-[#12040b]/95 to-transparent" />

      <div className="relative mt-[30vh] flex w-full max-w-md flex-col items-center gap-3 px-4 text-center">
        {/* Hearts shatter one by one */}
        <div className="flex flex-wrap justify-center gap-1.5" aria-label={t('adventurePlay.combat.yourHp')}>
          {Array.from({ length: hearts }, (_, i) => (
            <motion.span key={i} className="relative grid h-9 w-9 place-items-center"
              initial={reduce ? false : { scale: 1.3 }} animate={reduce ? undefined : { scale: [1.3, 1, 0.9], rotate: [0, i % 2 ? 14 : -14, i % 2 ? 8 : -8] }}
              transition={{ delay: 0.3 + i * 0.12, duration: 0.35 }}>
              <Heart aria-hidden className="absolute h-9 w-9 fill-[#3a0d1c] stroke-black stroke-[2.5]" />
              <motion.span className="relative" initial={reduce ? false : { opacity: 0, scale: 2 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.12, duration: 0.25 }}>
                <HeartCrack aria-hidden className="h-6 w-6 text-neo-pink" strokeWidth={2.75} />
              </motion.span>
            </motion.span>
          ))}
        </div>

        <motion.div initial={reduce ? false : { scale: 2.6, rotate: 8, opacity: 0 }} animate={{ scale: 1, rotate: -4, opacity: 1 }}
          transition={{ delay: 0.45, type: 'spring', stiffness: 360, damping: 14 }}
          className="max-w-full rounded-xl border-[4px] border-black bg-black px-5 py-1 font-neo-display text-[clamp(1.9rem,10vw,3rem)] font-black uppercase leading-tight text-neo-pink shadow-[6px_6px_0_#ff3366] break-words">
          {t('adventurePlay.combat.youFell')}
        </motion.div>

        {combat.killedBy && (
          <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
            className="rounded-lg border-[3px] border-black bg-neo-pink px-3 py-1 font-neo-display text-base font-black text-black shadow-[3px_3px_0_#000]">
            {t('adventurePlay.combat.defeat.slainBy', { move: t(moveKey(combat.killedBy)) })}
          </motion.div>
        )}

        <motion.div initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }} className="w-full max-w-xs">
          <div className="text-xs font-bold text-neo-cream/85">{t('adventurePlay.combat.defeat.hpLeft', { name, percent: pct })}</div>
          <div className="mt-1 h-3.5 rounded-full border-[3px] border-black bg-black">
            <div className="h-full rounded-full bg-[#ff4d4d]" style={{ width: `${pct}%` }} />
          </div>
        </motion.div>

        {defeatLine && (
          <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
            className="max-w-xs rounded-lg border-[3px] border-black bg-neo-cream px-3 py-1.5 text-sm font-bold text-black shadow-[3px_3px_0_#000]">“{t(defeatLine)}”</motion.p>
        )}
        <motion.p animate={{ opacity: canTap ? 1 : 0 }} className="text-xs font-bold uppercase tracking-widest text-neo-cream/70">
          {t('adventurePlay.combat.defeat.continue')}
        </motion.p>
      </div>
    </motion.button>
  );
}
