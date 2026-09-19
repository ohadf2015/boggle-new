'use client';

/**
 * Full-screen combat moments, portalled above the level (and above the
 * saving spinner / result card for a beat): BOSS BATTLE intro with the boss
 * loop video, phase-change flash + splash, red damage vignette, and the
 * finale — the kill banner (KillBanner), or the player's defeat beat (DefeatBeat).
 */
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Crown, Swords } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { getBossConfig } from '@/lib/adventure/bossConfig';
import type { CombatState } from '@/lib/adventure/play/combat';
import type { RelicId } from '@/lib/adventure/play/relics';
import { cn } from '@/lib/utils';
import { enemyArt, ruleKey } from './combatView';
import KillBanner from './KillBanner';
import DefeatBeat from './DefeatBeat';

type Moment = { kind: 'intro' | 'phase' | 'victory' | 'death'; id: number };

// The finale components end themselves (tap or their own timer).
const DURATION: Record<Moment['kind'], number> = { intro: 2600, phase: 1700, victory: 20_000, death: 20_000 };
const FINALE_DELAY_MS = 550;
/** The kill banner waits for the word-cast K.O. beat (WordCast, ≤1.2s) to land first. */
const KILL_DELAY_MS = 1150;

interface Props {
  world: number;
  isBoss: boolean;
  combat: CombatState;
  hurtPulse: number;
  phasePulse: number;
  victoryLine: string | null;
  defeatLine: string | null;
  /** Elite kill: the relic it minted. */
  trophy?: RelicId | null;
  /** Boss kill: the server granted the world trophy. */
  bossTrophy?: boolean;
  /** Boss kill: stars the server settled. */
  bossStars?: number;
  /** The finale (kill banner / defeat beat) has ended: the result screen may come up. */
  onFinaleDone?: () => void;
}

function BossVideo({ world, reduce }: { world: number; reduce: boolean | null }) {
  const poster = `/videos/adventure/boss-w${world}.webp`;
  if (reduce) {
    // eslint-disable-next-line @next/next/no-img-element -- poster still
    return <img src={poster} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />;
  }
  return (
    <video src={`/videos/adventure/boss-w${world}.mp4`} poster={poster} autoPlay muted loop playsInline aria-hidden
      className="absolute inset-0 w-full h-full object-cover" />
  );
}

export default function CombatOverlay({ world, isBoss, combat, hurtPulse, phasePulse, victoryLine, defeatLine, trophy = null, bossTrophy = false, bossStars = 0, onFinaleDone }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  // No auto intro splash: LevelIntro already reveals the enemy (art / boss video, name, rule) before
  // Fight!, and a second opaque card here covered the board while the clock and telegraph ran.
  const [moment, setMoment] = useState<Moment | null>(null);
  const [mounted, setMounted] = useState(false);
  const boss = isBoss ? getBossConfig(world) : null;
  const name = boss ? t(boss.displayName) : t(`adventurePlay.combat.elite.w${world}`);

  useEffect(() => setMounted(true), []);
  // The phase splash waits for the word that caused it to finish flying in.
  useEffect(() => {
    if (!phasePulse) return;
    const id = setTimeout(() => setMoment((m) => (m?.kind === 'victory' || m?.kind === 'death' ? m : { kind: 'phase', id: phasePulse + 10 })), FINALE_DELAY_MS);
    return () => clearTimeout(id);
  }, [phasePulse]);
  // Let the killing blow (letters flying, hit number) land before the finale.
  useEffect(() => {
    if (!combat.defeated && !combat.dead) return;
    const next: Moment = combat.defeated ? { kind: 'victory', id: 1000 } : { kind: 'death', id: 2000 };
    const id = setTimeout(() => setMoment(next), combat.defeated ? KILL_DELAY_MS : FINALE_DELAY_MS);
    return () => clearTimeout(id);
  }, [combat.defeated, combat.dead]);
  useEffect(() => {
    if (!moment) return;
    const id = setTimeout(() => setMoment((m) => (m?.id === moment.id ? null : m)), DURATION[moment.kind]);
    return () => clearTimeout(id);
  }, [moment]);

  const dismiss = useCallback(() => setMoment(null), []);
  const endFinale = useCallback(() => { setMoment(null); onFinaleDone?.(); }, [onFinaleDone]);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden" dir="auto">
      {/* Damage vignette */}
      <AnimatePresence>
        {hurtPulse > 0 && (
          <motion.div key={`hurt-${hurtPulse}`} className="absolute inset-0"
            style={{ boxShadow: 'inset 0 0 70px 14px rgba(255,20,60,0.9)' }}
            initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {moment?.kind === 'intro' && (
          <motion.button type="button" key="intro" onClick={dismiss} aria-label={t('adventurePlay.combat.skip')}
            className="absolute inset-0 pointer-events-auto grid place-items-center bg-[#0f1b3d]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.35 } }}>
            {isBoss ? <BossVideo world={world} reduce={reduce} /> : (
              // eslint-disable-next-line @next/next/no-img-element -- world backdrop behind the elite card
              <img src={`/images/adventure/play/world-${world}.webp`} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(15,27,61,0.1)_0%,rgba(15,27,61,0.92)_70%)]" />
            <div className="relative flex flex-col items-center gap-3 px-6 text-center">
              <motion.div initial={reduce ? false : { scale: 0.2, rotate: -200 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 160, damping: 14 }}
                className="relative w-56 h-56 rounded-full border-[5px] border-black bg-neo-yellow shadow-[6px_6px_0_#000] grid place-items-center overflow-hidden">
                <div className="absolute inset-3 rounded-full border-[3px] border-dashed border-black/60" />
                <div className="relative w-40 h-40">
                  <Image src={enemyArt(world, isBoss, 'idle')} alt={name} fill sizes="160px" className="object-contain drop-shadow-[3px_3px_0_#000]" priority />
                </div>
              </motion.div>
              <motion.div initial={reduce ? false : { y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
                className={cn('-mt-8 rounded-xl border-[4px] border-black px-4 py-1.5 font-neo-display font-black text-3xl uppercase tracking-wide text-black shadow-[5px_5px_0_#000] -rotate-3',
                  isBoss ? 'bg-neo-pink' : 'bg-neo-cyan')}>
                <span className="inline-flex items-center gap-2">
                  {isBoss ? <Crown className="w-7 h-7" /> : <Swords className="w-7 h-7" />}
                  {isBoss ? t('adventurePlay.combat.bossBattle') : t('adventurePlay.combat.eliteFight')}
                </span>
              </motion.div>
              <div className="font-neo-display text-2xl font-bold text-neo-cream drop-shadow-[2px_2px_0_#000]">{name}</div>
              <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="max-w-xs rounded-lg border-[3px] border-black bg-neo-purple px-3 py-2 text-sm font-bold text-neo-cream shadow-[3px_3px_0_#000]">
                {t(ruleKey(world, isBoss))}
              </motion.p>
              <div className="text-xs font-bold uppercase tracking-widest text-neo-cream/70">{t('adventurePlay.combat.tapToFight')}</div>
            </div>
          </motion.button>
        )}

        {moment?.kind === 'phase' && (
          <motion.div key={`phase-${moment.id}`} className="absolute inset-0 grid place-items-center overflow-hidden px-4"
            initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="absolute inset-0 bg-white" initial={{ opacity: reduce ? 0.3 : 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.45 }} />
            <motion.div className="absolute inset-0 bg-neo-pink mix-blend-multiply" initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} transition={{ duration: 1.2 }} />
            <motion.div initial={reduce ? false : { scale: 1.3, rotate: 4, opacity: 0 }} animate={{ scale: 1, rotate: -3, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 16 }}
              className="relative flex w-full max-w-[22rem] flex-col items-center gap-2 text-center">
              {isBoss && (
                <div className="relative w-32 h-32 rounded-full border-[4px] border-black overflow-hidden shadow-[5px_5px_0_#000] bg-[#3b0a1e]">
                  <BossVideo world={world} reduce={reduce} />
                  <Image src={enemyArt(world, true, 'enraged')} alt="" fill sizes="128px" className="object-contain" />
                </div>
              )}
              <div className="max-w-full rounded-xl border-[4px] border-black bg-neo-pink px-4 py-1 font-neo-display text-[clamp(1.5rem,8vw,1.875rem)] font-black uppercase leading-tight text-black shadow-[5px_5px_0_#000] break-words">
                {combat.phase === 2 ? t('adventurePlay.combat.enraged') : t('adventurePlay.combat.phaseTwo')}
              </div>
              <div className="max-w-full rounded-lg border-[3px] border-black bg-neo-cream px-3 py-1 text-center text-sm font-bold text-black shadow-[3px_3px_0_#000] break-words">
                {t(combat.phase === 2 ? 'adventurePlay.combat.phaseTaunt2' : 'adventurePlay.combat.phaseTaunt1')}
              </div>
            </motion.div>
          </motion.div>
        )}

        {moment?.kind === 'victory' && combat.kill && (
          <KillBanner key="victory" world={world} isBoss={isBoss} name={name} kill={combat.kill} enemyMaxHp={combat.enemyMaxHp}
            trophy={trophy} bossTrophy={bossTrophy} bossStars={bossStars} victoryLine={victoryLine} video={<BossVideo world={world} reduce={reduce} />} onDone={endFinale} />
        )}

        {moment?.kind === 'death' && (
          <DefeatBeat key="death" world={world} isBoss={isBoss} name={name} combat={combat} defeatLine={defeatLine} onDone={endFinale} />
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
