/**
 * PauseOverlay Component
 *
 * Clean pause menu with resume, restart, and exit options.
 * Solid dark overlay with centered card layout.
 */

'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCcw, LogOut, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

// ==============================================
// TYPES
// ==============================================

interface PauseOverlayProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
  className?: string;
}

// ==============================================
// COMPONENT
// ==============================================

export const PauseOverlay = memo(function PauseOverlay({
  isOpen,
  onResume,
  onRestart,
  onExit,
  className,
}: PauseOverlayProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <motion.div
      data-testid="pause-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 z-50',
        'flex items-center justify-center',
        'bg-neo-navy/90',
        className
      )}
    >
      {/* Pause Card */}
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={cn(
          'w-full max-w-sm mx-4',
          'bg-neo-navy border-4 border-neo-black',
          'rounded-neo-lg p-6 sm:p-8',
          'shadow-hard-xl'
        )}
      >
        {/* Pause Icon */}
        <div className="flex justify-center mb-6">
          <motion.div
            className={cn(
              'w-16 h-16 sm:w-20 sm:h-20',
              'rounded-full',
              'bg-neo-yellow/20 border-4 border-neo-yellow',
              'flex items-center justify-center'
            )}
            animate={{
              boxShadow: [
                '0 0 0 rgba(255,225,53,0)',
                '0 0 30px rgba(255,225,53,0.3)',
                '0 0 0 rgba(255,225,53,0)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Pause className="w-8 h-8 sm:w-10 sm:h-10 text-neo-yellow" />
          </motion.div>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-black text-center text-neo-white mb-8">
          {t('adventure.game.paused')}
        </h2>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {/* Resume */}
          <motion.button
            onClick={onResume}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'w-full py-3 px-6',
              'flex items-center justify-center gap-3',
              'bg-neo-lime text-neo-black',
              'font-black text-lg',
              'border-3 border-neo-black rounded-neo-lg',
              'shadow-hard hover:shadow-hard-lg',
              'transition-shadow duration-200'
            )}
          >
            <Play className="w-5 h-5" />
            {t('common.resume')}
          </motion.button>

          {/* Restart */}
          <motion.button
            onClick={onRestart}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'w-full py-3 px-6',
              'flex items-center justify-center gap-3',
              'bg-neo-white/10 text-neo-white',
              'font-bold text-lg',
              'border-3 border-neo-white/20 rounded-neo-lg',
              'hover:bg-neo-white/20 hover:border-neo-white/30',
              'transition-colors duration-200'
            )}
          >
            <RotateCcw className="w-5 h-5" />
            {t('adventure.restart') || 'Restart'}
          </motion.button>

          {/* Exit */}
          <motion.button
            onClick={onExit}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'w-full py-3 px-6',
              'flex items-center justify-center gap-3',
              'bg-neo-white/5 text-neo-white/70',
              'font-bold',
              'border-2 border-neo-white/10 rounded-neo-lg',
              'hover:bg-neo-red/10 hover:text-neo-red hover:border-neo-red/30',
              'transition-colors duration-200'
            )}
          >
            <LogOut className="w-5 h-5" />
            {t('common.exit')}
          </motion.button>
        </div>

        {/* Keyboard Hint */}
        <p className="text-center text-neo-white/40 text-xs mt-6">
          {t('common.press') || 'Press'} <kbd className="px-2 py-1 bg-neo-black rounded font-mono">ESC</kbd> {t('common.toResume') || 'to resume'}
        </p>
      </motion.div>
    </motion.div>
  );
});

PauseOverlay.displayName = 'PauseOverlay';

export default PauseOverlay;
