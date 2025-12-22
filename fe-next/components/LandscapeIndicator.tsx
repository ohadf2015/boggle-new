'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdScreenRotation } from 'react-icons/md';
import { FaTimes } from 'react-icons/fa';
import { useLanguage } from '../contexts/LanguageContext';

const STORAGE_KEY = 'boggle_landscape_dismissed';

interface LandscapeIndicatorProps {
  /** Optional className for positioning */
  className?: string;
}

/**
 * LandscapeIndicator - Neo-Brutalist banner prompting users to rotate their device
 * Only shows on mobile portrait screens, dismissible with "don't show again" option
 */
const LandscapeIndicator = memo<LandscapeIndicatorProps>(({ className = '' }) => {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we should show based on localStorage
  useEffect(() => {
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

  // Update visibility based on mobile + portrait
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed === 'true') {
      setIsVisible(false);
      return;
    }

    setIsVisible(isMobile && isPortrait);
  }, [isMobile, isPortrait]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleDontShowAgain = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  }, []);

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
          <div className="mx-2 mt-2 bg-neo-orange border-4 border-neo-black rounded-neo shadow-hard-lg">
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
                <MdScreenRotation className="text-xl text-neo-black" />
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
                className="flex-shrink-0 w-8 h-8 bg-neo-cream border-2 border-neo-black rounded-neo flex items-center justify-center shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all duration-100"
              >
                <FaTimes className="text-sm text-neo-black" />
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
