'use client';

import React from 'react';
import { Eye } from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';

interface HintPromptButtonProps {
  /** Handler when reveal is requested */
  onReveal: () => Promise<unknown>;
  /** Set show hint prompt state */
  setShowHintPrompt: (show: boolean) => void;
  /** Position classes */
  position: string;
  /** Translation function */
  t: (key: string) => string | undefined;
}

/**
 * Animated hint prompt button that appears when player is stuck
 * Pulsates to draw attention
 */
export function HintPromptButton({
  onReveal,
  setShowHintPrompt,
  position,
  t,
}: HintPromptButtonProps): React.ReactElement {
  const handleClick = async (): Promise<void> => {
    setShowHintPrompt(false);
    await onReveal();
  };

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className={`${position} z-40`}
    >
      <AdaptiveMotion.button
        onClick={handleClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          scale: [1, 1.02, 1],
          boxShadow: [
            '6px 6px 0px rgb(var(--neo-black))',
            '8px 8px 0px rgb(var(--neo-black))',
            '6px 6px 0px rgb(var(--neo-black))',
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="flex items-center gap-2 px-4 py-2 bg-neo-pink border-3 border-neo-black text-white hover:bg-neo-pink rounded-neo font-bold text-sm shadow-hard-sm"
      >
        <Eye className="w-4 h-4" />
        <span>{t('singlePlayer.needHint')}</span>
      </AdaptiveMotion.button>
    </AdaptiveMotion.div>
  );
}
