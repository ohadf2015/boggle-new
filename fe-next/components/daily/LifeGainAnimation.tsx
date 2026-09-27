'use client';

import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
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
        <m.div
          initial={{ opacity: 1, y: 0, scale: 0.6 }}
          animate={{ opacity: 0, y: -48, scale: 1.3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.0, ease: 'easeOut' }}
          onAnimationComplete={onComplete}
          className="absolute left-1/4 -translate-x-1/2 -top-10 pointer-events-none z-50"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 bg-neo-lime border-3 border-neo-black rounded-neo shadow-hard relative overflow-hidden">
            {/* Shimmer sweep across the badge */}
            <m.div
              className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
            <m.div
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.4, 1, 1.2, 1] }}
              transition={{ type: 'tween', duration: 0.5, times: [0, 0.2, 0.4, 0.6, 0.8] }}
            >
              <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-neo-black fill-neo-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
            </m.div>
            <span className="text-xl sm:text-2xl font-black text-neo-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] relative">
              +{amount}
            </span>
          </div>
          {/* Ring burst behind badge */}
          <m.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ scale: 0.5, opacity: 0.7 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="w-8 h-8 rounded-full border-2 border-neo-lime-light" />
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
