'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const STORAGE_KEY = 'boggle_landscape_dismissed';

// TEMPORARILY DISABLED: Feature flag to disable landscape mode recommendation
const FEATURE_ENABLED = false;

interface LandscapeIndicatorProps {
  /** Optional className for positioning */
  className?: string;
}

/**
 * LandscapeIndicator - Neo-Brutalist banner prompting users to rotate their device
 * Only shows on mobile portrait screens, dismissible with "don't show again" option
 *
 * TEMPORARILY DISABLED: Landscape mode recommendation is disabled until the feature is more stable.
 */
const LandscapeIndicator = memo<LandscapeIndicatorProps>(({ className = '' }) => {
  // All hooks must be called unconditionally, even if component is disabled
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we should show based on localStorage
  useEffect(() => {
    if (!FEATURE_ENABLED) return;
    if (typeof window === 'undefined') return;

    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed === 'true') {
      setIsVisible(false);
      return;
    }

    // Check if mobile device
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };

    // Check orientation
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
    };

    checkMobile();
    checkOrientation();

    // Listen for orientation/resize changes
    const handleResize = () => {
      checkMobile();
      checkOrientation();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Update visibility based on mobile + portrait + game pages only
  useEffect(() => {
    if (!FEATURE_ENABLED) return;
    if (typeof window === 'undefined') return;

    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed === 'true') {
      setIsVisible(false);
      return;
    }

    // Only show on active game pages, not configuration screens
    const isGamePage = window.location.pathname.includes('/singleplayer') ||
                       window.location.pathname.includes('/multiplayer');

    // Don't show on lobby/configuration screens - only during active gameplay
    // The multiplayer page has /multiplayer/{roomCode} format when in-game
    const isInActiveGame = isGamePage && (
      window.location.pathname.includes('/singleplayer') ||
      window.location.pathname.split('/').length > 3 // e.g., /en/multiplayer/ROOMCODE
    );

    // Show after 2 second delay to let page settle
    if (isMobile && isPortrait && isInActiveGame) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    setIsVisible(false);
    return undefined;
  }, [isMobile, isPortrait]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleDontShowAgain = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  }, []);

  // TEMPORARILY DISABLED: Don't recommend landscape mode until it's more stable
  // TODO: Re-enable once landscape mode is fully tested and stable
  if (!FEATURE_ENABLED) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`fixed top-0 left-0 right-0 z-50 safe-area-top ${className}`}
        >
          <div className="mx-2 mt-2 bg-neo-orange text-neo-black border-4 border-neo-black rounded-neo shadow-hard-lg">
            <div className="flex items-center gap-3 p-3">
              {/* Rotating phone icon */}
              <motion.div
                animate={{ rotate: [0, -20, 20, -20, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: 'easeInOut'
                }}
                className="flex-shrink-0 w-10 h-10 bg-neo-cream border-3 border-neo-black rounded-neo flex items-center justify-center shadow-hard-sm"
              >
                <RotateCcw className="text-xl text-neo-black" size={20} />
              </motion.div>

              {/* Message */}
              <div className="flex-1 min-w-0">
                <p className="text-neo-black font-black text-sm leading-tight">
                  {t('common.rotateLandscape') || 'Rotate for better gameplay!'}
                </p>
                <button
                  onClick={handleDontShowAgain}
                  className="text-neo-black/70 text-xs font-bold underline hover:text-neo-black transition-colors mt-0.5"
                >
                  {t('common.dontShowAgain') || "Don't show again"}
                </button>
              </div>

              {/* Close button */}
              <button
                onClick={handleDismiss}
                aria-label={t('common.dismiss') || 'Dismiss'}
                className="flex-shrink-0 w-11 h-11 min-w-[44px] min-h-[44px] bg-neo-cream border-2 border-neo-black rounded-neo flex items-center justify-center shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all duration-100"
              >
                <X className="text-sm text-neo-black" size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

LandscapeIndicator.displayName = 'LandscapeIndicator';

export default LandscapeIndicator;
