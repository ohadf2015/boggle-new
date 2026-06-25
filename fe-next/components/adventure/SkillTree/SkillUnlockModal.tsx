/**
 * SkillUnlockModal Component
 *
 * Celebration modal shown when a skill is unlocked.
 * Displays skill info with animation effects.
 */

'use client';

import React, { useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFocusTrap } from '@/hooks/useFocusTrap';
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
    gradient: 'from-neo-red to-neo-pink',
    glow: 'shadow-[0_0_30px_rgba(255,51,102,0.5)]',
  },
  strategy: {
    gradient: 'from-neo-cyan to-neo-lime',
    glow: 'shadow-[0_0_30px_rgba(0,255,255,0.5)]',
  },
  utility: {
    gradient: 'from-neo-lime to-neo-cyan',
    glow: 'shadow-[0_0_30px_rgba(191,255,0,0.5)]',
  },
};

// ==============================================
// COMPONENT
// ==============================================

export function SkillUnlockModal({ skill, onClose }: SkillUnlockModalProps) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  useFocusTrap(dialogRef, !!skill, onClose);

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
    <>
      {skill && (
        <div
          onClick={handleBackdropClick}
          className={cn(
            'fixed inset-0 z-50',
            'flex items-center justify-center',
            'bg-neo-black/80 backdrop-blur-xs animate-in fade-in-0 duration-300'
          )}
          data-testid="skill-unlock-modal"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              'relative p-8 rounded-neo',
              'bg-neo-navy border-4 border-neo-white',
              'shadow-hard-lg',
              colors.glow,
              'max-w-sm w-full mx-4',
              'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300'
            )}
          >
            {/* Skill Icon */}
            <div
              style={{ animationDelay: '0.2s' }}
              className={cn(
                'w-20 h-20 mx-auto mb-6',
                'flex items-center justify-center',
                'rounded-full border-4 border-neo-white',
                'bg-linear-to-br',
                colors.gradient,
                'animate-in zoom-in-50 duration-300 fill-mode-both'
              )}
            >
              <span className="text-4xl">{skill.icon}</span>
            </div>

            {/* Title */}
            <h2
              id={titleId}
              style={{ animationDelay: '0.3s' }}
              className={cn(
                'text-xl font-black text-center mb-2',
                'text-neo-white',
                'animate-in fade-in-0 duration-300 fill-mode-both'
              )}
            >
              {t('adventure.skills.unlocked')}
            </h2>

            {/* Skill Name */}
            <h3
              style={{ animationDelay: '0.4s' }}
              className={cn(
                'text-2xl font-black text-center mb-4',
                'bg-linear-to-r bg-clip-text text-transparent',
                colors.gradient,
                'animate-in fade-in-0 duration-300 fill-mode-both'
              )}
            >
              {t(skill.nameKey)}
            </h3>

            {/* Skill Description */}
            <p
              style={{ animationDelay: '0.5s' }}
              className="text-center text-neo-white text-sm animate-in fade-in-0 duration-300 fill-mode-both"
            >
              {t(skill.descriptionKey)}
            </p>

            {/* Close Button */}
            <button
              style={{ animationDelay: '0.6s' }}
              onClick={onClose}
              className={cn(
                'mt-6 w-full py-3',
                'bg-neo-lime text-neo-black',
                'font-black text-lg',
                'border-3 border-neo-black rounded-neo',
                'shadow-hard hover:shadow-hard-lg',
                'hover:-translate-y-0.5',
                'active:translate-y-0.5 active:shadow-hard-pressed',
                'transition-all duration-200',
                'animate-in fade-in-0 duration-300 fill-mode-both'
              )}
            >
              {t('common.continue')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default SkillUnlockModal;
