'use client';

import React, { useState, memo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
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
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number; showAbove?: boolean; arrowOffset?: number } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);
  const isTouchDevice = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (chipRef.current && !chipRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen && isTouchDevice.current) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && chipRef.current) {
      const rect = chipRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const tooltipEstimatedHeight = 120;
      const tooltipEstimatedWidth = 256; // w-64 = 16rem = 256px

      // Check if tooltip would go below viewport
      const spaceBelow = viewportHeight - rect.bottom;
      const showAbove = spaceBelow < tooltipEstimatedHeight + 20;

      // Calculate horizontal position - center on chip by default
      const chipCenter = rect.left + rect.width / 2;
      let leftPos = chipCenter;

      // Ensure tooltip doesn't overflow horizontally
      // Leave 16px padding from viewport edges
      const minLeft = tooltipEstimatedWidth / 2 + 16;
      const maxLeft = viewportWidth - tooltipEstimatedWidth / 2 - 16;
      leftPos = Math.max(minLeft, Math.min(maxLeft, leftPos));

      // Calculate arrow offset when tooltip is clamped
      const tooltipLeft = leftPos - tooltipEstimatedWidth / 2;
      const arrowOffset = ((chipCenter - tooltipLeft) / tooltipEstimatedWidth) * 100;

      setTooltipPosition({
        top: showAbove ? rect.top - 8 : rect.bottom + 8,
        left: leftPos,
        showAbove,
        arrowOffset,
      });
    } else if (!isOpen) {
      setTooltipPosition(null);
    }
  }, [isOpen]);

  const isDuplicate = wordObj.isDuplicate;
  const isValid = wordObj.validated;
  const isAiVerified = wordObj.isAiVerified;
  const invalidReason = wordObj.invalidReason;
  const aiReason = wordObj.aiReason;
  const displayWord = applyHebrewFinalLetters(wordObj.word);
  const comboBonus = wordObj.comboBonus || 0;

  const label = displayWord;

  // Determine the reason to display - prefer aiReason for AI-rejected words
  // Truncate long reasons to prevent tooltip overflow
  const rawReason = aiReason || invalidReason;
  const displayReason = rawReason && rawReason.length > 120
    ? rawReason.substring(0, 120) + '...'
    : rawReason;

  // Check if this word should have a touchable tooltip
  const hasInvalidReason = !isValid && !isDuplicate && displayReason;

  const handleTouchStart = () => {
    isTouchDevice.current = true;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (hasInvalidReason) {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(!isOpen);
    }
  };

  const handleMouseEnter = () => {
    if (!isTouchDevice.current && hasInvalidReason) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouchDevice.current) {
      setIsOpen(false);
    }
  };

  // Get color based on score - Neo-Brutalist solid colors
  const getBackgroundColor = (): string => {
    if (isDuplicate) return 'var(--neo-pink)';
    if (!isValid) return '#DC2626'; // Darker red for 4.6:1 contrast with cream text
    return getPointColor(wordObj.score);
  };

  // Get text color based on background - ensure WCAG AA contrast (4.5:1)
  // Colors: 1=gray (dark), 2-3=cyan, 4=orange, 5-6=purple, 7-8=pink
  const getTextColor = (): string => {
    if (isDuplicate || !isValid) return 'var(--neo-cream)';
    // 1-point words have dark gray background (#2d2d44), need light text
    if (wordObj.score === 1) return 'var(--neo-cream)';
    // Other point colors need dark text for proper contrast:
    // - cyan (2-3): bright color needs dark text
    // - orange (4): bright color needs dark text
    // - purple (5-6): medium-light needs dark text
    // - pink (7-8): medium-light needs dark text
    return 'rgb(var(--neo-black))';
  };

  const validationTooltipContent = (
    <AnimatePresence>
      {isOpen && isMounted && tooltipPosition && (
        <m.div
          initial={{ opacity: 0, y: tooltipPosition.showAbove ? -5 : 5, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: tooltipPosition.showAbove ? -5 : 5, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'fixed z-30 -translate-x-1/2',
            'w-56 sm:w-64 px-3 py-2.5 rounded-neo border-3 border-neo-black',
            'bg-neo-red text-neo-white shadow-hard-lg',
            tooltipPosition.showAbove && '-translate-y-full'
          )}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          {/* Arrow */}
          {tooltipPosition.showAbove ? (
            <div
              className="absolute -bottom-2 -translate-x-1/2 w-3 h-3 rotate-45 bg-neo-red border-r-3 border-b-3 border-neo-black"
              style={{ left: `${tooltipPosition.arrowOffset ?? 50}%` }}
            />
          ) : (
            <div
              className="absolute -top-2 -translate-x-1/2 w-3 h-3 rotate-45 bg-neo-red border-l-3 border-t-3 border-neo-black"
              style={{ left: `${tooltipPosition.arrowOffset ?? 50}%` }}
            />
          )}

          {/* Header */}
          <div className="flex items-center gap-2 mb-1.5 relative z-10">
             {isAiVerified && (
                <p className="font-black text-xs uppercase flex items-center gap-1.5 text-neo-lime">
                  <span className="px-1.5 py-0.5 bg-neo-pink rounded border border-neo-black text-neo-white">AI</span>
                  {t('results.aiRejected')}
                </p>
              )}
          </div>

          {/* Description */}
          <p className="text-sm font-bold relative z-10">
            {displayReason}
          </p>
        </m.div>
      )}
    </AnimatePresence>
  );

  return (
    <div
      ref={chipRef}
      className="relative group inline-block"
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        className={cn(
          // Increased padding for 48px minimum touch target to account for borders (WCAG 2.1 AA)
          "inline-flex items-center gap-1.5 px-4 py-3 min-h-[48px] text-sm font-black uppercase border-2 border-neo-black rounded-neo shadow-hard-sm transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-hard",
          isDuplicate && "line-through opacity-80",
          !isDuplicate && !isValid && "opacity-70",
          hasInvalidReason && "cursor-pointer active:scale-95"
        )}
        style={{
          backgroundColor: getBackgroundColor(),
          color: getTextColor(),
        }}
        role={hasInvalidReason ? "button" : undefined}
        aria-label={hasInvalidReason ? `${displayWord}: ${displayReason}` : undefined}
        tabIndex={hasInvalidReason ? 0 : undefined}
        onKeyDown={hasInvalidReason ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        } : undefined}
      >
        {label}
        {/* Show info icon for invalid words with reason - indicates it's tappable */}
        {hasInvalidReason && (
          <span className="text-xs w-8 h-8 min-w-[44px] min-h-[44px] flex items-center justify-center bg-neo-cream/20 text-neo-black rounded border border-neo-cream/30 font-black">
            ℹ️
          </span>
        )}
        {/* Show combo bonus indicator */}
        {comboBonus > 0 && !isDuplicate && isValid && (
          <span className="text-xs px-1.5 py-0.5 bg-neo-lime text-neo-black rounded border border-neo-black font-black">
            +{comboBonus}
          </span>
        )}
        {/* Show fire round bonus indicator */}
        {(wordObj.fireRoundBonus ?? 0) > 0 && !isDuplicate && isValid && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs px-1.5 py-0.5 bg-linear-to-r from-orange-500 to-red-500 text-white rounded border border-neo-black font-black cursor-help">
                  🔥+{wordObj.fireRoundBonus}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-neo-red text-neo-white border-2 border-neo-black shadow-hard rounded-neo p-2"
              >
                <p className="text-xs font-bold text-neo-black">
                  {t('results.fireRoundBonus')}
                  <span className="block text-neo-red mt-1 font-black">
                    2x {t('results.points')} (+{wordObj.fireRoundBonus})
                  </span>
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
                <span className="text-xs px-1.5 py-0.5 bg-neo-pink text-neo-white rounded border border-neo-black font-black cursor-help">
                  AI
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-neo-pink text-white border-2 border-neo-black shadow-hard rounded-neo p-2 max-w-[250px]"
              >
                <p className="text-xs font-bold text-neo-white">{t('results.aiVerified')}</p>
                {aiReason && (
                  <p className="text-xs text-neo-lime mt-1">{aiReason}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </span>

      {/* Tooltip rendered via portal */}
      {isOpen && isMounted && createPortal(validationTooltipContent, document.body)}

      {isDuplicate && playerCount > 1 && (
        <span className="absolute -top-2 inset-e-[-8px] bg-neo-black text-neo-white text-[10px] px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center font-black border-2 border-neo-black rounded-neo">
          {playerCount}
        </span>
      )}
    </div>
  );
});

WordChip.displayName = 'WordChip';

export { WordChip };
export default WordChip;
