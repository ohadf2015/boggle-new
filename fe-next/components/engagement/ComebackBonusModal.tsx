'use client';

/**
 * ComebackBonusModal
 *
 * Shows returning players their comeback XP multiplier and bonus rewards.
 * Displayed on first load when eligible, lets player claim before playing.
 */

import { useRef, useState } from 'react';
import { X, Zap, Sparkles, Shield, Crown } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { postWithAuth } from '@/utils/authFetch';
import type { ComebackTier } from '@/shared/types/engagement';

export interface ComebackBonusModalProps {
  isOpen: boolean;
  daysAway: number;
  tier: ComebackTier;
  onClose: () => void;
  onClaimed: () => void;
}

export function ComebackBonusModal({ isOpen, daysAway, tier, onClose, onClaimed }: ComebackBonusModalProps) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  useFocusTrap(dialogRef, isOpen, onClose);

  const handleClaim = async () => {
    if (isClaiming) return;
    setIsClaiming(true);
    try {
      const response = await postWithAuth('/api/engagement/comeback');
      if (response.ok) {
        onClaimed();
      }
    } catch {
      // silently fail — user can dismiss and claim later
    } finally {
      setIsClaiming(false);
    }
  };

  // XP multiplier display: 1.5 → "1.5x", 2 → "2x", 3 → "3x"
  const multiplierDisplay = Number.isInteger(tier.xpMultiplier)
    ? `${tier.xpMultiplier}x`
    : `${tier.xpMultiplier}x`;

  // Tier color by multiplier
  const tierColor =
    tier.xpMultiplier >= 3.0
      ? 'bg-neo-pink text-neo-white'
      : tier.xpMultiplier >= 2.5
        ? 'bg-neo-orange text-neo-white'
        : tier.xpMultiplier >= 2.0
          ? 'bg-neo-cyan text-neo-navy'
          : 'bg-neo-yellow text-neo-navy';

  return (
    <AdaptiveAnimatePresence>
      {isOpen && (
        <AdaptiveMotion.div
          key="comeback-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-navy/80"
          onClick={(e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <AdaptiveMotion.div
            key="comeback-modal"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="comeback-title"
            className="relative w-full max-w-sm bg-neo-navy border-neo-thick border-neo-white shadow-hard-lg rounded-neo overflow-hidden"
          >
            {/* Close button */}
            <button
              aria-label={t('comebackBonus.close')}
              onClick={onClose}
              className="absolute top-3 end-3 p-1 rounded-neo border-neo border-neo-white/30 text-neo-white hover:bg-neo-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Multiplier hero banner */}
            <div className={`${tierColor} px-6 py-5 text-center border-b-neo-thick border-neo-white`}>
              <div className="text-6xl font-black font-neo-display leading-none mb-1">
                {multiplierDisplay}
              </div>
              <div className="text-sm font-bold uppercase tracking-wider opacity-80">
                {t('comebackBonus.xpBonus')}
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              {/* Title */}
              <h2 id="comeback-title" className="text-xl font-black font-neo-display text-neo-white uppercase text-center mb-1">
                {t('comebackBonus.title')}
              </h2>
              <p className="text-neo-white/70 text-sm text-center mb-4">
                {t('comebackBonus.daysAway', { days: String(daysAway) })}
              </p>

              {/* Rewards list */}
              <ul className="space-y-2 mb-5">
                {/* XP duration */}
                <li className="flex items-center gap-3 bg-neo-white/5 rounded-neo px-3 py-2 border border-neo-white/10">
                  <Zap className="w-4 h-4 text-neo-yellow flex-shrink-0" />
                  <span className="text-neo-white text-sm font-bold">
                    {t('comebackBonus.xpDuration', { hours: String(tier.durationHours) })}
                  </span>
                </li>

                {/* Hints */}
                {tier.hints > 0 && (
                  <li className="flex items-center gap-3 bg-neo-white/5 rounded-neo px-3 py-2 border border-neo-white/10">
                    <Sparkles className="w-4 h-4 text-neo-cyan flex-shrink-0" />
                    <span className="text-neo-white text-sm font-bold">
                      {t('comebackBonus.hints', { count: String(tier.hints) })}
                    </span>
                  </li>
                )}

                {/* Streak freezes */}
                {tier.streakFreezes > 0 && (
                  <li className="flex items-center gap-3 bg-neo-white/5 rounded-neo px-3 py-2 border border-neo-white/10">
                    <Shield className="w-4 h-4 text-neo-lime flex-shrink-0" />
                    <span className="text-neo-white text-sm font-bold">
                      {t('comebackBonus.streakFreezes', { count: String(tier.streakFreezes) })}
                    </span>
                  </li>
                )}

                {/* Exclusive title */}
                {tier.title && (
                  <li className="flex items-center gap-3 bg-neo-pink/10 rounded-neo px-3 py-2 border border-neo-pink/30">
                    <Crown className="w-4 h-4 text-neo-pink flex-shrink-0" />
                    <span className="text-neo-pink text-sm font-bold">
                      {t('comebackBonus.titleUnlocked')}
                    </span>
                  </li>
                )}
              </ul>

              {/* Claim button */}
              <button
                onClick={handleClaim}
                disabled={isClaiming}
                className="w-full py-3 px-4 bg-neo-yellow text-neo-navy font-black uppercase text-base border-neo border-neo-white shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed active:translate-y-0.5 transition-all rounded-neo disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isClaiming ? '...' : t('comebackBonus.claimButton')}
              </button>
            </div>
          </AdaptiveMotion.div>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
}

export default ComebackBonusModal;
