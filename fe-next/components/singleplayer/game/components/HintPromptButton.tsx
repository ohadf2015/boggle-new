'use client';

import React from 'react';
import { Zap } from 'lucide-react';
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
 * Refined UI design with lightning bolt and cyan gradient
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
          scale: [1, 1.03, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="flex items-center gap-2 px-6 py-3 border-3 border-neo-black text-neo-black hover:brightness-110 rounded-full font-black text-sm uppercase tracking-wide shadow-hard"
        style={{
          background: 'linear-gradient(135deg, #00FFFF 0%, #40E0D0 50%, #00CED1 100%)',
          boxShadow: '4px 4px 0px rgb(0,0,0), 0 0 20px rgba(0, 255, 255, 0.4)',
        }}
      >
        <Zap className="w-5 h-5" />
        <span>{t('singlePlayer.getHint')}</span>
      </AdaptiveMotion.button>
    </AdaptiveMotion.div>
  );
}
