'use client';

import { useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { hapticGameWin } from '@/utils/haptics';
import { COSMETICS } from '@/lib/cosmetics';
import { CHEST_RARITIES, type ChestRarity, type ClassroomChestReveal } from '@/shared/constants/classroomEconomy';
import { nextChestPhase, oddsLabel, type ChestPhase } from './chestPhase';

const CONFETTI = Array.from({ length: 12 }, (_, i) => i);

interface RewardChestProps {
  reveal: ClassroomChestReveal;
  onClose: () => void;
}

/**
 * Dark-only overlay: hardcoded navy, no opacity tween on the backdrop. Only the
 * chest element animates, so a phone never repaints a fullscreen layer.
 */
export default function RewardChest({ reveal, onClose }: RewardChestProps) {
  const { t } = useLanguage();
  const reduced = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<ChestPhase>(reduced ? 'revealed' : 'sealed');

  const open = () => {
    const next = nextChestPhase(phase, reduced);
    setPhase(next);
    if (next === 'revealed') hapticGameWin();
  };

  const advance = (to: ChestPhase) => {
    setPhase(to);
    if (to === 'revealed') hapticGameWin();
  };

  const rarity: ChestRarity = reveal.rarity;
  const itemName = COSMETICS.find((c) => c.id === reveal.itemId)?.name;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('economy.chest.title')}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-neo-navy p-4 text-white"
    >
      <h2 className="text-2xl font-bold">{t('economy.chest.title')}</h2>

      <div className="relative flex h-40 w-40 items-center justify-center">
        {phase !== 'revealed' && (
          <m.button
            type="button"
            onClick={phase === 'sealed' ? open : undefined}
            aria-label={t('economy.chest.open')}
            className="h-32 w-32 rounded-xl border-4 border-black bg-neo-lime text-4xl shadow-[6px_6px_0_0_#000]"
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
            {t('economy.chest.open')}
          </m.button>
        )}

        {phase === 'revealed' && (
          <m.div
            initial={reduced ? false : { scale: 0.4 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            className="flex h-32 w-32 flex-col items-center justify-center rounded-xl border-4 border-black bg-neo-cream text-neo-navy shadow-[6px_6px_0_0_#000]"
            data-testid="chest-reveal"
          >
            <span className="text-xs font-bold uppercase">{t(`economy.chest.rarity.${rarity}`)}</span>
            <span className="text-lg font-bold">{t('economy.chest.xp', { xp: reveal.xp })}</span>
            {itemName && <span className="text-xs">{t(itemName)}</span>}
          </m.div>
        )}

        {phase === 'revealed' && !reduced &&
          CONFETTI.map((i) => (
            <m.span
              key={i}
              aria-hidden="true"
              className="absolute h-2 w-2 rounded-sm"
              style={{ background: i % 2 ? '#c6f432' : '#ff5fa2', left: '50%', top: '50%' }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: Math.cos(i) * 110, y: Math.sin(i) * 110 - 40, opacity: 0 }}
              transition={{ duration: 0.8 }}
            />
          ))}
      </div>

      <ul className="flex flex-col gap-1 text-sm text-white/80" aria-label={t('economy.chest.odds.label')}>
        {CHEST_RARITIES.map((r) => (
          <li key={r} className="flex justify-between gap-6">
            <span>{t(`economy.chest.rarity.${r}`)}</span>
            <span>{oddsLabel(r)}</span>
          </li>
        ))}
      </ul>

      {phase === 'revealed' && (
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-lg border-2 border-black bg-neo-lime px-6 py-2 font-bold text-neo-navy shadow-[4px_4px_0_0_#000]"
        >
          {t('economy.chest.continue')}
        </button>
      )}
    </div>
  );
}

