'use client';

import { useState } from 'react';
import { ThumbsDown, Send, X, AlertCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { useMarkAsBad } from '../hooks/useMarkAsBad';

export interface MarkAsBadButtonProps {
  authToken: string;
  date: string;
  language: string;
  challengeIndex: number;
  challengeType: string;
  trendTopic?: string;
  onSuccess?: () => void;
}

/**
 * Button to mark a challenge as bad with feedback.
 * Shows a dialog for entering feedback before submitting.
 */
export function MarkAsBadButton({
  authToken,
  date,
  language,
  challengeIndex,
  challengeType,
  trendTopic,
  onSuccess,
}: MarkAsBadButtonProps): React.ReactElement {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const { isSubmitting, error, markAsBad, clearError } = useMarkAsBad({
    authToken,
    onSuccess: () => {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setDialogOpen(false);
        setFeedback('');
        onSuccess?.();
      }, 1500);
    },
  });

  // Handle submit
  async function handleSubmit(): Promise<void> {
    await markAsBad({
      date,
      language,
      challengeIndex,
      feedback,
    });
  }

  // Handle dialog close
  function handleClose(): void {
    if (!isSubmitting) {
      setDialogOpen(false);
      setFeedback('');
      clearError();
    }
  }

  const isValidFeedback = feedback.trim().length >= 10;

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className="p-2 rounded-lg bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition-colors"
        title="Mark as bad - store feedback for AI improvement"
      >
        <ThumbsDown className="w-4 h-4" />
      </button>

      <Dialog open={dialogOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ThumbsDown className="w-5 h-5 text-red-400" />
              Mark Challenge as Bad
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="py-8 flex flex-col items-center gap-3 text-green-400"
                >
                  <Check className="w-12 h-12" />
                  <p className="text-lg font-medium">Feedback Stored!</p>
                  <p className="text-sm text-slate-400">
                    This feedback will be used to improve future challenges.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Challenge info */}
                  <div className="text-sm text-slate-400 space-y-1">
                    <p>
                      <span className="text-slate-500">Type:</span>{' '}
                      <span className="text-white">{challengeType}</span>
                    </p>
                    {trendTopic && (
                      <p>
                        <span className="text-slate-500">Trend:</span>{' '}
                        <span className="text-white">{trendTopic}</span>
                      </p>
                    )}
                    <p>
                      <span className="text-slate-500">Date:</span> {date} ({language})
                    </p>
                  </div>

                  {/* Explanation */}
                  <p className="text-sm text-slate-400 mt-4">
                    Your feedback will be stored and automatically included in future
                    AI prompts to prevent similar issues.
                  </p>

                  {/* Error display */}
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Feedback input */}
                  <div className="mt-4">
                    <label
                      htmlFor="feedback"
                      className="block text-sm font-medium text-slate-300 mb-2"
                    >
                      What&apos;s wrong with this challenge?
                    </label>
                    <textarea
                      id="feedback"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="e.g., The answer is too obscure, the connection to the trend is unclear, the prompt is confusing..."
                      className="w-full h-24 p-3 bg-slate-900 border border-slate-700 rounded text-sm text-slate-300 resize-none focus:outline-none focus:border-neo-yellow"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {feedback.length}/10 characters minimum
                      {feedback.length >= 10 && (
                        <Check className="inline w-3 h-3 ms-1 text-green-400" />
                      )}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </DialogBody>

          {!showSuccess && (
            <DialogFooter>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!isValidFeedback || isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className={`w-4 h-4 ${isSubmitting ? 'animate-pulse' : ''}`} />
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
