'use client';

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Clock, X } from 'lucide-react';
import Avatar from './Avatar';
import { cn } from '@/lib/utils';
import type { PeerValidationRequestPayload } from '@/shared/types/socket';

interface PeerValidationModalProps {
  /** The word being validated */
  validation: PeerValidationRequestPayload | null;
  /** Whether the user has already voted */
  hasVoted: boolean;
  /** Time remaining in seconds */
  timeRemaining: number | null;
  /** Callback when user votes valid */
  onVoteValid: () => void;
  /** Callback when user votes invalid */
  onVoteInvalid: () => void;
  /** Callback to dismiss the modal */
  onDismiss: () => void;
  /** Translation function */
  t: (key: string) => string;
}

/**
 * PeerValidationModal - Shows a word for peer validation voting
 * Displays the word, who submitted it, and allows voting valid/invalid
 */
const PeerValidationModal = memo<PeerValidationModalProps>(({
  validation,
  hasVoted,
  timeRemaining,
  onVoteValid,
  onVoteInvalid,
  onDismiss,
  t,
}) => {
  if (!validation) return null;

  const isLowTime = timeRemaining !== null && timeRemaining <= 5;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md"
      >
        <div className="bg-neo-cream border-4 border-neo-black rounded-neo shadow-hard-lg p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-neo-black text-sm uppercase">
              {t('peerValidation.title') || 'Is this a real word?'}
            </h3>
            <div className="flex items-center gap-2">
              {/* Timer */}
              {timeRemaining !== null && (
                <div
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-neo border-2 border-neo-black text-sm font-bold',
                    isLowTime
                      ? 'bg-neo-red text-neo-cream animate-pulse'
                      : 'bg-neo-yellow text-neo-black'
                  )}
                >
                  <Clock className="w-4 h-4" />
                  {timeRemaining}s
                </div>
              )}
              {/* Close button */}
              <button
                onClick={onDismiss}
                className="w-8 h-8 flex items-center justify-center bg-neo-cream border-2 border-neo-black rounded-neo hover:bg-neo-white active:shadow-none active:translate-x-px active:translate-y-px transition-all"
                aria-label={t('common.dismiss') || 'Dismiss'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Word Display */}
          <div className="bg-neo-navy text-neo-cream border-3 border-neo-black rounded-neo p-4 mb-3 text-center">
            <span className="font-black text-2xl uppercase tracking-wide">
              {validation.word}
            </span>
          </div>

          {/* Submitter Info */}
          <div className="flex items-center justify-center gap-2 mb-4 text-neo-black/70">
            {validation.submitterAvatar && (
              <Avatar
                avatarImage={validation.submitterAvatar.avatarImage}
                profilePictureUrl={validation.submitterAvatar.profilePictureUrl ?? undefined}
                size="sm"
                className="border-2 border-neo-black"
              />
            )}
            <span className="text-sm font-bold">
              {t('peerValidation.submittedBy') || 'Submitted by'} {validation.submittedBy}
            </span>
          </div>

          {/* Vote Buttons */}
          {hasVoted ? (
            <div className="bg-neo-green/20 border-2 border-neo-green rounded-neo p-3 text-center">
              <span className="font-bold text-neo-green">
                {t('peerValidation.voteRecorded') || 'Vote recorded!'}
              </span>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={onVoteValid}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-neo-green text-neo-black font-black uppercase border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-hard-pressed active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                <ThumbsUp className="w-5 h-5" />
                {t('peerValidation.valid') || 'Valid'}
              </button>
              <button
                onClick={onVoteInvalid}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-neo-red text-neo-cream font-black uppercase border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-hard-pressed active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                <ThumbsDown className="w-5 h-5" />
                {t('peerValidation.invalid') || 'Invalid'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

PeerValidationModal.displayName = 'PeerValidationModal';

export default PeerValidationModal;
