'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Bot } from 'lucide-react';
import { applyHebrewFinalLetters } from '@/utils/utils';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import { Loader } from '@/components/ui/Loader';

/**
 * Neo-Brutalist Toast Component
 * Features: Thick borders, hard shadows, bold uppercase text, vibrant colors
 */

// Custom toast styles for Neo-Brutalist design
const neoToastStyles = {
  success: {
    background: 'var(--neo-lime)',
    color: 'var(--neo-black)',
    border: '3px solid var(--neo-black)',
    boxShadow: '4px 4px 0px var(--neo-black)',
  },
  error: {
    background: 'var(--neo-red)',
    color: 'var(--neo-white)',
    border: '3px solid var(--neo-black)',
    boxShadow: '4px 4px 0px var(--neo-black)',
  },
  info: {
    background: 'var(--neo-cyan)',
    color: 'var(--neo-black)',
    border: '3px solid var(--neo-black)',
    boxShadow: '4px 4px 0px var(--neo-black)',
  },
  warning: {
    background: 'var(--neo-yellow)',
    color: 'var(--neo-black)',
    border: '3px solid var(--neo-black)',
    boxShadow: '4px 4px 0px var(--neo-black)',
  },
};

interface WordAcceptedOptions {
  score?: number;
  comboBonus?: number;
  comboLevel?: number;
  comboBonusLabel?: string;
  fireRoundActive?: boolean;
  duration?: number;
}

interface WordNeedsValidationOptions {
  pendingLabel?: string;
  duration?: number;
}

interface WordAIValidatingOptions {
  aiValidatingLabel?: string;
  duration?: number;
}

interface WordErrorOptions {
  duration?: number;
}

/**
 * Word rejection reasons with user-friendly messages
 */
export type WordRejectionReason =
  | 'not_in_dictionary'
  | 'already_found'
  | 'too_short'
  | 'invalid_path'
  | 'outside_board'
  | 'not_connected'
  | 'duplicate'
  | 'timeout'
  | 'unknown';

const REJECTION_MESSAGES: Record<WordRejectionReason, { icon: string; messageKey: string }> = {
  not_in_dictionary: { icon: '📖', messageKey: 'toast.rejection.notInDictionary' },
  already_found: { icon: '🔄', messageKey: 'toast.rejection.alreadyFound' },
  too_short: { icon: '📏', messageKey: 'toast.rejection.tooShort' },
  invalid_path: { icon: '🚫', messageKey: 'toast.rejection.invalidPath' },
  outside_board: { icon: '⬜', messageKey: 'toast.rejection.outsideBoard' },
  not_connected: { icon: '🔗', messageKey: 'toast.rejection.notConnected' },
  duplicate: { icon: '👥', messageKey: 'toast.rejection.duplicate' },
  timeout: { icon: '⏱️', messageKey: 'toast.rejection.timeout' },
  unknown: { icon: '❓', messageKey: 'toast.rejection.unknown' },
};

interface WordRejectedOptions {
  reason?: WordRejectionReason;
  customMessage?: string;
  duration?: number;
}

interface NeoToastOptions {
  icon?: string | React.ReactNode;
  id?: string;
  duration?: number;
}

// Neo-Brutalist Word Accepted Toast
export const wordAcceptedToast = (word: string, options: WordAcceptedOptions = {}): string => {
  const { score, comboBonus, comboLevel, fireRoundActive, duration } = options;

  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={SPRING_PRESETS.snappy}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-lime border-3 border-neo-black shadow-hard"
            style={{ minWidth: '200px', pointerEvents: 'auto' }}
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.95, rotate: -180 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
              className="text-2xl"
            >
              ✓
            </motion.span>
            <span dir="auto" className="font-black uppercase tracking-wide text-neo-black">
              {applyHebrewFinalLetters(word)}
            </span>
            {/* Show score if provided and greater than 0 */}
            {typeof score === 'number' && score > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 15 }}
                className="px-2 py-1 bg-neo-cyan border-2 border-neo-black rounded font-black text-sm text-neo-black"
              >
                +{score}
              </motion.span>
            )}
            {/* Show fire round 2x multiplier badge */}
            {fireRoundActive && (
              <motion.span
                initial={{ opacity: 0, scale: 0.95, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 15 }}
                className="px-2 py-1 bg-gradient-to-r from-neo-red to-neo-pink border-2 border-neo-black rounded font-black text-xs text-neo-cream"
              >
                🔥 ×2
              </motion.span>
            )}
            {/* Show combo bonus if present */}
            {typeof comboBonus === 'number' && comboBonus > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.95, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.25, type: 'spring', stiffness: 400, damping: 15 }}
                className="px-2 py-1 bg-neo-pink border-2 border-neo-black rounded font-black text-sm text-neo-white"
              >
                +{comboBonus} {options.comboBonusLabel || 'combo!'}
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    ),
    {
      duration: duration || 2000,
      position: 'top-center',
    }
  );
};

// Neo-Brutalist Word Needs Validation Toast
export const wordNeedsValidationToast = (word: string, options: WordNeedsValidationOptions = {}): string => {
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={SPRING_PRESETS.snappy}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-lime border-3 border-neo-black shadow-hard"
            style={{ minWidth: '200px', pointerEvents: 'auto' }}
          >
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
              className="text-2xl"
            >
              ⏳
            </motion.span>
            <span dir="auto" className="font-black uppercase tracking-wide text-neo-black">
              {applyHebrewFinalLetters(word)}
            </span>
            <span dir="auto" className="text-xs font-bold text-neo-black/70 uppercase">
              {options.pendingLabel || 'Pending'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    ),
    {
      duration: options.duration || 2000,
      position: 'top-center',
    }
  );
};

// Neo-Brutalist AI Validating Toast
export const wordAIValidatingToast = (word: string, options: WordAIValidatingOptions = {}): string => {
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={SPRING_PRESETS.snappy}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-pink border-3 border-neo-black shadow-hard"
            style={{ minWidth: '220px', pointerEvents: 'auto' }}
          >
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="text-2xl flex items-center justify-center"
            >
              <Bot className="text-neo-black" />
            </motion.span>
            <div className="flex flex-col">
              <span dir="auto" className="font-black uppercase tracking-wide text-neo-black">
                {applyHebrewFinalLetters(word)}
              </span>
              <span dir="auto" className="text-xs font-bold text-neo-black/70 uppercase">
                {options.aiValidatingLabel || 'AI checking...'}
              </span>
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="ms-auto"
            >
              <Loader size="sm" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    ),
    {
      id: `ai-validating-${word}`, // Unique ID for this word to allow dismissal
      duration: options.duration || 10000, // Longer duration since AI validation can take time
      position: 'top-center',
    }
  );
};

// Neo-Brutalist Word Rejected Toast (with detailed reason)
export const wordRejectedToast = (word: string, options: WordRejectedOptions & { t?: (key: string) => string } = {}): string => {
  const { reason = 'unknown', customMessage, duration } = options;
  const rejectionInfo = REJECTION_MESSAGES[reason];
  const displayMessage = customMessage || (options.t ? options.t(rejectionInfo.messageKey) : rejectionInfo.messageKey);

  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.9, x: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              scale: 1,
              x: [0, -5, 5, -5, 5, 0]
            }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              x: { duration: 0.4, delay: 0.1 }
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-red border-3 border-neo-black shadow-hard"
            style={{ minWidth: '240px', pointerEvents: 'auto' }}
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.95, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 15 }}
              className="text-2xl"
            >
              {rejectionInfo.icon}
            </motion.span>
            <div className="flex flex-col gap-0.5">
              <span dir="auto" className="font-black uppercase tracking-wide text-neo-white">
                {applyHebrewFinalLetters(word)}
              </span>
              <span dir="auto" className="text-xs font-bold text-neo-white/80 uppercase">
                {displayMessage}
              </span>
            </div>
            <motion.span
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 15 }}
              className="text-xl ms-auto"
            >
              ✗
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    ),
    {
      duration: duration || 3000,
      position: 'top-center',
    }
  );
};

// Neo-Brutalist Word Error Toast
export const wordErrorToast = (message: string, options: WordErrorOptions = {}): string => {
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.9, x: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              scale: 1,
              x: [0, -5, 5, -5, 5, 0]
            }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              x: { duration: 0.4, delay: 0.1 }
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-red border-3 border-neo-black shadow-hard"
            style={{ minWidth: '200px', pointerEvents: 'auto' }}
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 15 }}
              className="text-2xl"
            >
              ✗
            </motion.span>
            <span dir="auto" className="font-black uppercase tracking-wide text-neo-white">
              {message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    ),
    {
      duration: options.duration || 2500,
      position: 'top-center',
    }
  );
};

// Neo-Brutalist Success Toast (generic)
export const neoSuccessToast = (message: string, options: NeoToastOptions = {}): string => {
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={SPRING_PRESETS.snappy}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-lime border-3 border-neo-black shadow-hard"
            style={{ pointerEvents: 'auto' }}
          >
            {options.icon && (
              <motion.span
                initial={{ opacity: 0, scale: 0.95, rotate: -180 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="text-2xl"
              >
                {options.icon}
              </motion.span>
            )}
            <span dir="auto" className="font-black uppercase tracking-wide text-neo-black">
              {message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    ),
    {
      id: options.id, // Unique ID to prevent duplicate toasts
      duration: options.duration || 3000,
      position: 'top-center',
    }
  );
};

// Neo-Brutalist Error Toast (generic)
export const neoErrorToast = (message: string, options: NeoToastOptions = {}): string => {
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.9, x: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              scale: 1,
              x: [0, -3, 3, -3, 3, 0]
            }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              x: { duration: 0.3 }
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-red border-3 border-neo-black shadow-hard"
            style={{ pointerEvents: 'auto' }}
          >
            {options.icon && (
              <motion.span
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 15 }}
                className="text-2xl"
              >
                {options.icon}
              </motion.span>
            )}
            <span dir="auto" className="font-black uppercase tracking-wide text-neo-white">
              {message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    ),
    {
      duration: options.duration || 3000,
      position: 'top-center',
    }
  );
};

// Neo-Brutalist Info Toast
export const neoInfoToast = (message: string, options: NeoToastOptions = {}): string => {
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={SPRING_PRESETS.snappy}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-cyan border-3 border-neo-black shadow-hard"
            style={{ pointerEvents: 'auto' }}
          >
            {options.icon && (
              <motion.span
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="text-2xl"
              >
                {options.icon}
              </motion.span>
            )}
            <span dir="auto" className="font-black uppercase tracking-wide text-neo-black">
              {message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    ),
    {
      duration: options.duration || 3000,
      position: 'top-center',
    }
  );
};

// Neo-Brutalist Warning Toast
export const neoWarningToast = (message: string, options: NeoToastOptions = {}): string => {
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{
              y: 0,
              opacity: 1,
              scale: 1,
              x: [0, -2, 2, -2, 0]
            }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              x: { duration: 0.3, delay: 0.1 }
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-yellow border-3 border-neo-black shadow-hard"
            style={{ pointerEvents: 'auto' }}
          >
            {options.icon && (
              <motion.span
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: [1, 1.2, 1] }}
                transition={{ delay: 0.1, type: 'spring', repeat: 1 }}
                className="text-2xl"
              >
                {options.icon}
              </motion.span>
            )}
            <span dir="auto" className="font-black uppercase tracking-wide text-neo-black">
              {message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    ),
    {
      duration: options.duration || 4000,
      position: 'top-center',
    }
  );
};

