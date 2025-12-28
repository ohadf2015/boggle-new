'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';

export interface LifeGainAnimationProps {
  amount: number | null;
  onComplete?: () => void;
}

export const LifeGainAnimation: React.FC<LifeGainAnimationProps> = ({
  amount,
  onComplete,
}) => {
  return (
    <AnimatePresence>
      {amount !== null && amount > 0 && (
        <motion.div
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 0, y: -50, scale: 1.2 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          onAnimationComplete={onComplete}
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-50"
          style={{ top: '-40px' }}
        >
          <div className="flex items-center gap-2 text-2xl font-black text-green-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            <span>+{amount}</span>
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
