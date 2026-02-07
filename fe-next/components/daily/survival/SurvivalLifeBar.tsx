'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LifeGainAnimation } from '../LifeGainAnimation';

export interface SurvivalLifeBarProps {
  lifePoints: number;
  isGameOver: boolean;
  isLifeGaining: boolean;
  lifeGainAmount: number | null;
  skipAnimations: boolean;
  onLifeGainComplete: () => void;
}

/**
 * Life bar display with heart icon, progress bar, and animations
 */
export const SurvivalLifeBar: React.FC<SurvivalLifeBarProps> = ({
  lifePoints,
  isGameOver,
  isLifeGaining,
  lifeGainAmount,
  skipAnimations,
  onLifeGainComplete,
}) => {
  // Life bar gradient based on remaining life
  const getLifeGradient = () => {
    if (lifePoints > 66) return 'bg-gradient-to-r from-green-400 to-emerald-500';
    if (lifePoints > 33) return 'bg-gradient-to-r from-yellow-400 to-orange-400';
    return 'bg-gradient-to-r from-red-500 to-orange-400';
  };

  return (
    <div className="flex items-center gap-2 mb-1 max-w-3xl mx-auto w-full relative">
      {/* Life gain animation */}
      <LifeGainAnimation
        amount={lifeGainAmount}
        onComplete={onLifeGainComplete}
      />

      {/* Beating heart icon */}
      <motion.div
        key={`heart-${isLifeGaining ? 'beating' : 'idle'}`}
        className={cn(
          "flex-shrink-0 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-3 border-neo-black shadow-hard",
          lifePoints > 66 ? "bg-green-500" : lifePoints > 33 ? "bg-yellow-500" : "bg-red-500",
          isLifeGaining && "heart-beating"
        )}
        animate={
          !skipAnimations && lifePoints <= 20 && !isGameOver && !isLifeGaining
            ? { scale: [1, 1.15, 1] }
            : {}
        }
        transition={{ duration: 0.6, repeat: lifePoints <= 20 && !isLifeGaining ? Infinity : 0 }}
      >
        <Heart className={cn(
          "w-5 h-5 sm:w-6 sm:h-6 text-white fill-white",
          isLifeGaining && "heart-beating"
        )} />
      </motion.div>

      {/* Life bar */}
      <motion.div
        className={cn(
          "flex-1 bg-gray-200 dark:bg-gray-700 rounded-neo h-8 sm:h-9 overflow-hidden border-3 shadow-hard relative",
          lifePoints <= 20 ? "border-red-500" : "border-neo-black",
          isLifeGaining && "life-gain-flash life-meter-pulse"
        )}
        animate={
          lifePoints <= 20 && !isGameOver && !isLifeGaining
            ? {
                scale: [1, 1.02, 1],
                borderColor: ['#ef4444', '#dc2626', '#ef4444']
              }
            : {}
        }
        transition={{ duration: 0.5, repeat: lifePoints <= 20 && !isLifeGaining ? Infinity : 0 }}
      >
        <motion.div
          className={cn(
            "h-full flex items-center justify-center text-sm sm:text-base font-black text-white relative overflow-hidden",
            getLifeGradient(),
            lifePoints <= 20 && !isLifeGaining && "animate-pulse"
          )}
          style={{ width: `${Math.max(lifePoints, 15)}%` }}
          animate={{
            width: `${Math.max(lifePoints, 15)}%`,
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer pointer-events-none" />
          <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] relative z-10">
            {Math.floor(lifePoints)}/100
          </span>
        </motion.div>

        {/* Life drain particles effect when low on life */}
        {!skipAnimations && lifePoints <= 33 && lifePoints > 0 && !isGameOver && (
          <motion.div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-red-500 rounded-full"
                initial={{ x: `${lifePoints}%`, y: '50%', opacity: 1 }}
                animate={{
                  x: [`${lifePoints}%`, `${lifePoints + 20}%`],
                  y: ['50%', `${30 + i * 20}%`],
                  opacity: [1, 0],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: 'easeOut'
                }}
              />
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
