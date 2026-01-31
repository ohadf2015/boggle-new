/**
 * SkillUnlockModal Component
 *
 * Celebration modal shown when a skill is unlocked.
 * Displays skill info with animation effects.
 */

'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SkillNode, SkillPath } from '@/types/adventure';

// ==============================================
// TYPES
// ==============================================

interface SkillUnlockModalProps {
  /** The skill that was unlocked (null to hide modal) */
  skill: SkillNode | null;
  /** Callback to close the modal */
  onClose: () => void;
}

// ==============================================
// PATH COLORS
// ==============================================

const PATH_COLORS: Record<SkillPath, { gradient: string; glow: string }> = {
  power: {
    gradient: 'from-neo-red to-neo-orange',
    glow: 'shadow-[0_0_30px_rgba(255,107,53,0.5)]',
  },
  strategy: {
    gradient: 'from-neo-cyan to-neo-lime',
    glow: 'shadow-[0_0_30px_rgba(0,255,255,0.5)]',
  },
  utility: {
    gradient: 'from-neo-yellow to-neo-orange',
    glow: 'shadow-[0_0_30px_rgba(255,225,53,0.5)]',
  },
};

// ==============================================
// COMPONENT
// ==============================================

export function SkillUnlockModal({ skill, onClose }: SkillUnlockModalProps) {
  const { t } = useLanguage();

  // Auto-close after 3 seconds
  useEffect(() => {
    if (!skill) return;

    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [skill, onClose]);

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!skill) return null;

  const colors = PATH_COLORS[skill.path];

  return (
    <AnimatePresence>
      {skill && (
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
          data-testid="skill-unlock-modal"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className={cn(
              'relative p-8 rounded-neo',
              'bg-neo-navy border-4 border-neo-white',
              'shadow-hard-lg',
              colors.glow,
              'max-w-sm w-full mx-4'
            )}
          >
            {/* Skill Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', damping: 10 }}
              className={cn(
                'w-20 h-20 mx-auto mb-6',
                'flex items-center justify-center',
                'rounded-full border-4 border-neo-white',
                'bg-gradient-to-br',
                colors.gradient
              )}
            >
              <span className="text-4xl">{skill.icon}</span>
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
              {t('adventure.skills.unlocked')}
            </motion.h2>

            {/* Skill Name */}
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={cn(
                'text-2xl font-black text-center mb-4',
                'bg-gradient-to-r bg-clip-text text-transparent',
                colors.gradient
              )}
            >
              {t(skill.nameKey)}
            </motion.h3>

            {/* Skill Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center text-neo-white/80 text-sm"
            >
              {t(skill.descriptionKey)}
            </motion.p>

            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
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

export default SkillUnlockModal;
