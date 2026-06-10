'use client';

/**
 * ChallengeButton - Reusable Duel Challenge Button
 *
 * Button component for challenging a specific student to a duel.
 * Can be placed on student profiles, classroom rosters, or any student context.
 * Satisfies SOC-02 requirement (challenge from anywhere).
 *
 * Features:
 * - Two variants: full button or icon-only
 * - Opens DuelChallengeModal with pre-filled opponent
 * - Success state after challenge sent
 * - Neo-brutalist styling
 */

import { useState, useCallback } from 'react';
import { Swords } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import DuelChallengeModal from './DuelChallengeModal';
import type { OpponentInfo } from '@/hooks/useDuelSocket';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ChallengeButtonProps {
  /** Opponent student ID */
  opponentId: string;
  /** Opponent display name */
  opponentName: string;
  /** Opponent avatar URL (optional) */
  opponentAvatar?: string | null;
  /** Classroom ID */
  classroomId: string;
  /** Available lessons for challenge */
  lessons: Array<{ id: string; name: string }>;
  /** Button variant (default: button) */
  variant?: 'icon' | 'button';
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export function ChallengeButton({
  opponentId,
  opponentName,
  opponentAvatar,
  classroomId,
  lessons,
  variant = 'button',
  className,
}: ChallengeButtonProps) {
  const { t } = useLanguage();

  // State
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // ============================================
  // HANDLERS
  // ============================================

  const handleClick = useCallback(() => {
    setShowModal(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setShowModal(false);

    // Brief success state
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1500);
  }, []);

  // ============================================
  // OPPONENT INFO
  // ============================================

  const opponent: OpponentInfo = {
    userId: opponentId,
    displayName: opponentName,
    avatarUrl: opponentAvatar || null,
  };

  // ============================================
  // RENDER
  // ============================================

  // Icon variant
  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleClick}
          className={cn(
            'p-2 rounded-neo transition-all',
            'text-neo-pink hover:text-neo-lime',
            'hover:bg-neo-navy/30',
            className
          )}
          aria-label={t('challengePlayer')}
          data-testid="challenge-button-icon"
        >
          <Swords className="w-5 h-5" />
        </button>

        {showModal && (
          <DuelChallengeModal
            opponent={opponent}
            lessons={lessons}
            classroomId={classroomId}
            onClose={handleModalClose}
          />
        )}
      </>
    );
  }

  // Button variant
  return (
    <>
      <button
        onClick={handleClick}
        disabled={showSuccess}
        className={cn(
          'px-4 py-2 font-neo-body font-bold rounded-neo',
          'bg-neo-pink text-neo-black',
          'border-3 border-neo border-neo-black shadow-hard-sm',
          'hover:shadow-hard transition-all',
          'disabled:opacity-70 disabled:cursor-not-allowed',
          'flex items-center gap-2',
          className
        )}
        data-testid="challenge-button"
      >
        <Swords className="w-5 h-5" />
        {showSuccess ? t('challengeSent') : t('challengePlayer')}
      </button>

      {showModal && (
        <DuelChallengeModal
          opponent={opponent}
          lessons={lessons}
          classroomId={classroomId}
          onClose={handleModalClose}
        />
      )}
    </>
  );
}
