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

import { useEffect, useState, useCallback, useRef, useId } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDuelSocket, type OpponentInfo } from '@/hooks/useDuelSocket';
import { cn } from '@/lib/utils';
import { X, Swords, ChevronDown, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useFocusTrap(modalRef, true, onClose);

  /**
   * The recommended path is pre-selected so ONE tap sends the challenge: a
   * live duel on the lesson the class is on. The dialog used to open with
   * nothing chosen, which made SEND CHALLENGE a locked door behind two
   * decisions. Both choices are still here — they just are not a toll gate.
   */
  const [selectedLessonId, setSelectedLessonId] = useState<string>(() => lessons[0]?.id ?? '');
  const [duelType, setDuelType] = useState<'async' | 'realtime'>('realtime');
  const [isCreating, setIsCreating] = useState(false);
  /**
   * Both pickers start CLOSED. They are not hidden settings — the summary line
   * above the disclosure states the live choice — they are simply not two
   * decisions in the way of the one button that matters.
   */
  const [showSetup, setShowSetup] = useState(false);

  /**
   * Lessons can arrive after this dialog mounts. Adopt the first one only
   * while nothing is chosen, so a late list never overrides the student's own
   * pick (recurring-pitfalls Class 1 — the late source wins the early render).
   */
  useEffect(() => {
    if (selectedLessonId) return;
    const first = lessons[0]?.id;
    if (first) setSelectedLessonId(first);
  }, [lessons, selectedLessonId]);

  // Handle send challenge
  const handleSendChallenge = useCallback(() => {
    if (!selectedLessonId) return;

    setIsCreating(true);

    createChallenge(opponent.userId, selectedLessonId, classroomId, duelType);

    // Brief delay to show "Challenge sent!" state before closing
    setTimeout(() => {
      setIsCreating(false);
      onClose();
    }, 100);
  }, [selectedLessonId, duelType, opponent.userId, classroomId, createChallenge, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-neo-black/80 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="duel-challenge-modal"
        className={cn(
          'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-full max-w-md p-5 rounded-neo',
          // A phone dialog that outgrows the viewport is the same page-scroll
          // bug in a smaller box: cap it and let the dialog itself scroll.
          'max-h-[88dvh] overflow-y-auto overscroll-contain',
          'bg-neo-navy border-[3px] border-neo-cream shadow-hard-lg',
          'z-50'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Swords className="w-6 h-6 text-neo-lime" />
            <h3 id={titleId} className="text-xl font-neo-display font-black text-neo-white">
              {t('challengePlayer', { name: opponent.displayName ?? '?' })}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-neo border-[2px] border-neo-cream p-1 text-neo-cream transition-colors hover:bg-neo-cream hover:text-neo-navy"
            aria-label={t('common.close')}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Opponent Info */}
        <div className="mb-4">
          <div className="flex items-center gap-4 p-4 rounded-neo border-[2px] border-neo-cream/80 bg-neo-navy/50">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-neo-cyan flex items-center justify-center">
              <span className="text-neo-black font-black text-xl">
                {(opponent.displayName ?? '?').charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Name */}
            <div>
              <p className="text-neo-white font-bold">{opponent.displayName ?? '?'}</p>
              <p className="text-neo-white text-sm">{t('availableOpponents')}</p>
            </div>
          </div>
        </div>

        {/* One line of setup, and a way to change it. */}
        <div className="mb-5">
          <div
            data-testid="duel-challenge-summary"
            className="flex items-center gap-2 rounded-neo border-[3px] border-neo-cream bg-neo-navy px-3 py-2.5"
          >
            <Zap className="h-4 w-4 shrink-0 text-neo-lime" aria-hidden="true" />
            <p className="min-w-0 flex-1 truncate font-neo-body text-sm font-bold text-neo-white">
              {duelType === 'realtime' ? t('realTime') : t('turnBased')}
              {' · '}
              {lessons.find((l) => l.id === selectedLessonId)?.name ?? t('selectLesson')}
            </p>
            <button
              type="button"
              data-testid="duel-challenge-change"
              aria-expanded={showSetup}
              onClick={() => setShowSetup((open) => !open)}
              className="inline-flex shrink-0 items-center gap-1 rounded-neo border-[2px] border-neo-cream bg-neo-navy px-2.5 py-1 font-neo-body text-xs font-black uppercase tracking-widest text-neo-cream transition-colors hover:bg-neo-cream hover:text-neo-navy"
            >
              {t('education.duels.changeSetup')}
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform', showSetup && 'rotate-180')}
                aria-hidden="true"
              />
            </button>
          </div>

          {showSetup && (
            <div className="mt-3 space-y-4">
              {/* Duel Type Selection */}
              <div>
                <label className="mb-2 block font-neo-body text-xs font-black uppercase tracking-widest text-neo-cream">
                  {t('selectDuelType')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    data-testid="duel-type-async"
                    aria-pressed={duelType === 'async'}
                    onClick={() => setDuelType('async')}
                    className={cn(
                      'rounded-neo p-3 text-start shadow-hard-sm transition-all',
                      // Selected differs by FILL, not by a tint; the unselected
                      // tile keeps a cream edge because black on navy is 1.23:1.
                      duelType === 'async'
                        ? 'border-[3px] border-neo-black bg-neo-lime text-neo-black shadow-hard'
                        : 'border-[3px] border-neo-cream bg-neo-navy text-neo-white hover:shadow-hard'
                    )}
                  >
                    <div className="mb-1 text-base font-black">{t('turnBased')}</div>
                    <div
                      className={cn(
                        'text-xs',
                        duelType === 'async' ? 'text-neo-black/80' : 'text-neo-white'
                      )}
                    >
                      {t('turnBasedDesc')}
                    </div>
                  </button>

                  <button
                    type="button"
                    data-testid="duel-type-realtime"
                    aria-pressed={duelType === 'realtime'}
                    onClick={() => setDuelType('realtime')}
                    className={cn(
                      'rounded-neo p-3 text-start shadow-hard-sm transition-all',
                      duelType === 'realtime'
                        ? 'border-[3px] border-neo-black bg-neo-lime text-neo-black shadow-hard'
                        : 'border-[3px] border-neo-cream bg-neo-navy text-neo-white hover:shadow-hard'
                    )}
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="text-base font-black">{t('realTime')}</span>
                      <span className="rounded-neo border-[2px] border-neo-black bg-neo-cyan px-1.5 py-0.5 font-neo-body text-[9px] font-black uppercase tracking-widest text-neo-black">
                        {t('education.duels.recommended')}
                      </span>
                    </div>
                    <div
                      className={cn(
                        'text-xs',
                        duelType === 'realtime' ? 'text-neo-black/80' : 'text-neo-white'
                      )}
                    >
                      {t('realTimeDesc')}
                    </div>
                  </button>
                </div>
              </div>

              {/* Lesson Selection */}
              <div>
                <label className="mb-2 block font-neo-body text-xs font-black uppercase tracking-widest text-neo-cream">
                  {t('selectLesson')}
                </label>
                <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
                  <SelectTrigger
                    className={cn(
                      'w-full px-4 py-3',
                      // dark: too — the Select's own dark variant would otherwise
                      // repaint the edge slate-500, which measures 1.25:1 on navy.
                      'bg-neo-navy border-[3px] border-neo-cream dark:border-neo-cream',
                      'text-neo-white font-neo-body shadow-hard-sm',
                      'focus:ring-neo-cyan'
                    )}
                    aria-label={t('selectLesson')}
                  >
                    <SelectValue placeholder={t('selectLesson')} />
                  </SelectTrigger>
                  <SelectContent>
                    {lessons.map((lesson) => (
                      <SelectItem key={lesson.id} value={lesson.id}>
                        {lesson.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'flex-1 px-6 py-3 font-bold rounded-neo',
              'bg-neo-navy text-neo-cream',
              'border-[3px] border-neo-cream shadow-hard-sm',
              'hover:bg-red-600 hover:shadow-hard transition-all'
            )}
          >
            {t('cancel')}
          </button>

          <button
            type="button"
            data-testid="duel-challenge-send"
            onClick={handleSendChallenge}
            disabled={!selectedLessonId || isCreating}
            className={cn(
              'flex-1 px-6 py-3 font-bold rounded-neo',
              'bg-neo-lime text-neo-black',
              'border-[3px] border-neo-black shadow-hard',
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
