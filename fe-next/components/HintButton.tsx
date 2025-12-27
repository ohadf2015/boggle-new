/**
 * HintButton Component
 * Shows AI hint button for single-player mode with hint display
 */

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaLightbulb } from 'react-icons/fa';
import { Button } from './ui/button';

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
  // Only show in single player mode during active game
  if (!isSinglePlayer || !gameActive) {
    return null;
  }

  return (
    <div className="relative">
      {/* Hint Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onRequestHint}
        disabled={!isAvailable || isLoading || hintsRemaining <= 0}
        className={`
          flex items-center gap-2 px-3 py-2
          ${isLoading ? 'animate-pulse' : ''}
          ${hintsRemaining > 0
            ? 'bg-neo-yellow border-neo-black text-neo-black hover:bg-neo-orange hover:shadow-hard-sm'
            : 'bg-gray-300 border-gray-400 text-gray-600 cursor-not-allowed'}
          border-2 rounded-neo font-bold text-sm transition-all
        `}
      >
        <FaLightbulb className={isLoading ? 'animate-spin' : ''} />
        <span>
          {isLoading
            ? (t('hints.loading') || 'Getting hint...')
            : hintsRemaining > 0
              ? `${t('hints.getHint') || 'Hint'} (${hintsRemaining})`
              : (t('hints.noHints') || 'No hints left')
          }
        </span>
      </Button>

      {/* Hint Display Popup */}
      <AnimatePresence>
        {hint && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 z-50 w-64 md:w-80"
          >
            <div
              className="bg-neo-cream text-neo-black border-4 border-neo-black rounded-neo-lg p-4 shadow-hard-lg"
              onClick={onClearHint}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <FaLightbulb className="text-neo-yellow text-lg" style={{ filter: 'drop-shadow(1px 1px 0px rgb(var(--neo-black)))' }} />
                <span className="font-black text-neo-black uppercase text-sm">
                  {t('hints.hint') || 'Hint'}
                </span>
                {wordLength && (
                  <span className="ml-auto text-xs bg-neo-purple text-white px-2 py-0.5 rounded-neo font-bold">
                    {wordLength} {t('hints.letters') || 'letters'}
                  </span>
                )}
              </div>

              {/* Hint Text */}
              <p className="text-neo-black font-medium text-sm leading-relaxed">
                {hint}
              </p>

              {/* First Letter Badge */}
              {firstLetter && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-neo-black/70">
                    {t('hints.startsWith') || 'Starts with:'}
                  </span>
                  <span className="bg-neo-cyan text-neo-black px-2 py-0.5 rounded-neo font-black text-lg">
                    {firstLetter}
                  </span>
                </div>
              )}

              {/* Tap to dismiss */}
              <div className="mt-2 text-xs text-neo-black/70 text-center">
                {t('hints.tapToDismiss') || 'Tap to dismiss'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 z-50"
          >
            <div className="bg-neo-red text-white px-3 py-2 rounded-neo border-2 border-neo-black text-sm font-medium shadow-hard-sm">
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

HintButton.displayName = 'HintButton';

export default HintButton;
