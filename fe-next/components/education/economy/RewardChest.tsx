'use client';

import { useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { hapticGameWin } from '@/utils/haptics';
import { COSMETICS } from '@/lib/cosmetics';
import { cn } from '@/lib/utils';
import { CHEST_RARITIES, type ClassroomChestReveal } from '@/shared/constants/classroomEconomy';
import { chestArtSrc, nextChestPhase, oddsLabel, rarityTone, type ChestPhase } from './chestPhase';

const CONFETTI_COLORS = ['#c6f432', '#ff5fa2', '#38e1ff', '#ffd23f', '#ffffff'];
const CONFETTI = Array.from({ length: 36 }, (_, i) => i);

interface RewardChestProps {
  reveal: ClassroomChestReveal;
  onClose: () => void;
}

/**
 * Full-screen collect moment. Dark-only: hardcoded navy, and only the chest
 * element animates so a phone never repaints a large layer. Reduced motion
 * shows the reveal at once.
 */
export default function RewardChest({ reveal, onClose }: RewardChestProps) {
  const { t } = useLanguage();
  const reduced = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<ChestPhase>(reduced ? 'revealed' : 'sealed');
  const tone = rarityTone(reveal.rarity);
  const itemName = COSMETICS.find((c) => c.id === reveal.itemId)?.name;

  const advance = (to: ChestPhase) => {
    setPhase(to);
    if (to === 'revealed') hapticGameWin();
  };
  const open = () => advance(nextChestPhase(phase, reduced));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('economy.chest.title')}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 overflow-hidden bg-neo-navy px-5 py-6 text-white"
    >
      <h2 className="text-center text-3xl font-bold tracking-wide">{t('economy.chest.title')}</h2>

      <div className="relative flex min-h-[280px] w-full max-w-[min(88vw,380px)] flex-1 items-center justify-center">
        <div aria-hidden="true" className={cn('absolute left-1/2 top-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl', phase === 'revealed' ? tone.glow : 'bg-white/10')} />

        {phase !== 'revealed' && (
          <m.button
            type="button"
            onClick={phase === 'sealed' ? open : undefined}
            aria-label={t('economy.chest.open')}
            className="relative flex h-[min(72vw,320px)] w-[min(72vw,320px)] items-center justify-center"
            animate={
              phase === 'shaking'
                ? { rotate: [0, -8, 8, -8, 8, 0] }
                : phase === 'bursting'
                  ? { scale: [1, 1.3, 0], opacity: [1, 1, 0] }
                  : { rotate: 0 }
            }
            transition={{ duration: 0.5 }}
            onAnimationComplete={() => {
              if (phase === 'shaking') advance('bursting');
              if (phase === 'bursting') advance('revealed');
            }}
          >
            <img src={chestArtSrc(reveal.rarity, false)} alt="" className="h-full w-full object-contain drop-shadow-[6px_6px_0_#000]" />
          </m.button>
        )}

        {phase === 'sealed' && (
          <p className="absolute bottom-0 text-lg font-bold text-neo-lime">{t('economy.chest.tapToOpen')}</p>
        )}

        {phase === 'revealed' && (
          <m.div
            initial={reduced ? false : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 14 }}
            className="relative flex flex-col items-center gap-2 text-center"
            data-testid="chest-reveal"
          >
            <img src={chestArtSrc(reveal.rarity, true)} alt="" className="h-[min(48vw,200px)] w-auto object-contain drop-shadow-[6px_6px_0_#000]" />
            <span className={cn('rounded-full border-2 bg-black/40 px-4 py-1 text-base font-bold uppercase tracking-wider', tone.text, tone.ring)}>
              {t(`economy.chest.rarity.${reveal.rarity}`)}
            </span>
            {itemName && <span className="text-3xl font-bold leading-tight">{t(itemName)}</span>}
            <span className="text-2xl font-bold text-neo-lime">{t('economy.chest.xp', { xp: reveal.xp })}</span>
            <span className="text-lg text-white/90">{t('economy.reward.round', { cash: reveal.roundCash })}</span>
            {reveal.rank !== null && (
              <span className="text-lg text-white/90">{t('economy.reward.rank', { rank: reveal.rank, size: reveal.size })}</span>
            )}
            <span className="mt-1 text-base font-bold text-neo-cyan">{t('economy.locker.added')}</span>
          </m.div>
        )}

        {phase === 'revealed' && !reduced &&
          CONFETTI.map((i) => (
            <m.span
              key={i}
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-3 w-2 rounded-sm"
              style={{ background: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
              animate={{
                x: Math.cos((i / CONFETTI.length) * Math.PI * 2) * (90 + (i % 5) * 18),
                y: Math.sin((i / CONFETTI.length) * Math.PI * 2) * (90 + (i % 5) * 18) - 60,
                opacity: 0,
                rotate: 360,
              }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            />
          ))}
      </div>

      {(phase === 'sealed' || phase === 'revealed') && (
        <ul aria-label={t('economy.chest.odds.label')} className="flex flex-wrap justify-center gap-2 text-base text-white/90">
          {CHEST_RARITIES.map((r) => (
            <li key={r} className="rounded-md border-2 border-white/30 px-3 py-1">
              {`${t(`economy.chest.rarity.${r}`)} ${oddsLabel(r)}`}
            </li>
          ))}
        </ul>
      )}

      {phase === 'revealed' && (
        <button
          type="button"
          onClick={onClose}
          className="min-h-14 min-w-[min(70vw,300px)] rounded-xl border-2 border-black bg-neo-lime px-8 text-lg font-bold text-neo-navy shadow-[4px_4px_0_0_#000]"
        >
          {t('economy.chest.continue')}
        </button>
      )}
    </div>
  );
}
