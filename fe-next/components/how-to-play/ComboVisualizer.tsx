'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaFire, FaBolt } from 'react-icons/fa';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface ComboTier {
  level: string;
  multiplier: string;
  color: string;
  bonus: string;
}

interface ComboVisualizerProps {
  t: (key: string) => string;
}

/**
 * Combo System Visualizer
 * Demonstrates how the combo multiplier system works
 */
export const ComboVisualizer: React.FC<ComboVisualizerProps> = ({ t }) => {
  const [comboLevel, setComboLevel] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const comboTiers: ComboTier[] = [
    { level: '0', multiplier: '1.0x', color: 'bg-gray-400', bonus: t('howToPlay.combo.noBonus') },
    { level: '1-2', multiplier: '+1-2', color: 'bg-neo-cyan', bonus: '+1-2' },
    { level: '3-4', multiplier: '+3-4', color: 'bg-neo-lime', bonus: '+3-4' },
    { level: '5-6', multiplier: '+5-6', color: 'bg-neo-yellow', bonus: '+5-6' },
    { level: '7-8', multiplier: '+7-8', color: 'bg-neo-orange', bonus: '+7-8' },
    { level: '9+', multiplier: '+10', color: 'bg-neo-pink', bonus: '+10 max' },
  ];

  const simulateCombo = (): void => {
    if (isAnimating) return;
    setIsAnimating(true);
    setComboLevel(0);

    let level = 0;
    const interval = setInterval(() => {
      level++;
      setComboLevel(level);
      if (level >= 12) {
        clearInterval(interval);
        setTimeout(() => {
          setIsAnimating(false);
        }, 2000);
      }
    }, 400);
  };

  const getCurrentTier = (): number => {
    if (comboLevel <= 0) return 0;
    if (comboLevel <= 2) return 1;
    if (comboLevel <= 4) return 2;
    if (comboLevel <= 6) return 3;
    if (comboLevel <= 8) return 4;
    return 5;
  };

  const getCurrentTierData = (): ComboTier => {
    return comboTiers[getCurrentTier()] ?? comboTiers[0] ?? { level: '0', multiplier: '1.0x', color: 'bg-gray-400', bonus: '' };
  };

  return (
    <div className="space-y-4">
      {/* Combo Meter */}
      <div className="relative bg-neo-cream rounded-neo border-3 border-neo-black p-4 shadow-hard-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-neo-black flex items-center gap-2">
            <FaFire className={comboLevel > 2 ? 'text-neo-orange animate-pulse' : 'text-gray-600'} />
            {t('howToPlay.combo.currentCombo')}
          </span>
          <motion.span
            key={comboLevel}
            initial={{ scale: 1.5 }}
            animate={{ scale: 1 }}
            className="text-2xl font-black text-neo-black"
          >
            {comboLevel}x
          </motion.span>
        </div>

        <div className="h-4 bg-neo-black/10 rounded-neo-pill border-2 border-neo-black overflow-hidden">
          <motion.div
            className={`h-full ${getCurrentTierData().color}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(comboLevel * 8.3, 100)}%` }}
            transition={{ type: 'spring', stiffness: 100 }}
          />
        </div>

        {comboLevel > 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-center"
          >
            <Badge className={`${getCurrentTierData().color} text-neo-black border-2 border-neo-black font-bold`}>
              {getCurrentTierData().multiplier} {t('howToPlay.combo.multiplier')}
            </Badge>
          </motion.div>
        )}
      </div>

      {/* Combo Tiers Reference */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {comboTiers.map((tier, index) => (
          <div
            key={index}
            className={`
              p-2 rounded-neo border-2 border-neo-black text-center text-sm
              ${getCurrentTier() === index ? 'ring-2 ring-neo-pink ring-offset-2' : ''}
              ${tier.color}
            `}
          >
            <div className="font-bold text-neo-black">{tier.level}</div>
            <div className="text-xs font-semibold text-neo-black/80">{tier.multiplier}</div>
          </div>
        ))}
      </div>

      {/* Try It Button */}
      <Button
        variant="outline"
        onClick={simulateCombo}
        disabled={isAnimating}
        className="w-full bg-neo-yellow hover:bg-neo-orange"
      >
        <FaBolt className="mr-2" />
        {isAnimating ? t('howToPlay.combo.building') : t('howToPlay.combo.tryIt')}
      </Button>

      <p className="text-sm text-neo-black/75 text-center">
        {t('howToPlay.combo.tip')}
      </p>
    </div>
  );
};

export default ComboVisualizer;
