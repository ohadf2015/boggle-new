'use client';

/**
 * DuelNotification - Toast notification for incoming duel challenges
 *
 * Listens for incoming challenge events and displays animated toast notification.
 * Auto-dismisses after 30 seconds or when user takes action.
 *
 * Features:
 * - Slide-in animation using Framer Motion
 * - Auto-dismiss timer
 * - Swords icon for visual appeal
 * - Neo-brutalist card design
 * - Fixed position (bottom-right on desktop, top-right on mobile)
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDuelSocket, type ChallengeReceivedData } from '@/hooks/useDuelSocket';
import { useDuelRematch } from '@/hooks/useDuelRematch';
import type { RematchOfferedData } from '@/hooks/useDuelSocket.types';
import { cn } from '@/lib/utils';
import { Swords, X } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface DuelNotificationProps {
  /** Classroom ID to listen for challenges */
  classroomId: string;
}

// ============================================
// COMPONENT
// ============================================

export default function DuelNotification({ classroomId }: DuelNotificationProps) {
  const { t } = useLanguage();
  const {
    socket,
    onChallengeReceived,
    onRematchOffered,
    onRematchWithdrawn,
    onRematchPending,
    onRematchInvited,
    onDuelCreated,
    onError,
  } = useDuelSocket();

  // State
  const [challenge, setChallenge] = useState<ChallengeReceivedData | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  /**
   * A rematch offer aimed at a student who has already left the podium.
   *
   * Held locally because the ids it carries are what the accept has to echo
   * back: accepting from here emits the SAME `duel:rematch` the podium would,
   * so it matches the pending pact rather than opening a second one.
   */
  const [rematchOffer, setRematchOffer] = useState<RematchOfferedData | null>(null);

  const { requestRematch, pending: rematchPending } = useDuelRematch({
    socket,
    opponentId: rematchOffer?.fromUserId,
    lessonId: rematchOffer?.lessonId,
    duelId: rematchOffer?.duelId ?? undefined,
    onDuelCreated,
    onError,
    onRematchPending,
    onRematchInvited,
  });

  useEffect(() => {
    if (typeof onRematchOffered !== 'function') return;
    return onRematchOffered((data) => setRematchOffer(data));
  }, [onRematchOffered]);

  useEffect(() => {
    if (typeof onRematchWithdrawn !== 'function') return;
    return onRematchWithdrawn(() => setRematchOffer(null));
  }, [onRematchWithdrawn]);

  // Listen for incoming challenges
  useEffect(() => {
    const cleanup = onChallengeReceived((data) => {
      setChallenge(data);

      // Auto-dismiss after 30 seconds
      const id = setTimeout(() => {
        setChallenge(null);
      }, 30000);

      setTimeoutId(id);
    });

    return cleanup;
  }, [onChallengeReceived]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setChallenge(null);
  }, [timeoutId]);

  return (
    <AdaptiveAnimatePresence>
      {rematchOffer && (
        <div
          data-testid="duel-rematch-offer"
          className={cn(
            'fixed z-50 bottom-6 inset-e-6 md:bottom-8 md:inset-e-8 w-full max-w-sm',
            'rounded-neo border-[3px] border-neo-lime bg-neo-navy p-4 shadow-hard'
          )}
        >
          <p className="font-neo-display text-base font-black uppercase italic tracking-tight text-neo-cream">
            {t('education.duels.rematchWants', undefined, {
              name: rematchOffer.fromName || t('common.opponent'),
            })}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              data-testid="duel-rematch-offer-accept"
              onClick={requestRematch}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-lime px-4 py-2.5',
                'font-neo-display text-sm font-black uppercase italic tracking-tight text-neo-black shadow-hard',
                'transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed'
              )}
            >
              <Swords className="h-4 w-4" aria-hidden="true" />
              {rematchPending
                ? t('education.duels.rematchWaiting', undefined, {
                    name: rematchOffer.fromName || t('common.opponent'),
                  })
                : t('education.duels.rematchAccept')}
            </button>

            <button
              type="button"
              data-testid="duel-rematch-offer-dismiss"
              onClick={() => setRematchOffer(null)}
              className="shrink-0 rounded-neo border-[2px] border-neo-cream bg-neo-navy p-2 text-neo-cream transition-colors hover:bg-neo-cream hover:text-neo-navy"
              aria-label={t('common.dismiss')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {challenge && (
        <AdaptiveMotion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            'fixed z-50',
            // Position: bottom-right on desktop, top-right on mobile
            'bottom-6 inset-e-6 md:bottom-8 md:inset-e-8',
            'max-w-sm w-full'
          )}
        >
          <div
            className={cn(
              'p-4 rounded-neo border-[3px] border-neo-cream',
              'bg-neo-navy shadow-hard',
              'flex items-center gap-4'
            )}
          >
            {/* Icon */}
            <div className="shrink-0">
              <Swords className="w-8 h-8 text-neo-lime" />
            </div>

            {/* Content */}
            <div className="flex-1">
              <p className="text-neo-white font-bold mb-1">
                {t('challengeReceived')}
              </p>
              <p className="text-neo-white text-sm">
                {t('challengedYou', { name: challenge.challengerName })}
              </p>
            </div>

            {/* Dismiss — bordered, because a bare icon on navy is not a control */}
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 rounded-neo border-[2px] border-neo-cream bg-neo-navy p-1.5 text-neo-cream transition-colors hover:bg-neo-cream hover:text-neo-navy"
              aria-label={t('common.dismiss')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
}
