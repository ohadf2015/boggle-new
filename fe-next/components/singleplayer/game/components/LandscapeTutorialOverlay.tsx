'use client';

import React from 'react';
import { ArrowLeft, Pause } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Button } from '@/components/ui/button';

interface LandscapeTutorialOverlayProps {
  isVisible: boolean;
  onDismiss: () => void;
  t: (key: string) => string | undefined;
}

/**
 * First-time landscape tutorial overlay
 * Explains keyboard shortcuts and controls for landscape mode
 */
export function LandscapeTutorialOverlay({
  isVisible,
  onDismiss,
  t,
}: LandscapeTutorialOverlayProps): React.ReactElement | null {
  if (!isVisible) return null;

  return (
    <AdaptiveAnimatePresence>
      <AdaptiveMotion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center"
        onClick={onDismiss}
      >
        <AdaptiveMotion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-neo-cream border-4 border-neo-black rounded-neo shadow-hard p-6 max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-black text-neo-black mb-4">
            {t('landscape.tutorialTitle')}
          </h2>
          <div className="space-y-3 text-neo-black/80 font-medium">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neo-cream text-neo-black border-2 border-neo-black rounded-neo flex items-center justify-center">
                <Pause className="text-neo-black" />
              </div>
              <span>{t('landscape.tutorialPause')}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neo-red border-2 border-neo-black rounded-neo flex items-center justify-center">
                <ArrowLeft className="text-neo-white rtl:rotate-180" />
              </div>
              <span>{t('landscape.tutorialQuit')}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t-2 border-neo-black/20 text-sm text-neo-black/75">
            <p>{t('landscape.tutorialKeyboard')}</p>
          </div>
          <Button
            onClick={onDismiss}
            className="w-full mt-4 bg-neo-cyan border-2 border-neo-black rounded-neo font-bold text-neo-black hover:brightness-110 h-12"
          >
            {t('common.gotIt')}
          </Button>
        </AdaptiveMotion.div>
      </AdaptiveMotion.div>
    </AdaptiveAnimatePresence>
  );
}
