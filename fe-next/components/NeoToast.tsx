'use client';

import React from 'react';
import { AnimatePresence, m } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  AlertTriangle, Ban, BookOpen, Bot, Check, CheckCircle, Crown, FileText,
  Flag, Gamepad2, HelpCircle, Hourglass, Info, Lightbulb, Link,
  Plug, RefreshCw, Rocket, Ruler, Shield, Smartphone, Sparkles,
  Square, StopCircle, Tag, Target, Timer, Trophy, Users, XCircle,
} from 'lucide-react';
import { applyHebrewFinalLetters } from '@/utils/utils';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import { Loader } from '@/components/ui/Loader';

/**
 * Neo-Brutalist Toast Component
 * Features: Thick borders, hard shadows, bold uppercase text, vibrant colors
 */


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

const iconClass = 'w-5 h-5';

/**
 * Shared icon map for toast notifications.
 * Exported so .ts hook files can reference icons without JSX.
 */
export const TOAST_ICONS = {
  bookOpen: <BookOpen className={iconClass} />,
  refresh: <RefreshCw className={iconClass} />,
  ruler: <Ruler className={iconClass} />,
  ban: <Ban className={iconClass} />,
  square: <Square className={iconClass} />,
  link: <Link className={iconClass} />,
  users: <Users className={iconClass} />,
  timer: <Timer className={iconClass} />,
  helpCircle: <HelpCircle className={iconClass} />,
  hourglass: <Hourglass className={iconClass} />,
  crown: <Crown className={iconClass} />,
  smartphone: <Smartphone className={iconClass} />,
  check: <Check className={iconClass} />,
  alertTriangle: <AlertTriangle className={iconClass} />,
  gamepad: <Gamepad2 className={iconClass} />,
  rocket: <Rocket className={iconClass} />,
  target: <Target className={iconClass} />,
  trophy: <Trophy className={iconClass} />,
  xCircle: <XCircle className={iconClass} />,
  flag: <Flag className={iconClass} />,
  plug: <Plug className={iconClass} />,
  stopCircle: <StopCircle className={iconClass} />,
  shield: <Shield className={iconClass} />,
  lightbulb: <Lightbulb className={iconClass} />,
  tag: <Tag className={iconClass} />,
  fileText: <FileText className={iconClass} />,
  sparkles: <Sparkles className={iconClass} />,
} as const;

const REJECTION_MESSAGES: Record<WordRejectionReason, { icon: React.ReactNode; messageKey: string }> = {
  not_in_dictionary: { icon: TOAST_ICONS.bookOpen, messageKey: 'toast.rejection.notInDictionary' },
  already_found: { icon: TOAST_ICONS.refresh, messageKey: 'toast.rejection.alreadyFound' },
  too_short: { icon: TOAST_ICONS.ruler, messageKey: 'toast.rejection.tooShort' },
  invalid_path: { icon: TOAST_ICONS.ban, messageKey: 'toast.rejection.invalidPath' },
  outside_board: { icon: TOAST_ICONS.square, messageKey: 'toast.rejection.outsideBoard' },
  not_connected: { icon: TOAST_ICONS.link, messageKey: 'toast.rejection.notConnected' },
  duplicate: { icon: TOAST_ICONS.users, messageKey: 'toast.rejection.duplicate' },
  timeout: { icon: TOAST_ICONS.timer, messageKey: 'toast.rejection.timeout' },
  unknown: { icon: TOAST_ICONS.helpCircle, messageKey: 'toast.rejection.unknown' },
};

interface WordRejectedOptions {
  reason?: WordRejectionReason;
  customMessage?: string;
  duration?: number;
}

interface NeoToastAction {
  label: string;
  onClick: () => void;
}

interface NeoToastOptions {
  icon?: string | React.ReactNode;
  id?: string;
  duration?: number;
  description?: string;
  action?: NeoToastAction;
}

// Neo-Brutalist Word Accepted Toast
export const wordAcceptedToast = (word: string, options: WordAcceptedOptions = {}): string => {
  const { score, comboBonus, comboLevel, fireRoundActive, duration } = options;

  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <m.div
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={SPRING_PRESETS.snappy}
            role="status"
            aria-live="polite"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-lime border-3 border-neo-black shadow-hard"
            style={{ minWidth: '200px', pointerEvents: 'auto' }}
          >
            <m.span
              initial={{ opacity: 0, scale: 0.95, rotate: -180 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
              className="text-2xl text-neo-black"
              aria-hidden="true"
            >
              ✓
            </m.span>
            <span dir="auto" className="font-black uppercase tracking-wide text-neo-black">
              {applyHebrewFinalLetters(word)}
            </span>
            {/* Show score if provided and greater than 0 */}
            {typeof score === 'number' && score > 0 && (
              <m.span
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 15 }}
                className="px-2 py-1 bg-neo-cyan border-2 border-neo-black rounded font-black text-sm text-neo-black"
              >
                +{score}
              </m.span>
            )}
            {/* Show fire round 2x multiplier badge */}
            {fireRoundActive && (
              <m.span
                initial={{ opacity: 0, scale: 0.95, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 15 }}
                className="px-2 py-1 bg-linear-to-r from-neo-red to-neo-pink border-2 border-neo-black rounded font-black text-xs text-neo-white"
              >
                🔥 ×2
              </m.span>
            )}
            {/* Show combo bonus if present */}
            {typeof comboBonus === 'number' && comboBonus > 0 && (
              <m.span
                initial={{ opacity: 0, scale: 0.95, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.25, type: 'spring', stiffness: 400, damping: 15 }}
                className="px-2 py-1 bg-neo-pink border-2 border-neo-black rounded font-black text-sm text-neo-black"
              >
                +{comboBonus} {options.comboBonusLabel || 'combo!'}
              </m.span>
            )}
          </m.div>
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
          <m.div
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={SPRING_PRESETS.snappy}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-lime border-3 border-neo-black shadow-hard"
            style={{ minWidth: '200px', pointerEvents: 'auto' }}
          >
            <m.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
              className="text-2xl text-neo-black"
            >
              ⏳
            </m.span>
            <span dir="auto" className="font-black uppercase tracking-wide text-neo-black">
              {applyHebrewFinalLetters(word)}
            </span>
            <span dir="auto" className="text-xs font-bold text-neo-black/70 uppercase">
              {options.pendingLabel || 'Pending'}
            </span>
          </m.div>
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
          <m.div
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={SPRING_PRESETS.snappy}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-pink border-3 border-neo-black shadow-hard"
            style={{ minWidth: '220px', pointerEvents: 'auto' }}
          >
            <m.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="text-2xl flex items-center justify-center"
            >
              <Bot className="text-neo-black" />
            </m.span>
            <div className="flex flex-col">
              <span dir="auto" className="font-black uppercase tracking-wide text-neo-black">
                {applyHebrewFinalLetters(word)}
              </span>
              <span dir="auto" className="text-xs font-bold text-neo-black/70 uppercase">
                {options.aiValidatingLabel || 'AI checking...'}
              </span>
            </div>
            <m.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ type: 'tween', duration: 0.6, repeat: Infinity }}
              className="ms-auto"
            >
              <Loader size="sm" />
            </m.div>
          </m.div>
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
          <m.div
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
            role="alert"
            aria-live="assertive"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-red border-3 border-neo-black shadow-hard"
            style={{ minWidth: '240px', pointerEvents: 'auto' }}
          >
            <m.span
              initial={{ opacity: 0, scale: 0.95, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 15 }}
              className="text-2xl text-neo-white"
              aria-hidden="true"
            >
              {rejectionInfo.icon}
            </m.span>
            <div className="flex flex-col gap-0.5">
              <span dir="auto" className="font-black uppercase tracking-wide text-neo-white">
                {applyHebrewFinalLetters(word)}
              </span>
              <span dir="auto" className="text-xs font-bold text-neo-white uppercase">
                {displayMessage}
              </span>
            </div>
            <m.span
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 15 }}
              className="text-xl ms-auto text-neo-white"
            >
              ✗
            </m.span>
          </m.div>
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
          <m.div
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
            role="alert"
            aria-live="assertive"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-red border-3 border-neo-black shadow-hard"
            style={{ minWidth: '200px', pointerEvents: 'auto' }}
          >
            <m.span
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 15 }}
              className="text-2xl text-neo-white"
              aria-hidden="true"
            >
              ✗
            </m.span>
            <span dir="auto" className="font-black uppercase tracking-wide text-neo-white">
              {message}
            </span>
          </m.div>
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
  const icon = options.icon ?? <CheckCircle className="w-6 h-6 text-neo-black" />;
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <m.div
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={SPRING_PRESETS.snappy}
            role="status"
            aria-live="polite"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-lime border-3 border-neo-black shadow-hard"
            style={{ pointerEvents: 'auto' }}
          >
            <m.span
              initial={{ opacity: 0, scale: 0.95, rotate: -180 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="text-2xl text-neo-black"
              aria-hidden="true"
            >
              {icon}
            </m.span>
            <span dir="auto" className="font-black uppercase tracking-wide text-neo-black">
              {message}
            </span>
          </m.div>
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
  const icon = options.icon ?? <XCircle className="w-6 h-6 text-neo-white" />;
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <m.div
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
            role="alert"
            aria-live="assertive"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-red border-3 border-neo-black shadow-hard"
            style={{ pointerEvents: 'auto' }}
          >
            <m.span
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 15 }}
              className="text-2xl text-neo-white"
              aria-hidden="true"
            >
              {icon}
            </m.span>
            <span dir="auto" className="font-black uppercase tracking-wide text-neo-white">
              {message}
            </span>
          </m.div>
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
  const icon = options.icon ?? <Info className="w-6 h-6 text-neo-black" />;
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <m.div
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={SPRING_PRESETS.snappy}
            role="status"
            aria-live="polite"
            className="flex items-start gap-3 px-4 py-3 rounded-lg bg-neo-cyan border-3 border-neo-black shadow-hard"
            style={{ pointerEvents: 'auto' }}
          >
            <m.span
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="text-2xl text-neo-black"
              aria-hidden="true"
            >
              {icon}
            </m.span>
            <div className="flex flex-col gap-1">
              <span dir="auto" className="font-black uppercase tracking-wide text-neo-black">
                {message}
              </span>
              {options.description && (
                <span dir="auto" className="text-xs font-bold text-neo-black/80">
                  {options.description}
                </span>
              )}
              {options.action && (
                <button
                  type="button"
                  onClick={() => {
                    options.action?.onClick();
                    toast.dismiss(t.id);
                  }}
                  className="mt-1 self-start px-2 py-1 text-xs font-black uppercase rounded border-2 border-neo-black bg-neo-black text-neo-white hover:bg-neo-black/80 transition-colors"
                >
                  {options.action.label}
                </button>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    ),
    {
      duration: options.duration || 3000,
      position: 'top-center',
      id: options.id,
    }
  );
};

// Neo-Brutalist Warning Toast
export const neoWarningToast = (message: string, options: NeoToastOptions = {}): string => {
  const icon = options.icon ?? <AlertTriangle className="w-6 h-6 text-neo-black" />;
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <m.div
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
            role="status"
            aria-live="polite"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neo-yellow border-3 border-neo-black shadow-hard"
            style={{ pointerEvents: 'auto' }}
          >
            <m.span
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: [1, 1.2, 1] }}
              transition={{ delay: 0.1, type: 'spring', repeat: 1 }}
              className="text-2xl text-neo-black"
              aria-hidden="true"
            >
              {icon}
            </m.span>
            <span dir="auto" className="font-black uppercase tracking-wide text-neo-black">
              {message}
            </span>
          </m.div>
        )}
      </AnimatePresence>
    ),
    {
      duration: options.duration || 4000,
      position: 'top-center',
      id: options.id,
    }
  );
};

