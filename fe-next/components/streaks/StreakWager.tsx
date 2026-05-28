'use client';

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { AlertTriangle, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { calculateWagerPayout, getMaxWager } from '@/shared/utils/wagerCalculator';

const PRESET_AMOUNTS = [10, 25, 50, 100];

interface StreakWagerProps {
  currentCoins: number;
  currentStreak: number;
  onWager: (amount: number) => void;
  onSkip: () => void;
}

export function StreakWager({ currentCoins, currentStreak, onWager, onSkip }: StreakWagerProps) {
  const { t } = useLanguage();
  const maxWager = getMaxWager(currentCoins);
  const [selectedAmount, setSelectedAmount] = useState(
    PRESET_AMOUNTS.find((a) => a <= maxWager) ?? 0
  );

  const potentialPayout = calculateWagerPayout(selectedAmount, true);

  return (
    <div
      className={cn(
        'bg-neo-navy border-3 border-neo-black rounded-neo p-5',
        'shadow-hard max-w-sm mx-auto'
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Coins className="w-6 h-6 text-neo-yellow" />
        <h3 className="text-lg font-black text-neo-white">
          {t('streaks.wager.title')}
        </h3>
      </div>

      <p className="text-sm text-neo-white mb-4">
        {t('streaks.wager.description')}
      </p>

      {/* Preset amounts */}
      <div className="flex gap-2 mb-4">
        {PRESET_AMOUNTS.map((amount) => {
          const disabled = amount > maxWager;
          return (
            <m.button
              key={amount}
              whileTap={disabled ? undefined : { scale: 0.95 }}
              disabled={disabled}
              aria-label={String(amount)}
              onClick={() => setSelectedAmount(amount)}
              className={cn(
                'flex-1 py-2 rounded-neo border-3 font-black text-sm transition-colors',
                selectedAmount === amount && !disabled
                  ? 'bg-neo-yellow text-neo-black border-neo-black shadow-hard-sm'
                  : disabled
                  ? 'bg-neo-navy/50 text-neo-white border-neo-white/10 cursor-not-allowed'
                  : 'bg-neo-navy text-neo-white border-neo-white/20 hover:border-neo-yellow/50'
              )}
            >
              {amount}
            </m.button>
          );
        })}
      </div>

      {/* Payout display */}
      <div
        data-testid="potential-payout"
        className="text-center mb-4 p-3 rounded-neo bg-neo-black/30 border-2 border-neo-yellow/20"
      >
        <span className="text-xs text-neo-white uppercase tracking-wide">
          {t('streaks.wager.payout')}
        </span>
        <div className="text-2xl font-black text-neo-yellow">{potentialPayout}</div>
      </div>

      {/* Risk warning */}
      <div className="flex items-center gap-2 mb-4 text-neo-orange">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="text-xs font-bold">{t('streaks.wager.risk')}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          aria-label={t('streaks.wager.skip')}
          onClick={onSkip}
          className={cn(
            'flex-1 py-2.5 rounded-neo border-3 border-neo-white/20',
            'text-neo-white font-bold text-sm hover:bg-neo-white/10 transition-colors'
          )}
        >
          {t('streaks.wager.skip')}
        </button>
        <button
          aria-label={t('streaks.wager.confirm')}
          onClick={() => onWager(selectedAmount)}
          className={cn(
            'flex-1 py-2.5 rounded-neo border-3 border-neo-black',
            'bg-neo-yellow text-neo-black font-black text-sm',
            'shadow-hard-sm hover:shadow-hard-pressed active:translate-y-[2px] transition-all'
          )}
        >
          {t('streaks.wager.confirm')}
        </button>
      </div>
    </div>
  );
}

export default StreakWager;
