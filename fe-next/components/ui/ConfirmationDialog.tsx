'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { trackModalInteraction } from '../../utils/growthTracking';

export type ConfirmationDialogVariant = 'danger' | 'warning' | 'default';

interface ConfirmationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string | undefined;
  /** Dialog description/message */
  description: string | undefined;
  /** Text for the confirm button */
  confirmText?: string;
  /** Text for the cancel button */
  cancelText?: string;
  /** Callback when confirm is clicked */
  onConfirm: () => void;
  /** Visual variant of the dialog */
  variant?: ConfirmationDialogVariant;
  /** Additional className for the content wrapper */
  className?: string;
  /** Opt-in analytics id. When set, fires `modal_interaction` growth events
   *  (`shown` / `dismissed` / `confirmed`) for funnel tracking. */
  analyticsId?: string;
  /** Extra context merged into all analytics payloads for this dialog. */
  analyticsExtras?: Record<string, unknown>;
}

const variantStyles: Record<ConfirmationDialogVariant, {
  content: string;
  confirm: string;
}> = {
  danger: {
    content: 'bg-neo-cream text-neo-black border-4 border-neo-black rounded-neo shadow-hard max-w-sm',
    confirm: 'flex-1 bg-neo-red border-2 border-neo-black rounded-neo font-bold text-neo-white hover:brightness-110',
  },
  warning: {
    content: 'bg-neo-cream text-neo-black border-4 border-neo-black rounded-neo shadow-hard max-w-sm',
    confirm: 'flex-1 bg-neo-lime border-2 border-neo-black rounded-neo font-bold text-neo-black hover:brightness-110',
  },
  default: {
    content: 'bg-neo-cream text-neo-black border-4 border-neo-black rounded-neo shadow-hard max-w-sm',
    confirm: 'flex-1 bg-neo-lime border-2 border-neo-black rounded-neo font-bold text-neo-black hover:brightness-110',
  },
};

/**
 * A reusable confirmation dialog component for quit/exit/delete confirmations.
 *
 * @example
 * // Quit game confirmation (danger variant)
 * <ConfirmationDialog
 *   open={showQuitConfirm}
 *   onOpenChange={setShowQuitConfirm}
 *   title={t('singlePlayer.quitConfirmTitle')}
 *   description={t('singlePlayer.quitConfirmMessage')}
 *   confirmText={t('singlePlayer.imSure')}
 *   cancelText={t('common.cancel')}
 *   onConfirm={handleQuit}
 *   variant="danger"
 * />
 *
 * @example
 * // Exit room confirmation (default variant)
 * <ConfirmationDialog
 *   open={showExitConfirm}
 *   onOpenChange={setShowExitConfirm}
 *   title={t('playerView.exitConfirmation')}
 *   description={t('results.exitWarning')}
 *   confirmText={t('common.confirm')}
 *   cancelText={t('common.cancel')}
 *   onConfirm={confirmExitRoom}
 * />
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  variant = 'danger',
  className,
  analyticsId,
  analyticsExtras,
}: ConfirmationDialogProps) {
  const { dir, t } = useLanguage();
  const styles = variantStyles[variant];
  const isRtl = dir === 'rtl';

  const prevOpenRef = useRef(false);
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (!analyticsId) {
      prevOpenRef.current = open;
      return;
    }
    const prev = prevOpenRef.current;
    if (!prev && open) {
      confirmedRef.current = false;
      trackModalInteraction(analyticsId, 'shown', analyticsExtras);
    } else if (prev && !open) {
      if (!confirmedRef.current) {
        trackModalInteraction(analyticsId, 'dismissed', analyticsExtras);
      }
      confirmedRef.current = false;
    }
    prevOpenRef.current = open;
  }, [open, analyticsId, analyticsExtras]);

  const handleConfirm = useCallback(() => {
    if (analyticsId) {
      confirmedRef.current = true;
      trackModalInteraction(analyticsId, 'confirmed', analyticsExtras);
    }
    onConfirm();
  }, [analyticsId, analyticsExtras, onConfirm]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn(styles.content, className)} dir={dir}>
        <AlertDialogHeader>
          <AlertDialogTitle className={cn(
            variant === 'danger' && 'text-neo-black font-black text-xl',
            variant === 'warning' && 'text-neo-black font-black text-xl',
            'text-center'
          )}>
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className={cn(
            variant === 'danger' && 'text-neo-black font-medium',
            variant === 'warning' && 'text-neo-black font-medium',
            'text-center'
          )}>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={cn(
          (variant === 'danger' || variant === 'warning') && 'flex-row gap-2',
          isRtl && 'flex-row-reverse'
        )}>
          <AlertDialogCancel className={cn(
            (variant === 'danger' || variant === 'warning') &&
            'flex-1 bg-neo-cream border-2 border-neo-black rounded-neo font-bold text-neo-black hover:brightness-95'
          )}>
            {cancelText || t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={styles.confirm}
          >
            {confirmText || t('common.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConfirmationDialog;
