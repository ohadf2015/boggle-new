/**
 * PauseOverlay Component
 *
 * Clean pause menu with resume, restart, and exit options.
 * Solid dark overlay with centered card layout.
 */

'use client';

import { memo, useEffect, useId, useRef, useState } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Play, RotateCcw, LogOut, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useFocusTrap } from '@/hooks/useFocusTrap';

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
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useFocusTrap(dialogRef, isOpen, onResume);

  // Scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <AdaptiveMotion.div
        ref={dialogRef}
        data-testid="pause-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
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
        <AdaptiveMotion.div
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
            <AdaptiveMotion.div
              className={cn(
                'w-16 h-16 sm:w-20 sm:h-20',
                'rounded-full',
                'bg-neo-yellow/20 border-4 border-neo-yellow',
                'flex items-center justify-center'
              )}
              style={{ boxShadow: '0 0 30px rgba(255,225,53,0.3)' }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Pause className="w-8 h-8 sm:w-10 sm:h-10 text-neo-yellow" />
            </AdaptiveMotion.div>
          </div>

          {/* Title */}
          <h2
            id={titleId}
            className="text-2xl sm:text-3xl font-black text-center text-neo-white mb-8"
          >
            {t('adventure.game.paused')}
          </h2>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {/* Resume */}
            <AdaptiveMotion.button
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
            </AdaptiveMotion.button>

            {/* Restart */}
            <AdaptiveMotion.button
              onClick={() => setShowRestartConfirm(true)}
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
              {t('adventure.restart')}
            </AdaptiveMotion.button>

            {/* Exit */}
            <AdaptiveMotion.button
              onClick={() => setShowExitConfirm(true)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'w-full py-3 px-6',
                'flex items-center justify-center gap-3',
                'bg-neo-white/5 text-neo-white',
                'font-bold',
                'border-2 border-neo-white/10 rounded-neo-lg',
                'hover:bg-neo-red/10 hover:text-neo-red hover:border-neo-red/30',
                'transition-colors duration-200'
              )}
            >
              <LogOut className="w-5 h-5 rtl:scale-x-[-1]" />
              {t('common.exit')}
            </AdaptiveMotion.button>
          </div>

          {/* Keyboard Hint */}
          <p className="text-center text-neo-white text-xs mt-6">
            {t('common.press')}{' '}
            <kbd className="px-2 py-1 bg-neo-black rounded font-mono">ESC</kbd>{' '}
            {t('common.toResume')}
          </p>
        </AdaptiveMotion.div>
      </AdaptiveMotion.div>

      <ConfirmationDialog
        open={showRestartConfirm}
        onOpenChange={setShowRestartConfirm}
        title={t('adventure.game.confirmRestart')}
        description={t('adventure.game.confirmRestartDesc')}
        onConfirm={onRestart}
        variant="warning"
        analyticsId="adventure_restart_confirm"
      />

      <ConfirmationDialog
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        title={t('adventure.game.confirmExit')}
        description={t('adventure.game.confirmExitDesc')}
        onConfirm={onExit}
        variant="danger"
        analyticsId="adventure_exit_confirm"
      />
    </>
  );
});

PauseOverlay.displayName = 'PauseOverlay';

export default PauseOverlay;
