'use client';

import React, { useState, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { applyHebrewFinalLetters } from '../../utils/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useLanguage } from '../../contexts/LanguageContext';
import { getPointColor } from './utils';
import type { WordChipProps } from './types';

/**
 * Individual word chip for displaying found words in results.
 * Shows word with score-based coloring, combo bonus, validation status.
 * Supports mobile tap-to-view tooltips for invalid word reasons.
 */
const WordChip = memo<WordChipProps>(({ wordObj, playerCount }) => {
  const { t } = useLanguage();
  // State for mobile tooltip - shows on tap
  const [showMobileTooltip, setShowMobileTooltip] = useState(false);

  const isDuplicate = wordObj.isDuplicate;
  const isValid = wordObj.validated;
  const isAiVerified = wordObj.isAiVerified;
  const isPending = wordObj.isPendingValidation;
  const invalidReason = wordObj.invalidReason;
  const aiReason = wordObj.aiReason;
  const displayWord = applyHebrewFinalLetters(wordObj.word);
  const comboBonus = wordObj.comboBonus || 0;

  const label = displayWord;

  // Determine the reason to display - prefer aiReason for AI-rejected words
  const displayReason = aiReason || invalidReason;

  // Check if this word should have a touchable tooltip
  const hasInvalidReason = !isValid && !isDuplicate && !isPending && displayReason;

  // Handle touch/click for mobile tooltip
  const handleTouchStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (hasInvalidReason) {
      e.preventDefault();
      e.stopPropagation();
      setShowMobileTooltip(true);
    }
  }, [hasInvalidReason]);

  const handleCloseTooltip = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMobileTooltip(false);
  }, []);

  // Get color based on score - Neo-Brutalist solid colors
  const getBackgroundColor = (): string => {
    if (isDuplicate) return 'var(--neo-orange)';
    if (isPending) return 'var(--neo-purple)';
    if (!isValid) return '#DC2626'; // Darker red for 4.6:1 contrast with cream text
    return getPointColor(wordObj.score);
  };

  // Get text color based on background - ensure readability
  const getTextColor = (): string => {
    if (isDuplicate || !isValid || isPending) return 'var(--neo-cream)';
    // For cyan backgrounds (2-3 point words), use dark text for better contrast
    if (wordObj.score === 2 || wordObj.score === 3) return 'var(--neo-black)';
    return 'var(--neo-cream)';
  };

  // Render the word chip content
  const chipContent = (
    <span
      className={cn(
        // Increased padding for 48px minimum touch target to account for borders (WCAG 2.1 AA)
        "inline-flex items-center gap-1.5 px-4 py-3 min-h-[48px] text-sm font-black uppercase border-2 border-neo-black rounded-neo shadow-hard-sm transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard",
        isDuplicate && "line-through opacity-80",
        !isDuplicate && !isValid && !isPending && "opacity-70",
        isPending && "animate-pulse",
        hasInvalidReason && "cursor-pointer active:scale-95"
      )}
      style={{
        backgroundColor: getBackgroundColor(),
        color: getTextColor(),
      }}
      onClick={handleTouchStart}
      onTouchEnd={handleTouchStart}
      role={hasInvalidReason ? "button" : undefined}
      aria-label={hasInvalidReason ? `${displayWord}: ${displayReason}` : undefined}
      tabIndex={hasInvalidReason ? 0 : undefined}
    >
      {label}
      {/* Show info icon for invalid words with reason - indicates it's tappable */}
      {hasInvalidReason && (
        <span className="text-xs w-8 h-8 min-w-[44px] min-h-[44px] flex items-center justify-center bg-neo-cream/20 rounded border border-neo-cream/30 font-black">
          ℹ️
        </span>
      )}
      {/* Show combo bonus indicator */}
      {comboBonus > 0 && !isDuplicate && isValid && (
        <span className="text-xs px-1.5 py-0.5 bg-neo-yellow text-neo-black rounded border border-neo-black font-black">
          +{comboBonus}
        </span>
      )}
      {/* Show pending validation indicator */}
      {isPending && !isDuplicate && (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs px-1.5 py-0.5 bg-neo-yellow text-neo-black rounded border border-neo-black font-black cursor-help">
                ?
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-neo-purple border-2 border-neo-black shadow-hard rounded-neo p-2"
            >
              <p className="text-xs font-bold text-neo-cream">
                {t('results.pendingValidation') || 'Pending community validation'}
                {wordObj.potentialScore && (
                  <span className="block text-neo-yellow mt-1">
                    {t('results.potentialScore', { score: String(wordObj.potentialScore) }) || `+${wordObj.potentialScore} pts if approved`}
                  </span>
                )}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {/* Show AI verification indicator with reason tooltip */}
      {isAiVerified && isValid && !isDuplicate && (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs px-1.5 py-0.5 bg-neo-purple text-neo-cream rounded border border-neo-black font-black cursor-help">
                AI
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-neo-purple border-2 border-neo-black shadow-hard rounded-neo p-2 max-w-[250px]"
            >
              <p className="text-xs font-bold text-neo-cream">{t('results.aiVerified') || 'Verified by AI'}</p>
              {aiReason && (
                <p className="text-xs text-neo-yellow mt-1">{aiReason}</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </span>
  );

  return (
    <div className="relative group">
      {/* Desktop: Show tooltip on hover for invalid words */}
      {hasInvalidReason ? (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              {chipContent}
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-neo-red border-2 border-neo-black shadow-hard rounded-neo p-2 max-w-[250px] hidden sm:block"
            >
              {isAiVerified && (
                <p className="text-[10px] font-bold text-neo-yellow mb-1 flex items-center gap-1">
                  <span className="px-1 py-0.5 bg-neo-purple rounded border border-neo-black">AI</span>
                  {t('results.aiRejected') || 'Rejected by AI'}
                </p>
              )}
              <p className="text-xs font-bold text-neo-cream">{displayReason}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        chipContent
      )}

      {/* Mobile: Show tooltip popup when tapped */}
      <AnimatePresence>
        {showMobileTooltip && hasInvalidReason && (
          <>
            {/* Backdrop to close tooltip on tap outside */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/20"
              onClick={handleCloseTooltip}
              onTouchEnd={handleCloseTooltip}
            />
            {/* Tooltip popup - positioned in viewport center on mobile */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[101] w-[min(280px,calc(100vw-32px))]"
            >
              <div className="bg-neo-red border-3 border-neo-black shadow-hard-lg rounded-neo p-3 relative">
                {/* Close button */}
                <button
                  onClick={handleCloseTooltip}
                  onTouchEnd={handleCloseTooltip}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-neo-cream border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm"
                  aria-label="Close"
                >
                  <X className="w-3 h-3 text-neo-black" />
                </button>

                {/* Word being explained */}
                <p className="text-sm font-black text-neo-cream uppercase mb-2 border-b border-neo-cream/30 pb-1">
                  "{displayWord}"
                </p>

                {/* AI rejection indicator */}
                {isAiVerified && (
                  <p className="text-[11px] font-bold text-neo-yellow mb-2 flex items-center gap-1">
                    <span className="px-1.5 py-0.5 bg-neo-purple rounded border border-neo-black text-neo-cream">AI</span>
                    {t('results.aiRejected') || 'Rejected by AI'}
                  </p>
                )}

                {/* Reason */}
                <p className="text-sm font-bold text-neo-cream leading-snug">
                  {displayReason}
                </p>

                {/* Tap hint */}
                <p className="text-[10px] text-neo-cream/60 mt-2 text-center">
                  {t('results.tapToClose') || 'Tap anywhere to close'}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {isDuplicate && playerCount > 1 && (
        <span className="absolute -top-2 end-[-8px] bg-neo-black text-neo-cream text-[10px] px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center font-black border-2 border-neo-black rounded-neo">
          {playerCount}
        </span>
      )}
    </div>
  );
});

WordChip.displayName = 'WordChip';

export { WordChip };
export default WordChip;
