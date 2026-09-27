'use client';

/**
 * The kill payoff (Bookworm's "Whomped!" overkill screen): the killing word
 * slammed in huge tiles, the overkill number + tier, the enemy's defeated art
 * inside a particle burst, and the ONE reward the kill minted. An elite's
 * trophy relic then flies out of the banner into the run's relic bar.
 */
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Crown, Sparkles, Star } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { RELICS, type RelicId } from '@/lib/adventure/play/relics';
import type { KillRecord } from '@/lib/adventure/play/combat';
import { cn } from '@/lib/utils';
import { RARITY_FRAME, relicArt } from '../run/art';
import { enemyArt } from './combatView';
import { flyTarget, overkillTier } from './killView';

const FLY_AT_MS = 2600;
/** Taps right after the kill are the player still tracing — don't let them skip the payoff. */
const TAP_AFTER_MS = 2000;
const SPARKS = 18;

interface Props {
  world: number;
  isBoss: boolean;
  name: string;
  kill: KillRecord;
  enemyMaxHp: number;
  trophy: RelicId | null;
  /** Boss: the world trophy the server granted (first clear only). */
  bossTrophy: boolean;
  /** Boss: stars the server settled for this win (0 until the result lands). */
  bossStars: number;
  victoryLine: string | null;
  video: React.ReactNode;
  onDone: () => void;
}

/** Where the trophy lands: the same relic already drawn in a bar (result card or HUD), else past the last relic. */
function landingSpot(trophy: RelicId): { x: number; y: number } {
  const vw = window.innerWidth;
  const rtl = getComputedStyle(document.body).direction === 'rtl';
  const box = (el: Element) => el.getBoundingClientRect();
  const visible = (el: Element) => { const r = box(el); return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight; };
  const own = Array.from(document.querySelectorAll(`[data-relic="${trophy}"]`)).filter(visible).pop();
  if (own) { const r = box(own); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  const others = Array.from(document.querySelectorAll('[data-relic]')).filter(visible).map(box);
  return flyTarget(others, null, vw, rtl);
}

export default function KillBanner({ world, isBoss, name, kill, enemyMaxHp, trophy, bossTrophy, bossStars, victoryLine, video, onDone }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const tier = overkillTier(kill.overkill, enemyMaxHp);
  const letters = useMemo(() => Array.from(kill.word.toUpperCase()), [kill.word]);
  const [fly, setFly] = useState<{ x: number; y: number } | null>(null);
  const [overkill, setOverkill] = useState(reduce ? kill.overkill : 0);
  const [canTap, setCanTap] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setCanTap(true), TAP_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  // Overkill counts up like a score tally.
  useEffect(() => {
    if (reduce || kill.overkill <= 0) { setOverkill(kill.overkill); return; }
    const start = performance.now() + 450;
    let raf = 0;
    const tickUp = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / 700));
      setOverkill(Math.round(kill.overkill * p));
      if (p < 1) raf = requestAnimationFrame(tickUp);
    };
    raf = requestAnimationFrame(tickUp);
    return () => cancelAnimationFrame(raf);
  }, [kill.overkill, reduce]);

  // Elite: the relic leaves the banner for the relic bar, then the banner clears.
  useEffect(() => {
    if (!trophy) return;
    const id = setTimeout(() => setFly(landingSpot(trophy)), FLY_AT_MS);
    return () => clearTimeout(id);
  }, [trophy]);
  useEffect(() => {
    const id = setTimeout(onDone, trophy ? FLY_AT_MS + 900 : 4200);
    return () => clearTimeout(id);
  }, [trophy, onDone]);

  const tile = `min(3rem, calc((100vw - 2.5rem) / ${Math.max(letters.length, 4)} - 0.25rem))`;
  const frame = trophy ? RARITY_FRAME[RELICS[trophy].rarity] : null;

  return (
    <motion.button type="button" onClick={() => canTap && onDone()} aria-label={t('adventurePlay.combat.skip')} data-testid="kill-banner"
      className="absolute inset-0 pointer-events-auto grid place-items-center overflow-hidden"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.4 } }}>
      {/* Backdrop fades away as the trophy flies, so it lands on the real relic bar. */}
      <motion.div aria-hidden className="absolute inset-0 bg-[#0f1b3d]" animate={{ opacity: fly ? 0 : 1 }} transition={{ duration: 0.5 }}>
        {isBoss && <div className="absolute inset-0 opacity-45">{video}</div>}
        <motion.div className="absolute left-1/2 top-[38%] w-[170vmax] h-[170vmax] -translate-x-1/2 -translate-y-1/2"
          style={{ background: `repeating-conic-gradient(from 0deg, ${isBoss ? 'rgba(255,51,102,0.5)' : 'rgba(190,255,0,0.4)'} 0deg 9deg, transparent 9deg 18deg)` }}
          initial={{ rotate: 0, scale: 0.2 }} animate={reduce ? { scale: 1 } : { rotate: 120, scale: 1 }} transition={{ duration: 4, ease: 'easeOut' }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,transparent_0%,rgba(15,27,61,0.85)_62%)]" />
      </motion.div>

      <motion.div className="relative flex w-full max-w-md flex-col items-center gap-2.5 px-4 text-center" animate={{ opacity: fly ? 0 : 1 }} transition={{ duration: 0.35 }}>
        {/* Tier stamp */}
        <motion.div initial={reduce ? false : { scale: 3, rotate: 12, opacity: 0 }} animate={{ scale: 1, rotate: -5, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 15 }}
          className="max-w-full rounded-xl border-[4px] border-black bg-neo-yellow px-4 py-1 font-neo-display text-[clamp(1.75rem,9vw,2.75rem)] font-black uppercase leading-tight text-black shadow-[6px_6px_0_#000] break-words">
          {t(`adventurePlay.combat.kill.${tier}`)}
        </motion.div>

        {/* Defeated art in a burst */}
        <div className="relative my-1 h-40 w-40 sm:h-48 sm:w-48">
          {!reduce && Array.from({ length: SPARKS }, (_, i) => {
            const a = (i / SPARKS) * Math.PI * 2;
            const d = 110 + (i % 3) * 30;
            return (
              <motion.span key={i} aria-hidden className={cn('absolute left-1/2 top-1/2 h-3 w-3 rounded-sm border-2 border-black',
                ['bg-neo-lime', 'bg-neo-pink', 'bg-neo-cyan', 'bg-neo-yellow'][i % 4])}
                initial={{ x: -6, y: -6, scale: 1.4, opacity: 1, rotate: 0 }}
                animate={{ x: Math.cos(a) * d - 6, y: Math.sin(a) * d - 6, scale: 0.3, opacity: 0, rotate: 200 }}
                transition={{ duration: 0.9, delay: 0.1, ease: 'easeOut' }} />
            );
          })}
          <motion.div className="absolute inset-0" initial={reduce ? false : { scale: 1.3, rotate: 0 }} animate={{ scale: 1, rotate: -6 }}
            transition={{ type: 'spring', stiffness: 260, damping: 11 }}>
            <Image src={enemyArt(world, isBoss, 'defeated')} alt={name} fill sizes="192px" priority
              className="object-contain grayscale-[40%] drop-shadow-[4px_4px_0_#000]" />
          </motion.div>
        </div>

        {/* The killing word, huge */}
        <div className="flex max-w-full flex-wrap justify-center gap-1" dir={/[\u0590-\u05FF]/.test(kill.word) ? 'rtl' : 'ltr'} aria-label={kill.word}>
          {letters.map((ch, i) => (
            <motion.span key={i} aria-hidden
              initial={reduce ? false : { y: -80, scale: 1.8, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ delay: 0.25 + i * 0.05, type: 'spring', stiffness: 520, damping: 17 }}
              className="grid place-items-center rounded-lg border-[3px] border-black bg-neo-cyan font-neo-display font-black text-black shadow-[3px_3px_0_#000]"
              style={{ width: tile, height: tile, fontSize: `calc(${tile} * 0.6)` }}>
              {ch}
            </motion.span>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-lg border-[3px] border-black bg-neo-lime px-2 py-0.5 font-neo-display text-lg font-black tabular-nums text-black shadow-[3px_3px_0_#000]">
            {t('adventurePlay.combat.kill.damage', { points: kill.points })}
          </span>
          {kill.overkill > 0 && (
            <motion.span initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.45, type: 'spring', stiffness: 500, damping: 14 }}
              className="rounded-lg border-[3px] border-black bg-neo-pink px-2 py-0.5 font-neo-display text-lg font-black tabular-nums text-black shadow-[3px_3px_0_#000]">
              {t('adventurePlay.combat.kill.overkill', { points: overkill })}
            </motion.span>
          )}
        </div>

        <div className="font-neo-display text-base font-bold uppercase tracking-wide text-neo-cream drop-shadow-[2px_2px_0_#000]">
          {isBoss ? t('adventurePlay.combat.bossDefeated') : t('adventurePlay.combat.eliteDefeated')}
        </div>

        {/* The one minted reward */}
        {trophy && frame && !fly && (
          <motion.div initial={reduce ? false : { y: 40, scale: 0.4, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ delay: 1.1, type: 'spring', stiffness: 300, damping: 16 }}
            className="flex items-center gap-2.5 rounded-xl border-[3px] border-black bg-black/70 py-1.5 pe-3 ps-1.5 shadow-[4px_4px_0_#000]">
            <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-lg border-[3px] border-black p-0.5', frame.bg)}
              style={{ boxShadow: `0 0 18px 4px ${frame.glow}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
              <img src={relicArt(trophy)} alt="" className="h-full w-full object-contain" draggable={false} />
            </span>
            <span className="min-w-0 text-start">
              <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-neo-yellow">
                <Sparkles className="h-3 w-3" /> {t('adventurePlay.combat.kill.trophy')}
              </span>
              <span className="block font-neo-display text-lg font-bold leading-tight text-neo-cream">{t(`adventurePlay.relic.${trophy}`)}</span>
              <span className="block text-[11px] font-bold text-neo-cream/75">{t('adventurePlay.combat.kill.addedToRun')}</span>
            </span>
          </motion.div>
        )}
        {isBoss && !bossTrophy && bossStars > 0 && (
          <motion.div initial={reduce ? false : { y: 30, scale: 0.4, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 16 }}
            className="flex items-center gap-2 rounded-xl border-[3px] border-black bg-black/70 px-3 py-1.5 shadow-[4px_4px_0_#000]"
            aria-label={t('adventurePlay.combat.kill.bossStars', { count: bossStars })}>
            <span className="font-neo-display text-sm font-black uppercase text-neo-cream">{t('adventurePlay.combat.kill.bossStars', { count: bossStars })}</span>
            {[0, 1, 2].map((i) => (
              <Star key={i} aria-hidden className={cn('h-6 w-6 stroke-black stroke-[2.5]', i < bossStars ? 'fill-neo-yellow' : 'fill-[#2a2a4e]')} />
            ))}
          </motion.div>
        )}
        {isBoss && bossTrophy && (
          <motion.div initial={reduce ? false : { y: 40, scale: 0.4, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ delay: 1.1, type: 'spring', stiffness: 300, damping: 16 }}
            className="flex items-center gap-2 rounded-xl border-[3px] border-black bg-neo-yellow px-3 py-1.5 font-neo-display text-lg font-black text-black shadow-[4px_4px_0_#000]">
            <Crown className="h-6 w-6" /> {t('adventurePlay.combat.kill.bossTrophy')}
          </motion.div>
        )}
        {victoryLine && (
          <p className="max-w-xs rounded-lg border-[3px] border-black bg-neo-cream px-3 py-1.5 text-sm font-bold text-black shadow-[3px_3px_0_#000]">“{t(victoryLine)}”</p>
        )}
      </motion.div>

      {/* Trophy flight into the relic bar */}
      {trophy && frame && fly && (
        <motion.span aria-hidden className={cn('fixed left-0 top-0 z-10 grid h-12 w-12 place-items-center rounded-lg border-[3px] border-black p-0.5 shadow-[3px_3px_0_#000]', frame.bg)}
          initial={{ x: window.innerWidth / 2 - 24, y: window.innerHeight * 0.72 - 24, scale: 1.2, rotate: 0 }}
          animate={{ x: fly.x - 24, y: fly.y - 24, scale: 0.75, rotate: reduce ? 0 : 360 }}
          transition={{ duration: reduce ? 0.01 : 0.75, ease: [0.5, 0, 0.3, 1] }}
          style={{ boxShadow: `0 0 20px 6px ${frame.glow}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
          <img src={relicArt(trophy)} alt="" className="h-full w-full object-contain" draggable={false} />
        </motion.span>
      )}
    </motion.button>
  );
}
