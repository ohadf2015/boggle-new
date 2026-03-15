'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { getChainColor, getChainLabel } from './utils/blastChainCounter';

interface BlastChainCounterProps {
  /** Current cascade chain level. 0 = no active chain (renders nothing). */
  chainLevel: number;
}

/**
 * BlastChainCounter
 *
 * Displays an escalating cascade chain counter ("CHAIN x2", "CHAIN x3", ...)
 * during cascade sequences. Color progresses white -> gold -> orange -> rainbow
 * as the chain level increases.
 *
 * Renders nothing when chainLevel <= 0.
 * Reduced-motion users see the text + color without scale animation.
 */
export function BlastChainCounter({ chainLevel }: BlastChainCounterProps) {
  const label = getChainLabel(chainLevel);
  const color = getChainColor(chainLevel);
  const isRainbow = color === 'rainbow';

  return (
    <AnimatePresence mode="wait">
      {label && (
        <motion.div
          key={chainLevel}
          data-testid="blast-chain-counter"
          data-chain-level={chainLevel}
          data-chain-color={color}
          initial={{ opacity: 0, scale: 0.8, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.1, y: -4 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="pointer-events-none select-none"
        >
          {isRainbow ? (
            <span
              className="font-black text-2xl uppercase tracking-widest"
              style={{
                background: 'linear-gradient(90deg, #ff0080, #ff6b35, #ffd700, #00ff88, #00cfff, #bf00ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                // Fallback for test environments
                color: '#ffd700',
              }}
            >
              {label}
            </span>
          ) : (
            <span
              className="font-black text-2xl uppercase tracking-widest drop-shadow-lg"
              style={{ color }}
            >
              {label}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
