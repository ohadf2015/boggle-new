/**
 * NextLevelPreview — Slides in after level completion showing what's next.
 */

'use client';

import { useState, useEffect } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { ChevronRight, Grid3X3 } from 'lucide-react';
import { NeoPanel } from '@/components/ui/panel';
import { useLanguage } from '@/contexts/LanguageContext';

interface NextLevelPreviewProps {
  worldId: number;
  nextLevel: number;
  gridSize: number;
  objectives: string[];
  isVisible: boolean;
  onPlay: () => void;
  onDismiss: () => void;
}

export function NextLevelPreview({
  worldId, nextLevel, gridSize, objectives, isVisible, onPlay, onDismiss,
}: NextLevelPreviewProps) {
  const { t } = useLanguage();
  const [showPlayBtn, setShowPlayBtn] = useState(false);

  useEffect(() => {
    if (!isVisible) { setShowPlayBtn(false); return; }
    const timer = setTimeout(() => setShowPlayBtn(true), 1500);
    return () => clearTimeout(timer);
  }, [isVisible]);

  return (
    <AdaptiveAnimatePresence>
      {isVisible && (
        <AdaptiveMotion.div
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 1.5 }}
          data-testid="next-level-preview"
          className="fixed bottom-[calc(1.5rem+var(--adventure-bottom-inset,0px))] left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm"
        >
          <NeoPanel tone="navy" className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-neo-display font-bold text-lg text-neo-yellow">
                {t('adventure.nextLevel')} {nextLevel}
              </h3>
              <div className="flex items-center gap-1 text-neo-white text-sm">
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>{gridSize}×{gridSize}</span>
              </div>
            </div>

            {objectives.length > 0 && (
              <ul className="text-sm text-neo-white space-y-1 mb-3">
                {objectives.map((key, i) => (
                  <li key={`obj-${i}-${key}`} className="flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3 text-neo-cyan rtl:scale-x-[-1]" />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onDismiss}
                className="text-xs text-neo-white hover:text-neo-white px-3 py-2 min-h-11 min-w-11"
              >
                {t('adventure.later')}
              </button>
              <AdaptiveAnimatePresence>
                {showPlayBtn && (
                  <AdaptiveMotion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    onClick={onPlay}
                    className="bg-neo-lime text-neo-black px-4 py-2 rounded-neo border-2 border-neo-black shadow-hard font-neo-display font-bold text-sm hover:shadow-hard-pressed active:shadow-hard-pressed"
                  >
                    {t('adventure.play')}
                  </AdaptiveMotion.button>
                )}
              </AdaptiveAnimatePresence>
            </div>
          </NeoPanel>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
}
