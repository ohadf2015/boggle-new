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
      {/* Full opaque backdrop */}
      <motion.div
        className="absolute inset-0 bg-neo-black/80 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* Card container */}
        <div
          className={cn(
            'bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-xl',
            'p-4 text-neo-black'
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-neo-lime border-2 border-neo-black flex items-center justify-center text-neo-black">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase">
                {t('effects.preferenceTitle') || 'Animation Settings'}
              </h3>
              <p className="text-xs text-neo-black/70">
                {t('effects.preferenceSubtitle') || 'First time seeing this?'}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm mb-4">
            {t('effects.preferenceDescription') ||
              'This game has screen shake and flashing light effects. You can disable them if you prefer.'}
          </p>

          {/* Effect toggles preview */}
          <div className="flex gap-2 mb-4">
            <div
              className={cn(
                'flex-1 p-2 rounded-lg border-2 border-neo-black text-xs',
                settings.disableEarthquakeEffects
                  ? 'bg-gray-200 text-gray-600'
                  : 'bg-neo-orange/20 text-neo-black'
              )}
            >
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3" />
                <span className="font-bold">
                  {t('effects.earthquakeShake') || 'Screen Shake'}
                </span>
              </div>
            </div>
            <div
              className={cn(
                'flex-1 p-2 rounded-lg border-2 border-neo-black text-xs',
                settings.disableFireRoundLights
                  ? 'bg-gray-200 text-gray-600'
                  : 'bg-neo-pink/20 text-neo-black'
              )}
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                <span className="font-bold">
                  {t('effects.fireRoundLights') || 'Flashing Lights'}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleKeepAnimations}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-neo border-3 border-neo-black',
                'bg-neo-lime text-neo-black font-bold text-sm',
                'shadow-hard hover:shadow-hard-sm active:shadow-none',
                'transition-all duration-150 flex items-center justify-center gap-1.5'
              )}
            >
              <Check className="w-4 h-4" />
              {t('effects.keepAnimations') || 'Keep Effects'}
            </button>
            <button
              onClick={handleDisableBoth}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-neo border-3 border-neo-black',
                'bg-white text-neo-black font-bold text-sm',
                'shadow-hard hover:shadow-hard-sm active:shadow-none',
                'transition-all duration-150 flex items-center justify-center gap-1.5'
              )}
            >
              <X className="w-4 h-4" />
              {t('effects.disableAnimations') || 'Disable Effects'}
            </button>
          </div>

          {/* Settings hint */}
          <p className="text-[10px] text-neo-black/50 mt-2 text-center">
            {t('effects.settingsHint') || 'You can change this anytime in Settings'}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};
