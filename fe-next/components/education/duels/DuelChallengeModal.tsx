'use client';

/**
 * DuelChallengeModal - Challenge Creation Modal
 *
 * Modal for creating a duel challenge with lesson selection.
 * Shows opponent info and allows selecting which lesson to use.
 *
 * Features:
 * - Opponent information display
 * - Lesson dropdown selector
 * - Send/Cancel actions
 * - Loading state
 * - Auto-close on success
 * - Neo-brutalist modal style
 */

import { useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDuelSocket, type OpponentInfo } from '@/hooks/useDuelSocket';
import { cn } from '@/lib/utils';
import { X, Swords } from 'lucide-react';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface DuelChallengeModalProps {
  /** Opponent to challenge */
  opponent: OpponentInfo;
  /** Available lessons */
  lessons: Array<{ id: string; name: string }>;
  /** Classroom ID */
  classroomId: string;
  /** Close callback */
  onClose: () => void;
}

// ============================================
// COMPONENT
// ============================================

export default function DuelChallengeModal({
  opponent,
  lessons,
  classroomId,
  onClose,
}: DuelChallengeModalProps) {
  const { t } = useLanguage();
  const { createChallenge } = useDuelSocket();

  // State
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  // Handle send challenge
  const handleSendChallenge = useCallback(() => {
    if (!selectedLessonId) return;

    setIsCreating(true);

    createChallenge(opponent.userId, selectedLessonId, classroomId);

    // Brief delay to show "Challenge sent!" state before closing
    setTimeout(() => {
      setIsCreating(false);
      onClose();
    }, 100);
  }, [selectedLessonId, opponent.userId, classroomId, createChallenge, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-neo-black/80 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        data-testid="duel-challenge-modal"
        className={cn(
          'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-full max-w-md p-6 rounded-neo',
          'bg-neo-navy border-3 border-neo border-neo-black shadow-hard-lg',
          'z-50'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Swords className="w-6 h-6 text-neo-yellow" />
            <h3 className="text-xl font-neo-display font-black text-neo-white">
              {t('challengePlayer', { name: opponent.displayName })}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neo-white/50 hover:text-neo-white transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Opponent Info */}
        <div className="mb-6">
          <div className="flex items-center gap-4 p-4 rounded-neo border-neo border-neo-black bg-neo-navy/50">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-neo-cyan flex items-center justify-center">
              <span className="text-neo-black font-black text-xl">
                {opponent.displayName.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Name */}
            <div>
              <p className="text-neo-white font-bold">{opponent.displayName}</p>
              <p className="text-neo-white/50 text-sm">{t('availableOpponents')}</p>
            </div>
          </div>
        </div>

        {/* Lesson Selection */}
        <div className="mb-6">
          <label className="block text-neo-white font-bold mb-2">
            {t('selectLesson')}
          </label>
          <select
            value={selectedLessonId}
            onChange={(e) => setSelectedLessonId(e.target.value)}
            className={cn(
              'w-full px-4 py-3 rounded-neo',
              'bg-neo-navy border-neo border-neo-black',
              'text-neo-white font-neo-body shadow-hard-sm',
              'focus:outline-none focus:ring-2 focus:ring-neo-cyan'
            )}
            role="combobox"
          >
            <option value="">{t('selectLesson')}</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.name}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={cn(
              'flex-1 px-6 py-3 font-bold rounded-neo',
              'bg-neo-navy text-neo-white',
              'border-neo border-neo-black shadow-hard-sm',
              'hover:shadow-hard transition-all'
            )}
          >
            {t('cancel')}
          </button>

          <button
            onClick={handleSendChallenge}
            disabled={!selectedLessonId || isCreating}
            className={cn(
              'flex-1 px-6 py-3 font-bold rounded-neo',
              'bg-neo-yellow text-neo-black',
              'border-neo border-neo-black shadow-hard',
              'hover:shadow-hard-lg transition-all',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isCreating ? t('challengeSent') : t('sendChallenge')}
          </button>
        </div>
      </div>
    </>
  );
}
