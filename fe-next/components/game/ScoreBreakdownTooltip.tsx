'use client';

import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';

interface ScoreBreakdownTooltipProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Optional: minimum word length for the current game */
  minWordLength?: number;
}

// Standard Boggle scoring rules
const SCORING_RULES = [
  { letters: '3', points: 1 },
  { letters: '4', points: 2 },
  { letters: '5', points: 4 },
  { letters: '6', points: 8 },
  { letters: '7', points: 16 },
  { letters: '8+', points: '32+' },
];

/**
 * ScoreBreakdownTooltip - Shows how word length affects scoring
 * Helps new players understand the scoring system
 */
const ScoreBreakdownTooltip = memo<ScoreBreakdownTooltipProps>(({
  t,
  minWordLength = 3,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleTooltip = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const closeTooltip = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Filter scoring rules based on minWordLength
  const visibleRules = SCORING_RULES.filter(rule => {
    const ruleLength = parseInt(rule.letters);
    return isNaN(ruleLength) || ruleLength >= minWordLength;
  });

  return (
    <div className="relative inline-flex items-center">
      {/* Help icon button */}
      <button
        onClick={toggleTooltip}
        className="w-5 h-5 flex items-center justify-center text-neo-black/50 hover:text-neo-black/80 transition-colors"
        aria-label={t('scoring.howItWorks') || 'How scoring works'}
        aria-expanded={isOpen}
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Tooltip popup */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close on outside click */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={closeTooltip}
            />

            {/* Tooltip content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 min-w-[180px]"
            >
              <div className="bg-neo-cream border-3 border-neo-black rounded-neo shadow-hard-lg p-3 relative">
                {/* Close button */}
                <button
                  onClick={closeTooltip}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-neo-pink text-white rounded-full border-2 border-neo-black shadow-hard-sm flex items-center justify-center hover:scale-110 transition-transform"
                  aria-label={t('common.close') || 'Close'}
                >
                  <X className="w-2.5 h-2.5" />
                </button>

                {/* Header */}
                <h4 className="font-black text-neo-black text-xs uppercase tracking-wide mb-2 text-center">
                  {t('scoring.pointsPerWord') || 'Points per Word'}
                </h4>

                {/* Scoring table */}
                <div className="space-y-1">
                  {visibleRules.map((rule) => (
                    <div
                      key={rule.letters}
                      className="flex items-center justify-between gap-2 px-2 py-1 rounded-neo bg-white/50"
                    >
                      <span className="text-xs font-bold text-neo-black/80">
                        {rule.letters} {t('scoring.letters') || 'letters'}
                      </span>
                      <span className="text-sm font-black text-neo-black">
                        {rule.points} {t('scoring.pts') || 'pts'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Tip */}
                <p className="text-[10px] text-neo-black/60 text-center mt-2 leading-tight">
                  {t('scoring.longerWordsTip') || 'Longer words = way more points!'}
                </p>

                {/* Arrow pointer */}
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-neo-cream border-l-3 border-t-3 border-neo-black rotate-45" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
});

ScoreBreakdownTooltip.displayName = 'ScoreBreakdownTooltip';

export default ScoreBreakdownTooltip;
