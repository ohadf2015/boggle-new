'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertTriangle, RefreshCw, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FeedbackType =
  | 'valid-word'        // Green - word found on board
  | 'invalid-word'      // Red - not a valid word
  | 'not-on-board'      // Orange - valid but not on this board
  | 'not-in-dictionary' // Red - on board but not in dictionary
  | 'too-short'         // Orange - below minimum length
  | 'too-long'          // Orange - above maximum length
  | 'duplicate'         // Yellow - already found
  | 'target-attempt'    // Blue - attempted target word
  | 'target-found'      // Rainbow - found the target!
  | 'clue-unlocked';    // Lime - subtle non-blocking hint purchase confirmation

export interface WordFeedbackToastProps {
  type: FeedbackType | null;
  message: string;
  duration?: number;
  onClose?: () => void;
}

const FEEDBACK_STYLES: Record<FeedbackType, {
  bg: string;
  text: string;
  border: string;
  icon: React.ReactNode;
  animation: string;
}> = {
  'valid-word': {
    bg: 'bg-green-500',
    text: 'text-white',
    border: 'border-green-700',
    icon: <Check className="w-4 h-4" />,
    animation: 'animate-neo-pop',
  },
  'invalid-word': {
    bg: 'bg-red-500',
    text: 'text-white',
    border: 'border-red-700',
    icon: <X className="w-4 h-4" />,
    animation: 'animate-neo-shake',
  },
  'not-on-board': {
    bg: 'bg-orange-500',
    text: 'text-white',
    border: 'border-orange-700',
    icon: <AlertTriangle className="w-4 h-4" />,
    animation: 'animate-neo-wiggle',
  },
  'not-in-dictionary': {
    bg: 'bg-red-500',
    text: 'text-white',
    border: 'border-red-700',
    icon: <X className="w-4 h-4" />,
    animation: 'animate-neo-shake',
  },
  'too-short': {
    bg: 'bg-orange-500',
    text: 'text-white',
    border: 'border-orange-700',
    icon: <AlertTriangle className="w-4 h-4" />,
    animation: 'animate-bounce',
  },
  'too-long': {
    bg: 'bg-orange-500',
    text: 'text-white',
    border: 'border-orange-700',
    icon: <AlertTriangle className="w-4 h-4" />,
    animation: 'animate-bounce',
  },
  'duplicate': {
    bg: 'bg-yellow-500',
    text: 'text-black',
    border: 'border-yellow-700',
    icon: <RefreshCw className="w-4 h-4" />,
    animation: 'animate-pulse',
  },
  'target-attempt': {
    bg: 'bg-blue-500',
    text: 'text-white',
    border: 'border-blue-700',
    icon: <div className="text-base">🎯</div>,
    animation: 'animate-neo-pop',
  },
  'target-found': {
    bg: 'bg-linear-to-r from-purple-500 via-pink-500 to-yellow-500',
    text: 'text-white',
    border: 'border-purple-700',
    icon: <div className="text-base">🎉</div>,
    animation: 'animate-neo-explosion',
  },
  'clue-unlocked': {
    bg: 'bg-neo-lime',
    text: 'text-neo-black',
    border: 'border-neo-black',
    icon: <Lightbulb className="w-3.5 h-3.5" />,
    animation: '',
  },
};

export const WordFeedbackToast: React.FC<WordFeedbackToastProps> = ({
  type,
  message,
  duration,
  onClose,
}) => {
  const isSubtle = type === 'clue-unlocked';
  const effectiveDuration = duration ?? (isSubtle ? 1400 : 3000);

  useEffect(() => {
    if (!type) return;

    const timer = setTimeout(() => {
      onClose?.();
    }, effectiveDuration);

    return () => clearTimeout(timer);
  }, [type, effectiveDuration, onClose]);

  if (!type) return null;

  const style = FEEDBACK_STYLES[type];

  if (isSubtle) {
    return (
      <AnimatePresence>
        <motion.div
          key="clue-unlocked"
          initial={{ opacity: 0, y: 8, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.9 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={cn(
            'fixed top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none',
            'flex items-center gap-1.5 px-2.5 py-1 rounded-neo',
            'border-2 shadow-hard text-xs font-bold',
            style.bg,
            style.text,
            style.border,
          )}
        >
          <div className="shrink-0">{style.icon}</div>
          <div>{message}</div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {type && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'fixed top-[35%] left-1/2 -translate-x-1/2 z-50',
            'flex items-center gap-2 px-3 py-2 rounded-lg',
            'border-2 shadow-neo-brutalist',
            style.bg,
            style.text,
            style.border,
            style.animation
          )}
        >
          <div className="shrink-0">
            {style.icon}
          </div>
          <div className="font-bold text-sm">
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
