'use client';

/**
 * ForfeitConfirmDialog - Forfeit confirmation dialog
 *
 * Thin wrapper around the shared ConfirmationDialog primitive
 * (components/ui/ConfirmationDialog.tsx) — the same component used for every
 * other quit/exit/delete confirmation in the app.
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

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
    <ConfirmationDialog
      open={open}
      onOpenChange={(next) => { if (!next) onCancel(); }}
      title={t('duels.forfeitTitle')}
      description={t('duels.forfeitDescription')}
      confirmText={t('duels.forfeitConfirm')}
      cancelText={t('duels.forfeitCancel')}
      onConfirm={onConfirm}
      variant="danger"
    />
  );
}
