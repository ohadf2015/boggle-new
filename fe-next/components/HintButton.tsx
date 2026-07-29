/**
 * HintButton Component
 * Shows AI hint button for single-player mode with hint display
 */

import React, { memo, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Lightbulb, Star } from 'lucide-react';
import { Button } from './ui/button';
import { Loader } from '@/components/ui/Loader';

interface HintButtonProps {
  hint: string | null;
  hintType: 'definition' | 'firstLetter' | 'length' | 'category' | null;
  hintsRemaining: number;
  wordLength?: number;
  firstLetter?: string;
  isLoading: boolean;
  error: string | null;
  isAvailable: boolean;
  isSinglePlayer: boolean;
  gameActive: boolean;
  onRequestHint: () => void;
  onClearHint: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const HintButton = memo<HintButtonProps>(({
  hint,
  hintsRemaining,
  wordLength,
  firstLetter,
  isLoading,
  error,
  isAvailable,
  isSinglePlayer,
  gameActive,
  onRequestHint,
  onClearHint,
  t,
}) => {
  // Escape key handler to dismiss hint
  // IMPORTANT: This hook must be called unconditionally (before any early returns)
  // to satisfy React's Rules of Hooks
  useEffect(() => {
    // Only attach listener if component should be active and hint is showing
    if (!isSinglePlayer || !gameActive || !hint) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClearHint();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [hint, onClearHint, isSinglePlayer, gameActive]);

  // Only show in single player mode during active game
  if (!isSinglePlayer || !gameActive) {
    return null;
  }

  // Build accessible label
  const getAriaLabel = () => {
    if (isLoading) {
      return t('hints.loading');
    }
    if (hintsRemaining <= 0) {
      return t('hints.noHintsLeft');
    }
    return t('hints.requestHint', { remaining: hintsRemaining }) || `Request hint, ${hintsRemaining} remaining`;
  };

  return (
    <div className="relative">
      {/* Hint Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onRequestHint}
        disabled={!isAvailable || isLoading || hintsRemaining <= 0}
        aria-label={getAriaLabel()}
        aria-expanded={!!hint}
        aria-describedby={hint ? 'hint-content' : undefined}
        className={`
          flex items-center gap-1.5 px-2 py-1.5 max-w-[120px]
          ${isLoading ? 'animate-pulse' : ''}
          ${hintsRemaining > 0
            ? 'bg-neo-lime border-neo-black text-neo-black hover:bg-neo-pink hover:shadow-hard-sm'
            : 'bg-gray-300 border-gray-400 text-gray-600 cursor-not-allowed'}
          border-3 rounded-neo font-bold text-sm transition-all shadow-hard-sm
        `}
      >
        {isLoading ? <Loader size="sm" /> : <Lightbulb className="w-4 h-4 shrink-0" aria-hidden="true" />}
        <div className="flex flex-col items-start min-w-0">
          <span className="text-[10px] opacity-80 whitespace-nowrap overflow-hidden text-ellipsis max-w-[70px]" aria-hidden="true">
            {isLoading
              ? (t('hints.loading'))
              : (t('hints.hint'))
            }
          </span>
          <div className="flex items-center gap-0.5" aria-hidden="true">
            {/* Visual star tokens */}
            {[...Array(3)].map((_, i) => (
              <Star
                key={`hint-star-${i}`}
                className={`w-3 h-3 ${
                  i < hintsRemaining
                    ? 'text-neo-pink fill-neo-pink'
                    : 'text-gray-400 opacity-40'
                }`}
              />
            ))}
          </div>
        </div>
      </Button>

      {/* Hint Display Popup - pointer-events-none wrapper prevents blocking grid interaction */}
      <AnimatePresence>
        {hint && (
          <m.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full inset-x-0 mx-auto mt-2 z-50 max-w-[calc(100vw-1rem)] w-64 md:w-80 pointer-events-none"
          >
            <div
              id="hint-content"
              role="status"
              aria-live="polite"
              className="bg-neo-cream text-neo-black border-4 border-neo-black rounded-neo-lg p-4 shadow-hard-lg pointer-events-auto"
              onClick={onClearHint}
              onKeyDown={(e) => e.key === 'Escape' && onClearHint()}
              tabIndex={0}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5 text-neo-lime" style={{ filter: 'drop-shadow(1px 1px 0px rgb(var(--neo-black)))' }} aria-hidden="true" />
                <span className="font-black text-neo-black uppercase text-sm">
                  {t('hints.hint')}
                </span>
                {wordLength ? (
                  <span className="ms-auto text-xs bg-neo-pink text-white px-2 py-0.5 rounded-neo font-bold">
                    {wordLength} {t('hints.letters')}
                  </span>
                ) : null}
              </div>

              {/* Hint Text */}
              <p className="text-neo-black font-medium text-sm leading-relaxed">
                {hint}
              </p>

              {/* First Letter Badge */}
              {firstLetter && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-neo-black/70">
                    {t('hints.startsWith')}
                  </span>
                  <span className="bg-neo-cyan text-neo-black px-2 py-0.5 rounded-neo font-black text-lg">
                    {firstLetter}
                  </span>
                </div>
              )}

              {/* Tap to dismiss */}
              <div className="mt-2 text-xs text-neo-black/70 text-center">
                {t('hints.tapOrEscToDismiss')}
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-0 mt-2 z-50 max-w-[calc(100vw-1rem)]"
          >
            <div className="bg-neo-red text-white px-3 py-2 rounded-neo border-2 border-neo-black text-sm font-medium shadow-hard-sm">
              {error}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
});

HintButton.displayName = 'HintButton';

export default HintButton;
