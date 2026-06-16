/**
 * StoryBeatCard — Full-screen dialogue overlay between specific levels.
 * Shows world character with typewriter text effect.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { NeoPanel } from '@/components/ui/panel';
import { useLanguage } from '@/contexts/LanguageContext';

interface StoryBeatCardProps {
  worldId: number;
  characterName: string;
  dialogueKey: string;
  isVisible: boolean;
  onContinue: () => void;
}

export function StoryBeatCard({
  worldId, characterName, dialogueKey, isVisible, onContinue,
}: StoryBeatCardProps) {
  const { t } = useLanguage();
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const fullText = t(dialogueKey);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isVisible) {
      setDisplayedText('');
      setIsComplete(false);
      return;
    }
    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setDisplayedText(fullText.slice(0, i));
      if (i >= fullText.length) {
        setIsComplete(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 30);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isVisible, fullText]);

  const skipToEnd = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayedText(fullText);
    setIsComplete(true);
  };

  return (
    <AdaptiveAnimatePresence>
      {isVisible && (
        <AdaptiveMotion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="story-beat-card"
          className="fixed inset-0 z-50 flex items-center justify-center bg-neo-black/80 p-4"
          onClick={!isComplete ? skipToEnd : undefined}
        >
          <NeoPanel asChild tone="navy" shadow="lg" className="p-6 max-w-md w-full">
          <AdaptiveMotion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="text-neo-yellow font-neo-display font-bold text-lg mb-3">
              {characterName}
            </div>

            <div className="text-neo-white font-neo-body text-sm leading-relaxed min-h-[80px] mb-4">
              {displayedText}
              {!isComplete && <span className="animate-pulse">▌</span>}
            </div>

            <AdaptiveAnimatePresence>
              {isComplete && (
                <AdaptiveMotion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={onContinue}
                  data-testid="story-continue"
                  className="w-full bg-neo-lime text-neo-black py-2.5 rounded-neo border-2 border-neo-black shadow-hard font-neo-display font-bold text-sm hover:shadow-hard-pressed"
                >
                  {t('adventure.continue')}
                </AdaptiveMotion.button>
              )}
            </AdaptiveAnimatePresence>
          </AdaptiveMotion.div>
          </NeoPanel>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
}
