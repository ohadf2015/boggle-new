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
          initial={{ opacity: 1, y: 0, scale: 0.8 }}
          animate={{ opacity: 0, y: -40, scale: 1.4 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          onAnimationComplete={onComplete}
          className="absolute left-1/4 -translate-x-1/2 -top-10 pointer-events-none z-50"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500 border-3 border-neo-black rounded-neo shadow-hard">
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.3, 1, 1.2, 1] }}
              transition={{ duration: 0.6, times: [0, 0.2, 0.4, 0.6, 0.8] }}
            >
              <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-white" />
            </motion.div>
            <span className="text-xl sm:text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              +{amount}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
