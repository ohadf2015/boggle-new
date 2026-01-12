'use client';

import React, { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Coins, AlertTriangle, Clock, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCoinContext } from '@/contexts/CoinContext';
import { Button } from '@/components/ui/button';
import {
  useWinStreak,
  STREAK_RECOVERY_COST,
} from '@/hooks/useWinStreak';

interface StreakProtectionProps {
  /** Whether to show as a modal overlay */
  asModal?: boolean;
  /** Callback when modal is closed */
  onClose?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * StreakProtection - UI for streak freeze and recovery features
 *
 * Shows:
 * - Available freezes with option to use one
 * - Broken streak recovery option (costs coins)
 * - Countdown timer for recovery window
 *
 * Can be shown as:
 * - Inline card in results/landing
 * - Modal when streak is at risk
 */
const StreakProtection: React.FC<StreakProtectionProps> = memo(({
  asModal = false,
  onClose,
  className,
}) => {
  const { t } = useLanguage();
  const { coins, spendCoins } = useCoinContext();
  const {
    currentStreak,
    freezesAvailable,
    recoverableStreak,
    recoveryTimeRemaining,
    isStreakAtRisk,
    applyStreakFreeze,
    recoverStreak,
  } = useWinStreak();

  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Update countdown timer
  useEffect(() => {
    if (!recoveryTimeRemaining || recoveryTimeRemaining <= 0) {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const hours = Math.floor(recoveryTimeRemaining / (1000 * 60 * 60));
      const minutes = Math.floor((recoveryTimeRemaining % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [recoveryTimeRemaining]);

  const canAffordRecovery = coins >= STREAK_RECOVERY_COST;

  const handleUseFreeze = () => {
    const success = applyStreakFreeze();
    if (success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose?.();
      }, 2000);
    }
  };

  const handleRecoverStreak = async () => {
    if (!canAffordRecovery || isRecovering) return;

    setIsRecovering(true);

    // Spend coins first
    const spent = await spendCoins(STREAK_RECOVERY_COST, 'streak_recovery');
    if (!spent) {
      setIsRecovering(false);
      return;
    }

    // Then recover the streak
    const success = recoverStreak();
    setIsRecovering(false);

    if (success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose?.();
      }, 2000);
    }
  };

  // Don't show if no streak features are relevant
  const hasRelevantContent = freezesAvailable > 0 || recoverableStreak || isStreakAtRisk;
  if (!hasRelevantContent && !asModal) {
    return null;
  }

  const content = (
    <div className={cn(
      'rounded-neo-lg border-3 border-neo-black shadow-hard overflow-hidden',
      asModal ? 'bg-neo-navy' : 'bg-neo-navy/90',
      className
    )}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-neo-cyan/20 to-neo-purple/20 border-b-2 border-neo-black/20">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-neo-cyan" />
          <h3 className="font-black text-white uppercase tracking-wider text-sm">
            {t('streak.protection') || 'Streak Protection'}
          </h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Success Message */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-neo-lime/20 border-2 border-neo-lime rounded-neo p-3 text-center"
            >
              <div className="text-2xl mb-1">✅</div>
              <div className="font-black text-neo-lime text-sm">
                {t('streak.protectionApplied') || 'Protection Applied!'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showSuccess && (
          <>
            {/* Streak at Risk Warning */}
            {isStreakAtRisk && currentStreak > 0 && (
              <div className="bg-neo-red/20 border-2 border-neo-red/50 rounded-neo p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-neo-red" />
                  <span className="font-black text-neo-red text-sm uppercase">
                    {t('streak.atRisk') || 'Streak at Risk!'}
                  </span>
                </div>
                <p className="text-white/70 text-xs">
                  {(t('streak.atRiskDesc') || 'Win today to keep your {count}-day streak!')
                    .replace('{count}', String(currentStreak))}
                </p>
              </div>
            )}

            {/* Recoverable Broken Streak */}
            {recoverableStreak && recoverableStreak > 0 && (
              <div className="bg-neo-purple/20 border-2 border-neo-purple/50 rounded-neo p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neo-purple" />
                    <span className="font-black text-neo-purple text-sm uppercase">
                      {t('streak.canRecover') || 'Recover Your Streak'}
                    </span>
                  </div>
                  {timeLeft && (
                    <span className="text-xs text-white/60 font-bold">
                      {timeLeft} {t('common.left') || 'left'}
                    </span>
                  )}
                </div>
                <p className="text-white/70 text-xs mb-3">
                  {(t('streak.recoverDesc') || 'Your {count}-day streak can be restored!')
                    .replace('{count}', String(recoverableStreak))}
                </p>
                <Button
                  onClick={handleRecoverStreak}
                  disabled={!canAffordRecovery || isRecovering}
                  className={cn(
                    'w-full font-black uppercase text-sm',
                    canAffordRecovery
                      ? 'bg-neo-purple hover:bg-neo-purple/90 text-white'
                      : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  )}
                >
                  <Coins className="w-4 h-4 me-2" />
                  {isRecovering
                    ? (t('common.processing') || 'Processing...')
                    : (t('streak.recoverFor') || 'Recover for {cost} coins')
                        .replace('{cost}', String(STREAK_RECOVERY_COST))}
                </Button>
                {!canAffordRecovery && (
                  <p className="text-xs text-neo-red/70 mt-1 text-center">
                    {t('coins.notEnough') || 'Not enough coins'}
                  </p>
                )}
              </div>
            )}

            {/* Streak Freezes */}
            <div className="bg-white/5 border-2 border-white/10 rounded-neo p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Snowflake className="w-4 h-4 text-neo-cyan" />
                  <span className="font-bold text-white text-sm">
                    {t('streak.freezes') || 'Streak Freezes'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(freezesAvailable, 5) }).map((_, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full bg-neo-cyan border border-neo-black"
                    />
                  ))}
                  {Array.from({ length: Math.max(0, 3 - freezesAvailable) }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="w-4 h-4 rounded-full bg-white/10 border border-white/20"
                    />
                  ))}
                </div>
              </div>
              <p className="text-white/60 text-xs mb-2">
                {t('streak.freezeDesc') || 'Use a freeze to protect your streak for one day without winning.'}
              </p>
              {freezesAvailable > 0 && isStreakAtRisk && (
                <Button
                  onClick={handleUseFreeze}
                  variant="outline"
                  className="w-full font-bold text-sm border-neo-cyan text-neo-cyan hover:bg-neo-cyan/10"
                >
                  <Snowflake className="w-4 h-4 me-2" />
                  {t('streak.useFreeze') || 'Use Streak Freeze'}
                </Button>
              )}
              {freezesAvailable === 0 && (
                <p className="text-xs text-white/40 text-center">
                  {t('streak.noFreezes') || 'No freezes available. Earn 1 free freeze per week!'}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Modal wrapper
  if (asModal) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm"
          >
            {content}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return content;
});

StreakProtection.displayName = 'StreakProtection';

export default StreakProtection;
