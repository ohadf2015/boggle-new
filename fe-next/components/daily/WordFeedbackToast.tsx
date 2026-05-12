'use client';

import React, { useEffect } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
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
    bg: 'bg-neo-lime',
    text: 'text-neo-black',
    border: 'border-neo-black',
    icon: <Check className="w-4 h-4" />,
    animation: 'animate-neo-pop',
  },
  'invalid-word': {
    bg: 'bg-neo-red',
    text: 'text-neo-cream',
    border: 'border-neo-black',
    icon: <X className="w-4 h-4" />,
    animation: 'animate-neo-shake',
  },
  'not-on-board': {
    bg: 'bg-neo-orange',
    text: 'text-neo-cream',
    border: 'border-neo-black',
    icon: <AlertTriangle className="w-4 h-4" />,
    animation: 'animate-neo-wiggle',
  },
  'not-in-dictionary': {
    bg: 'bg-neo-red',
    text: 'text-neo-cream',
    border: 'border-neo-black',
    icon: <X className="w-4 h-4" />,
    animation: 'animate-neo-shake',
  },
  'too-short': {
    bg: 'bg-neo-orange',
    text: 'text-neo-cream',
    border: 'border-neo-black',
    icon: <AlertTriangle className="w-4 h-4" />,
    animation: 'animate-bounce',
  },
  'too-long': {
    bg: 'bg-neo-orange',
    text: 'text-neo-cream',
    border: 'border-neo-black',
    icon: <AlertTriangle className="w-4 h-4" />,
    animation: 'animate-bounce',
  },
  'duplicate': {
    bg: 'bg-neo-yellow',
    text: 'text-neo-black',
    border: 'border-neo-black',
    icon: <RefreshCw className="w-4 h-4" />,
    animation: 'animate-pulse',
  },
  'target-attempt': {
    bg: 'bg-neo-cyan',
    text: 'text-neo-black',
    border: 'border-neo-black',
    icon: <div className="text-base">🎯</div>,
    animation: 'animate-neo-pop',
  },
  'target-found': {
    bg: 'bg-linear-to-r from-neo-purple via-neo-pink to-neo-yellow',
    text: 'text-neo-cream',
    border: 'border-neo-black',
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
      <AdaptiveAnimatePresence>
        <AdaptiveMotion.div
          key="clue-unlocked"
          initial={{ opacity: 0, y: 8, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.9 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={cn(
            'fixed top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none',
            'flex items-center gap-1.5 px-2.5 py-1 rounded-neo',
            'border-2 shadow-hard text-xs font-bold font-neo-display',
            style.bg,
            style.text,
            style.border,
          )}
        >
          <div className="shrink-0">{style.icon}</div>
          <div>{message}</div>
        </AdaptiveMotion.div>
      </AdaptiveAnimatePresence>
    );
  }

  return (
    <AdaptiveAnimatePresence>
      {type && (
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'fixed top-20 left-1/2 -translate-x-1/2 z-50',
            'max-h-[640px]:top-12',
            'flex items-center gap-2 px-3 py-2 rounded-neo',
            'border-2 shadow-hard',
            style.bg,
            style.text,
            style.border,
            style.animation
          )}
        >
          <div className="shrink-0">
            {style.icon}
          </div>
          <div className="font-bold text-sm font-neo-display">
            {message}
          </div>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
};
