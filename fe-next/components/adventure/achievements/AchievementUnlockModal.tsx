/**
 * AchievementUnlockModal Component
 *
 * Celebration modal shown when an achievement is unlocked or upgraded.
 */

'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { TIER_COLORS, TIER_ICONS, type TierName } from '@/utils/achievementTiers';
import type { AdventureAchievementDef } from '@/utils/adventureAchievementUtils';

// ==============================================
// TYPES
// ==============================================

interface AchievementUnlockModalProps {
  /** Achievement definition */
  achievement: AdventureAchievementDef | null;
  /** Current count */
  count: number;
  /** Whether this is a new unlock (vs tier upgrade) */
  isNew: boolean;
  /** Callback to close the modal */
  onClose: () => void;
}

// ==============================================
// COMPONENT
// ==============================================

export function AchievementUnlockModal({
  achievement,
  count,
  isNew,
  onClose,
}: AchievementUnlockModalProps) {
  const { t } = useLanguage();

  // Calculate tier from count
  let tier: TierName | null = null;
  if (count >= 300) tier = 'PLATINUM';
  else if (count >= 75) tier = 'GOLD';
  else if (count >= 15) tier = 'SILVER';
  else if (count >= 1) tier = 'BRONZE';

  const tierColors = tier ? TIER_COLORS[tier] : null;

  // Auto-close after 3 seconds
  useEffect(() => {
    if (!achievement) return;

    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [achievement, onClose]);

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!achievement) return null;

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
          className={cn(
            'fixed inset-0 z-50',
            'flex items-center justify-center',
            'bg-neo-black/80 backdrop-blur-sm'
          )}
          data-testid="achievement-unlock-modal"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className={cn(
              'relative p-8 rounded-neo',
              'bg-neo-navy border-4',
              'shadow-hard-lg',
              'max-w-sm w-full mx-4'
            )}
            style={{
              borderColor: tierColors?.border || '#FFFFFF',
              boxShadow: tierColors
                ? `0 0 30px ${tierColors.glow}`
                : undefined,
            }}
          >
            {/* Achievement Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', damping: 10 }}
              className={cn(
                'w-20 h-20 mx-auto mb-6',
                'flex items-center justify-center',
                'rounded-full border-4 border-neo-white'
              )}
              style={{
                backgroundColor: tierColors?.bg || '#333',
              }}
            >
              <span className="text-4xl">{achievement.icon}</span>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={cn(
                'text-xl font-black text-center mb-2',
                'text-neo-white'
              )}
            >
              {isNew
                ? t('adventure.achievements.unlocked')
                : t('adventure.achievements.upgraded')}
            </motion.h2>

            {/* Achievement Name */}
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={cn(
                'text-2xl font-black text-center mb-2'
              )}
              style={{ color: tierColors?.text || '#FFFFFF' }}
            >
              {t(achievement.nameKey)}
            </motion.h3>

            {/* Tier Badge */}
            {tier && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-2 mb-4"
              >
                <span className="text-2xl">{TIER_ICONS[tier]}</span>
                <span
                  className="text-lg font-bold uppercase"
                  style={{ color: tierColors?.text }}
                >
                  {tier}
                </span>
              </motion.div>
            )}

            {/* Achievement Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center text-neo-white/80 text-sm"
            >
              {t(achievement.descriptionKey)}
            </motion.p>

            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              onClick={onClose}
              className={cn(
                'mt-6 w-full py-3',
                'bg-neo-lime text-neo-black',
                'font-black text-lg',
                'border-3 border-neo-black rounded-neo',
                'shadow-hard hover:shadow-hard-lg',
                'hover:-translate-y-0.5',
                'active:translate-y-0.5 active:shadow-hard-pressed',
                'transition-all duration-200'
              )}
            >
              {t('common.continue')}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AchievementUnlockModal;
