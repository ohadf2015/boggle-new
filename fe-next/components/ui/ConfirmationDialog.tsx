'use client';

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

export type ConfirmationDialogVariant = 'danger' | 'warning' | 'default';

interface ConfirmationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description/message */
  description: string;
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
}

const variantStyles: Record<ConfirmationDialogVariant, {
  content: string;
  confirm: string;
}> = {
  danger: {
    content: 'bg-neo-cream text-neo-black border-4 border-neo-black rounded-neo shadow-hard max-w-sm',
    confirm: 'flex-1 bg-neo-red border-2 border-neo-black rounded-neo font-bold text-neo-cream hover:brightness-110',
  },
  warning: {
    content: 'bg-neo-cream text-neo-black border-4 border-neo-black rounded-neo shadow-hard max-w-sm',
    confirm: 'flex-1 bg-neo-yellow border-2 border-neo-black rounded-neo font-bold text-neo-black hover:brightness-110',
  },
  default: {
    content: 'bg-white text-neo-black dark:bg-slate-800 dark:text-white border-red-500/30',
    confirm: 'bg-red-500 hover:bg-red-600',
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
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'danger',
  className,
}: ConfirmationDialogProps) {
  const { dir } = useLanguage();
  const styles = variantStyles[variant];
  const isRtl = dir === 'rtl';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn(styles.content, className)} dir={dir}>
        <AlertDialogHeader>
          <AlertDialogTitle className={cn(
            variant === 'danger' && 'text-neo-black font-black text-xl',
            variant === 'warning' && 'text-neo-black font-black text-xl',
            isRtl ? 'text-right' : 'text-left'
          )}>
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className={cn(
            variant === 'danger' && 'text-neo-black/70 font-medium',
            variant === 'warning' && 'text-neo-black/70 font-medium',
            isRtl ? 'text-right' : 'text-left'
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
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={styles.confirm}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConfirmationDialog;
