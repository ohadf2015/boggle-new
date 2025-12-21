'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaFire } from 'react-icons/fa';
import { useLanguage } from '../../contexts/LanguageContext';

const STORAGE_KEY = 'lexiclash_combo_explanation_seen';
const DISPLAY_DURATION = 6000; // 6 seconds

/**
 * Check if user has seen combo explanation
 */
export const hasSeenComboExplanation = (): boolean => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEY) === 'true';
};

/**
 * Mark combo explanation as seen
 */
export const markComboExplanationSeen = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, 'true');
};

interface ComboExplanationTooltipProps {
  comboLevel: number;
}

/**
 * ComboExplanationTooltip - Shows on first combo to explain the mechanic
 * Auto-dismisses after a few seconds
 */
const ComboExplanationTooltip: React.FC<ComboExplanationTooltipProps> = ({
  comboLevel,
}) => {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  // Show tooltip on first combo
  useEffect(() => {
    if (comboLevel >= 2 && !hasTriggered && !hasSeenComboExplanation()) {
      setIsVisible(true);
      setHasTriggered(true);
      markComboExplanationSeen();

      // Auto-dismiss after duration
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, DISPLAY_DURATION);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [comboLevel, hasTriggered]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 25
          }}
          className="fixed bottom-20 left-1/2 z-50 pointer-events-auto"
          style={{ transform: 'translateX(-50%)' }}
        >
          <div
            className="
              bg-neo-cream border-3 border-neo-black rounded-neo-lg shadow-hard-lg
              px-4 py-3 max-w-[320px] relative
            "
            onClick={handleDismiss}
            role="tooltip"
            aria-live="polite"
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="
                absolute -top-2 -right-2 w-6 h-6
                bg-neo-red text-white rounded-full
                border-2 border-neo-black shadow-hard-sm
                flex items-center justify-center
                hover:scale-110 transition-transform
              "
              aria-label={t('common.close') || 'Close'}
            >
              <FaTimes className="text-xs" />
            </button>

            {/* Content */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-neo border-2 border-neo-black flex items-center justify-center shadow-hard-sm">
                <FaFire className="text-white text-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-neo-black text-sm uppercase tracking-wide mb-1">
                  {t('combo.explanationTitle') || '🔥 Combo Power!'}
                </h4>
                <p className="text-neo-black/80 text-xs leading-relaxed">
                  {t('combo.explanationText') || 'Find words quickly to build combos! Higher combos = bigger score multipliers. Keep the streak going!'}
                </p>
              </div>
            </div>

            {/* Tap to dismiss hint */}
            <p className="text-center text-[10px] text-neo-black/50 mt-2 uppercase tracking-wider">
              {t('common.tapToDismiss') || 'Tap to dismiss'}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ComboExplanationTooltip;
