'use client';

import React, { memo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import { Check, MoveUpRight, RotateCw, Target, Trophy, Sparkles } from 'lucide-react';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/ui/Reveal';
import type { TrainingSkillId } from './TrainingProgressBar';

interface SkillConfig {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  labelKey: string;
  fallbackLabel: string;
  emoji: string;
  color: string;
  bgColor: string;
}

const SKILL_CONFIGS: Record<TrainingSkillId, SkillConfig> = {
  firstWord: {
    icon: Sparkles,
    labelKey: 'training.unlock.firstWord',
    fallbackLabel: 'First word found!',
    emoji: '',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500',
  },
  diagonal: {
    icon: MoveUpRight,
    labelKey: 'training.unlock.diagonal',
    fallbackLabel: 'Diagonal movement unlocked!',
    emoji: '↗️',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500',
  },
  directionChange: {
    icon: RotateCw,
    labelKey: 'training.unlock.directionChange',
    fallbackLabel: 'Direction changes unlocked!',
    emoji: '🔄',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500',
  },
  targetScore: {
    icon: Target,
    labelKey: 'training.unlock.targetScore',
    fallbackLabel: '50 points reached!',
    emoji: '🎯',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500',
  },
  fiveWords: {
    icon: Trophy,
    labelKey: 'training.unlock.fiveWords',
    fallbackLabel: '5 words found!',
    emoji: '🏆',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
  },
};

interface SkillUnlockToastProps {
  /** The skill that was unlocked (null to hide) */
  skillId: TrainingSkillId | null;
  /** Callback when toast should be dismissed */
  onDismiss: () => void;
  /** Duration in ms before auto-dismiss (default: 2500) */
  duration?: number;
}

/**
 * SkillUnlockToast - Celebration toast when training skill is unlocked
 *
 * Shows a brief, celebratory notification at the top of the screen
 * when the player demonstrates a new skill during training.
 */
const SkillUnlockToast: React.FC<SkillUnlockToastProps> = ({
  skillId,
  onDismiss,
  duration = 2500,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';
  const [mounted, setMounted] = useState(false);

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-dismiss after duration
  useEffect(() => {
    if (!skillId) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [skillId, duration, onDismiss]);

  if (!mounted || typeof document === 'undefined') return null;
  if (!skillId) return null;

  const config = SKILL_CONFIGS[skillId];
  if (!config) return null;

  const label = t(config.labelKey) || config.fallbackLabel;

  return createPortal(
    <AnimatePresence>
      {skillId && (
        <Reveal
          noSlide
          key={`skill-unlock-${skillId}`}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        >
          <m.div
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl border-2 shadow-hard-md',
              isDarkMode
                ? 'bg-neo-navy-light border-neo-lime text-white'
                : 'bg-white border-neo-lime text-neo-black'
            )}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            {/* Icon with color background */}
            <Reveal
              noSlide
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg',
                config.bgColor
              )}
            >
              <Check className="w-5 h-5 text-white" />
            </Reveal>

            {/* Text */}
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide text-neo-lime font-bold">
                {t('training.unlock.title')}
              </span>
              <span className={cn(
                "font-bold text-sm",
                isDarkMode ? "text-neo-white" : "text-neo-black"
              )}>
                {label} {config.emoji}
              </span>
            </div>

            {/* Progress indicator */}
            <m.div
              className="absolute bottom-0 left-0 h-1 bg-neo-lime rounded-b-lg"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: duration / 1000, ease: 'linear' }}
            />
          </m.div>
        </Reveal>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default memo(SkillUnlockToast);
