'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Check, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { cn } from '@/lib/utils';

interface EffectsPreferencePromptProps {
  onDismiss: () => void;
}

/**
 * EffectsPreferencePrompt - First-time prompt to disable earthquake/fire round animations
 *
 * Shows during the earthquake warning phase on the user's first earthquake experience.
 * Allows users to disable animations before experiencing them.
 */
export const EffectsPreferencePrompt: React.FC<EffectsPreferencePromptProps> = ({
  onDismiss,
}) => {
  const { t } = useLanguage();
  const {
    settings,
    toggleFireRoundLights,
    toggleEarthquakeEffects,
  } = useAccessibility();

  // Toggle both effects at once
  const handleDisableBoth = useCallback(() => {
    if (!settings.disableEarthquakeEffects) {
      toggleEarthquakeEffects();
    }
    if (!settings.disableFireRoundLights) {
      toggleFireRoundLights();
    }
    onDismiss();
  }, [settings, toggleEarthquakeEffects, toggleFireRoundLights, onDismiss]);

  const handleKeepAnimations = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Full opaque backdrop - BLOCKS all clicks (no pointer-events-none) */}
      <motion.div
        className="absolute inset-0 bg-neo-black/90 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          // Prevent any backdrop clicks from dismissing
          e.stopPropagation();
        }}
      />
      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* Simplified Card - Minimal text */}
        <div
          className={cn(
            'bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-xl',
            'p-5 text-neo-black'
          )}
        >
          {/* Simplified Header - No subtitle */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neo-orange to-neo-red border-2 border-neo-black flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-black text-lg uppercase tracking-tight">
              {t('effects.fireRoundTitle') || '🔥 Fire Round!'}
            </h3>
          </div>

          {/* Simplified Description - One line */}
          <p className="text-sm text-center mb-5 font-bold">
            {t('effects.fireRoundPrompt') ||
              'Screen shake & flashing lights ahead. Disable?'}
          </p>

          {/* Action buttons - Clearer labels */}
          <div className="flex gap-3">
            <button
              onClick={handleKeepAnimations}
              className={cn(
                'flex-1 py-3 px-4 rounded-neo border-3 border-neo-black',
                'bg-neo-lime text-neo-black font-black text-sm uppercase',
                'shadow-hard hover:shadow-hard-sm active:shadow-none',
                'transition-all duration-150 flex items-center justify-center gap-2'
              )}
            >
              <Check className="w-5 h-5" />
              {t('effects.enable') || 'Enable'}
            </button>
            <button
              onClick={handleDisableBoth}
              className={cn(
                'flex-1 py-3 px-4 rounded-neo border-3 border-neo-black',
                'bg-white text-neo-black font-black text-sm uppercase',
                'shadow-hard hover:shadow-hard-sm active:shadow-none',
                'transition-all duration-150 flex items-center justify-center gap-2'
              )}
            >
              <X className="w-5 h-5" />
              {t('effects.disable') || 'Disable'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
