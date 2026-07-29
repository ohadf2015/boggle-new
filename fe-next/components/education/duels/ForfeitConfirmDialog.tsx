'use client';

/**
 * ForfeitConfirmDialog - Forfeit confirmation dialog
 *
 * Features:
 * - Radix AlertDialog pattern (consistent with existing codebase)
 * - Title and description with translations
 * - Confirm button (red/destructive styling)
 * - Cancel button
 * - Neo-brutalist styling
 */

import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface ForfeitConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ForfeitConfirmDialog({
  open,
  onConfirm,
  onCancel,
}: ForfeitConfirmDialogProps) {
  const { t } = useLanguage();

  return (
    <AlertDialog.Root open={open}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-neo-black/60 backdrop-blur-xs z-50" />
        <AlertDialog.Content
          data-testid="forfeit-dialog"
          className={cn(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'bg-neo-navy border-neo-thick rounded-neo shadow-hard',
            'p-4 sm:p-6 w-[calc(100%-2rem)] max-w-md'
          )}
        >
          <AlertDialog.Title className="text-2xl font-neo-display font-bold text-neo-white mb-4">
            {t('duels.forfeitTitle')}
          </AlertDialog.Title>

          <AlertDialog.Description className="text-neo-white mb-6">
            {t('duels.forfeitDescription')}
          </AlertDialog.Description>

          <div className="flex gap-3 justify-end">
            <AlertDialog.Cancel asChild>
              <button
                onClick={onCancel}
                className={cn(
                  'px-4 py-2 bg-neo-white text-neo-black font-neo-body font-bold',
                  'rounded-neo border-neo shadow-hard',
                  'hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px]',
                  'transition-all'
                )}
              >
                {t('duels.forfeitCancel')}
              </button>
            </AlertDialog.Cancel>

            <AlertDialog.Action asChild>
              <button
                onClick={onConfirm}
                className={cn(
                  'px-4 py-2 bg-red-500 text-neo-white font-neo-body font-bold',
                  'rounded-neo border-neo shadow-hard',
                  'hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px]',
                  'transition-all'
                )}
              >
                {t('duels.forfeitConfirm')}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
