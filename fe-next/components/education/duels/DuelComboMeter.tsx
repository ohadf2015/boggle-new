'use client';

/**
 * DuelComboMeter — the streak/fire meter for a real-time duel.
 *
 * Every word in a duel used to be worth the same no matter how fast you played.
 * The server now chains words submitted inside the combo window and pays a flat
 * ADDITIVE bonus per chained word; this is where that chain becomes visible.
 *
 * Display only: `streak` and `bonus` come straight off `duel:word-accepted`, so
 * the meter can never disagree with the score (Class 3 — one owner per number).
 *
 * neo-orange is the streak/fire token. neo-yellow shows up only at the top
 * tier, where the streak itself is the celebration.
 *
 * Motion is a bounded scale on a small chip plus a width spring on the bar. The
 * resting state is fully painted — no opacity-from-0 entrance (Class 5).
 */

import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { duelComboTier, duelComboMeterFill } from '@/lib/education/duelCombo';
import { cn } from '@/lib/utils';

export interface DuelComboMeterProps {
  /** Chain length from the server. */
  streak: number;
  /** Additive bonus the last chained word paid. */
  bonus: number;
  className?: string;
}

export function DuelComboMeter({ streak, bonus, className }: DuelComboMeterProps) {
  const { t } = useLanguage();
  const tier = duelComboTier(streak);
  const fillPercent = Math.round(duelComboMeterFill(streak) * 100);
  const isHot = streak >= 2;

  return (
    <div
      data-testid="duel-combo-meter"
      data-tier={tier.id}
      data-streak={streak}
      aria-live="polite"
      aria-label={t('education.duels.comboAria', undefined, { count: streak })}
      className={cn(
        'flex items-center gap-2 rounded-neo border-[3px] border-neo-cream/70 bg-neo-navy px-2 py-1.5 shadow-hard-sm',
        className
      )}
    >
      {/* Tier mascot — the art escalates as the chain grows */}
      <img
        src={tier.mascotSrc}
        alt=""
        aria-hidden="true"
        width={28}
        height={28}
        className={cn(
          'h-7 w-7 shrink-0 object-contain transition-transform duration-150',
          isHot ? 'scale-100' : 'scale-90 opacity-60'
        )}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span
            data-testid="duel-combo-streak"
            className={cn(
              'font-neo-display text-base font-black leading-none tabular-nums',
              isHot ? 'text-neo-orange' : 'text-neo-white/50'
            )}
          >
            {streak}
          </span>
          <span
            className={cn(
              'truncate font-neo-body text-[10px] font-black uppercase tracking-widest',
              isHot ? 'text-neo-white' : 'text-neo-white/50'
            )}
          >
            {t(tier.labelKey)}
          </span>
        </div>

        {/* Meter track */}
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full border-2 border-neo-black bg-neo-black/60">
          <m.div
            data-testid="duel-combo-fill"
            className={cn('h-full', tier.fillClass)}
            style={{ width: `${fillPercent}%` }}
            animate={{ width: `${fillPercent}%` }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          />
        </div>
      </div>

      {bonus > 0 && (
        <m.div
          key={`bonus-${streak}`}
          data-testid="duel-combo-bonus"
          aria-label={t('education.duels.comboBonus', undefined, { points: bonus })}
          className="shrink-0 rounded-neo border-2 border-neo-black bg-neo-orange px-1.5 py-0.5 font-neo-display text-xs font-black tabular-nums text-neo-black"
          initial={{ scale: 1 }}
          animate={{ scale: [1.25, 1] }}
          transition={{ duration: 0.22 }}
        >
          +{bonus}
        </m.div>
      )}
    </div>
  );
}
