'use client';

/**
 * ChallengeButton - Reusable Challenge Button Component
 *
 * A button that opens the DuelChallengeModal for a specific opponent.
 * Supports two variants: full button with text, or icon-only for compact spaces.
 *
 * This satisfies SOC-02: Challenge from profile or classroom roster.
 *
 * Features:
 * - Two variants: 'button' (default) and 'icon'
 * - Opens DuelChallengeModal on click
 * - Neo-brutalist styling
 * - RTL support
 */

import { useState } from 'react';
import { Swords } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import DuelChallengeModal from './DuelChallengeModal';
import type { OpponentInfo } from '@/hooks/useDuelSocket';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ChallengeButtonProps {
  /** Opponent user ID */
  opponentId: string;
  /** Opponent display name */
  opponentName: string;
  /** Opponent avatar URL (optional) */
  opponentAvatar?: string | null;
  /** Classroom ID */
  classroomId: string;
  /** Available lessons for challenge */
  lessons: Array<{ id: string; name: string }>;
  /** Display variant */
  variant?: 'button' | 'icon';
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export default function ChallengeButton({
  opponentId,
  opponentName,
  opponentAvatar,
  classroomId,
  lessons,
  variant = 'button',
  className,
}: ChallengeButtonProps) {
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);

  // Build opponent info object for modal
  const opponentInfo: OpponentInfo = {
    userId: opponentId,
    displayName: opponentName,
    avatarUrl: opponentAvatar || null,
  };

  const handleClick = () => {
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
  };

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleClick}
          className={cn(
            'p-2 rounded-neo transition-all',
            'text-neo-orange hover:text-neo-yellow',
            className
          )}
          aria-label={t('challenge')}
        >
          <Swords className="w-5 h-5" />
        </button>

        {showModal && (
          <DuelChallengeModal
            opponent={opponentInfo}
            lessons={lessons}
            classroomId={classroomId}
            onClose={handleClose}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          'px-4 py-2 font-bold rounded-neo inline-flex items-center gap-2',
          'bg-neo-orange text-white',
          'border-3 border-neo-black shadow-hard-sm',
          'hover:shadow-hard hover:scale-105 transition-all',
          className
        )}
      >
        <Swords className="w-5 h-5" />
        <span>{t('challenge')}</span>
      </button>

      {showModal && (
        <DuelChallengeModal
          opponent={opponentInfo}
          lessons={lessons}
          classroomId={classroomId}
          onClose={handleClose}
        />
      )}
    </>
  );
}
