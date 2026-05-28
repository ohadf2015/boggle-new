'use client';

import React, { useEffect } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Check, X, AlertTriangle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FeedbackType =
  | 'valid-word'        // Archetype A: Lime
  | 'invalid-word'      // Archetype B: Red
  | 'not-on-board'      // Orange
  | 'not-in-dictionary' // Archetype B: Red
  | 'too-short'         // Orange
  | 'too-long'          // Orange
  | 'duplicate'         // Archetype C: Yellow
  | 'target-attempt'    // Cyan
  | 'target-found'      // Archetype D: Purple
  | 'clue-unlocked'     // Archetype A: Lime (subtle)
  | 'discovery'         // Archetype A: Lime
  | 'short-valid';      // Archetype A: Lime

export interface WordFeedbackToastProps {
  type: FeedbackType | null;
  message: string;
  duration?: number;
  onClose?: () => void;
}

interface ArchetypeStyle {
  bg: string;
  text: string;
  border: string;
  shadow: string;
  animation: string;
  iconSymbol: string;
  icon: React.ReactNode;
  clipPath?: string;
  sparkles?: boolean;
  confetti?: boolean;
  messageLarge?: boolean;
  morePadding?: boolean;
}

// Jagged bottom edge for rejection archetypes (Archetype B)
const JAGGED_CLIP =
  'polygon(0 0,100% 0,100% 82%,95% 92%,87% 80%,79% 92%,71% 80%,63% 92%,55% 80%,47% 92%,39% 80%,31% 92%,23% 80%,15% 92%,7% 80%,0 92%)';

const LIME_BASE: Pick<ArchetypeStyle, 'bg' | 'text' | 'border' | 'shadow' | 'iconSymbol' | 'icon'> = {
  bg: 'bg-neo-lime', text: 'text-neo-black',
  border: 'border-2 border-neo-black', shadow: 'shadow-hard',
  iconSymbol: '✓', icon: <Check className="w-4 h-4" aria-hidden />,
};

const FEEDBACK_STYLES: Record<FeedbackType, ArchetypeStyle> = {
  'valid-word':    { ...LIME_BASE, animation: 'animate-neo-pop' },
  'discovery':     { ...LIME_BASE, animation: 'animate-neo-pop' },
  'short-valid':   { ...LIME_BASE, animation: 'animate-neo-pop' },
  'clue-unlocked': {
    ...LIME_BASE, animation: '',
    iconSymbol: '💡', icon: <Lightbulb className="w-3.5 h-3.5" aria-hidden />,
  },
  'invalid-word': {
    bg: 'bg-neo-red', text: 'text-neo-white',
    border: 'border-2 border-neo-black', shadow: 'shadow-hard',
    animation: 'animate-neo-shake',
    iconSymbol: '✗', icon: <X className="w-4 h-4" aria-hidden />,
    clipPath: JAGGED_CLIP,
  },
  'not-in-dictionary': {
    bg: 'bg-neo-red', text: 'text-neo-white',
    border: 'border-2 border-neo-black', shadow: 'shadow-hard',
    animation: 'animate-neo-shake',
    iconSymbol: '✗', icon: <X className="w-4 h-4" aria-hidden />,
    clipPath: JAGGED_CLIP,
  },
  'not-on-board': {
    bg: 'bg-neo-orange', text: 'text-neo-white',
    border: 'border-2 border-neo-black', shadow: 'shadow-hard',
    animation: 'animate-neo-wobble',
    iconSymbol: '⚠', icon: <AlertTriangle className="w-4 h-4" aria-hidden />,
  },
  'too-short': {
    bg: 'bg-neo-orange', text: 'text-neo-white',
    border: 'border-2 border-neo-black', shadow: 'shadow-hard',
    animation: 'animate-bounce',
    iconSymbol: '⚠', icon: <AlertTriangle className="w-4 h-4" aria-hidden />,
  },
  'too-long': {
    bg: 'bg-neo-orange', text: 'text-neo-white',
    border: 'border-2 border-neo-black', shadow: 'shadow-hard',
    animation: 'animate-bounce',
    iconSymbol: '⚠', icon: <AlertTriangle className="w-4 h-4" aria-hidden />,
  },
  'duplicate': {
    bg: 'bg-neo-yellow', text: 'text-neo-black',
    border: 'border-2 border-neo-black', shadow: 'shadow-hard',
    animation: 'animate-neo-wobble',
    iconSymbol: '🔄', icon: <span aria-hidden>🔄</span>,
    sparkles: true,
  },
  'target-attempt': {
    bg: 'bg-neo-cyan', text: 'text-neo-black',
    border: 'border-2 border-neo-black', shadow: 'shadow-hard',
    animation: 'animate-neo-pop',
    iconSymbol: '🎯', icon: <span className="text-base" aria-hidden>🎯</span>,
  },
  'target-found': {
    bg: 'bg-neo-purple', text: 'text-neo-white',
    border: 'border-4 border-neo-pink', shadow: 'shadow-hard-lg',
    animation: 'animate-neo-pop',
    iconSymbol: '🎉', icon: <span className="text-base" aria-hidden>🎉</span>,
    confetti: true, messageLarge: true, morePadding: true,
  },
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export const WordFeedbackToast: React.FC<WordFeedbackToastProps> = ({
  type,
  message,
  duration,
  onClose,
}) => {
  const isSubtle = type === 'clue-unlocked';
  const effectiveDuration = duration ?? (isSubtle ? 1400 : 3000);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    if (!type) return;
    const timer = setTimeout(() => { onClose?.(); }, effectiveDuration);
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
            style.border, style.shadow,
            'text-xs font-bold font-neo-display',
            style.bg, style.text,
          )}
        >
          <div className="shrink-0 flex items-center">
            {style.icon}
            <span className="sr-only">{style.iconSymbol}</span>
          </div>
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
            'fixed top-20 left-1/2 -translate-x-1/2 z-50 relative',
            'max-h-[640px]:top-12',
            'flex items-center gap-2 px-3 rounded-neo',
            style.morePadding ? 'py-3' : 'py-2',
            style.border, style.shadow,
            style.bg, style.text, style.animation,
          )}
          style={style.clipPath ? { clipPath: style.clipPath } : undefined}
        >
          <div className="shrink-0 flex items-center">
            {style.icon}
            <span className="sr-only">{style.iconSymbol}</span>
          </div>
          <div className={cn('font-bold font-neo-display', style.messageLarge ? 'text-lg' : 'text-sm')}>
            {message}
          </div>
          {style.sparkles && !reduced && (
            <>
              <div data-sparkle className="absolute -top-1 -left-1 w-1.5 h-1.5 rounded-full bg-neo-black opacity-60 pointer-events-none" />
              <div data-sparkle className="absolute -top-1 -right-1 w-1 h-1 rounded-full bg-neo-black opacity-40 pointer-events-none" />
              <div data-sparkle className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-neo-black opacity-50 pointer-events-none" />
            </>
          )}
          {style.confetti && (
            <div data-confetti className="absolute inset-0 pointer-events-none overflow-hidden rounded-neo">
              {!reduced && (
                <>
                  <div className="absolute top-1 left-2 w-1 h-1 bg-neo-yellow rotate-45" />
                  <div className="absolute top-2 right-3 w-1 h-1 bg-neo-lime rotate-12" />
                  <div className="absolute bottom-1 left-1/3 w-1 h-1 bg-neo-pink rotate-45" />
                </>
              )}
            </div>
          )}
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
};
