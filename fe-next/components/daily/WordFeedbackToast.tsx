'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FeedbackType =
  | 'valid-word'        // Green - word found on board
  | 'invalid-word'      // Red - not a valid word
  | 'not-on-board'      // Orange - valid but not on this board
  | 'not-in-dictionary' // Red - on board but not in dictionary
  | 'too-short'         // Orange - below minimum length
  | 'duplicate'         // Yellow - already found
  | 'target-attempt'    // Blue - attempted target word
  | 'target-found';     // Rainbow - found the target!

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
    bg: 'bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500',
    text: 'text-white',
    border: 'border-purple-700',
    icon: <div className="text-base">🎉</div>,
    animation: 'animate-neo-explosion',
  },
};

export const WordFeedbackToast: React.FC<WordFeedbackToastProps> = ({
  type,
  message,
  duration = 3000, // Increased from 2000ms for better readability
  onClose,
}) => {
  useEffect(() => {
    if (!type) return;

    const timer = setTimeout(() => {
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [type, duration, onClose]);

  if (!type) return null;

  const style = FEEDBACK_STYLES[type];

  return (
    <AnimatePresence>
      {type && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'fixed bottom-24 left-1/2 -translate-x-1/2 z-50',
            'flex items-center gap-2 px-3 py-2 rounded-lg',
            'border-2 shadow-neo-brutalist',
            style.bg,
            style.text,
            style.border,
            style.animation
          )}
        >
          <div className="flex-shrink-0">
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
