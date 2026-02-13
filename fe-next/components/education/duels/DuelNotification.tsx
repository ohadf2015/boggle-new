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
import { cn } from '@/lib/utils';
import { Swords, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const { onChallengeReceived } = useDuelSocket();

  // State
  const [challenge, setChallenge] = useState<ChallengeReceivedData | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

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
    <AnimatePresence>
      {challenge && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            'fixed z-50',
            // Position: bottom-right on desktop, top-right on mobile
            'bottom-6 right-6 md:bottom-8 md:right-8',
            'max-w-sm w-full'
          )}
        >
          <div
            className={cn(
              'p-4 rounded-neo border-3 border-neo border-neo-black',
              'bg-neo-navy shadow-hard',
              'flex items-center gap-4'
            )}
          >
            {/* Icon */}
            <div className="flex-shrink-0">
              <Swords className="w-8 h-8 text-neo-yellow" />
            </div>

            {/* Content */}
            <div className="flex-1">
              <p className="text-neo-white font-bold mb-1">
                {t('challengeReceived')}
              </p>
              <p className="text-neo-white/80 text-sm">
                {t('challengedYou', { name: challenge.challengerName })}
              </p>
            </div>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-neo-white/50 hover:text-neo-white transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
