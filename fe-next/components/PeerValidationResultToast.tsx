'use client';

import React, { memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PeerValidationResultPayload } from '@/shared/types/socket';

interface PeerValidationResultToastProps {
  /** The validation result to display */
  result: PeerValidationResultPayload | null;
  /** Whether this is the current user's word that was rejected */
  isMyWord: boolean;
  /** Callback to dismiss the toast */
  onDismiss: () => void;
  /** Translation function */
  t: (key: string) => string;
  /** Auto-dismiss after this many ms (0 to disable) */
  autoDismissMs?: number;
}

/**
 * PeerValidationResultToast - Shows the result of peer validation
 * Displays prominently if the user's own word was rejected
 */
const PeerValidationResultToast = memo<PeerValidationResultToastProps>(({
  result,
  isMyWord,
  onDismiss,
  t,
  autoDismissMs = 5000,
}) => {
  // Auto-dismiss after timeout
  useEffect(() => {
    if (!result || autoDismissMs === 0) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [result, autoDismissMs, onDismiss]);

  if (!result || !result.rejected) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        className={cn(
          'fixed z-50',
          isMyWord
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
            : 'bottom-4 right-4'
        )}
      >
        <div
          className={cn(
            'border-4 border-neo-black rounded-neo shadow-hard-lg',
            isMyWord
              ? 'bg-neo-red text-neo-cream p-6 max-w-sm'
              : 'bg-neo-orange text-neo-black p-3 max-w-xs'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              {isMyWord ? (
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              ) : (
                <MinusCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <h4 className="font-black text-sm uppercase">
                {isMyWord
                  ? t('peerValidation.yourWordRejected') || 'Your word was rejected!'
                  : t('peerValidation.wordRejected') || 'Word rejected'
                }
              </h4>
            </div>
            <button
              onClick={onDismiss}
              className={cn(
                'w-8 h-8 flex items-center justify-center border-2 border-neo-black rounded-neo transition-all',
                isMyWord
                  ? 'bg-neo-cream text-neo-black hover:bg-neo-white'
                  : 'bg-neo-cream text-neo-black hover:bg-neo-white'
              )}
              aria-label={t('common.dismiss') || 'Dismiss'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Word */}
          <div
            className={cn(
              'border-2 border-neo-black rounded-neo p-2 mb-2 text-center',
              isMyWord ? 'bg-neo-cream text-neo-black' : 'bg-neo-cream'
            )}
          >
            <span className="font-black text-lg uppercase">{result.word}</span>
          </div>

          {/* Details */}
          <div className={cn('text-sm font-bold', isMyWord ? 'text-neo-cream/90' : 'text-neo-black/80')}>
            {isMyWord ? (
              <>
                <p className="mb-1">
                  {t('peerValidation.communityRejected') || 'The community voted this word as invalid.'}
                </p>
                <p className="flex items-center gap-1">
                  <MinusCircle className="w-4 h-4" />
                  {t('peerValidation.pointsLost') || 'Points lost'}: {result.scoreRemoved}
                </p>
              </>
            ) : (
              <p>
                {result.submitter}&apos;s &quot;{result.word}&quot; {t('peerValidation.wasRejected') || 'was rejected'}
              </p>
            )}
          </div>

          {/* Vote breakdown */}
          <div
            className={cn(
              'mt-2 pt-2 border-t-2',
              isMyWord ? 'border-neo-cream/30' : 'border-neo-black/30'
            )}
          >
            <div className="flex justify-between text-xs font-bold">
              <span>
                {t('peerValidation.invalidVotes') || 'Invalid'}: {result.invalidVotes}
              </span>
              <span>
                {t('peerValidation.validVotes') || 'Valid'}: {result.validVotes}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

PeerValidationResultToast.displayName = 'PeerValidationResultToast';

export default PeerValidationResultToast;
