'use client';

import { useState, useCallback } from 'react';
import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const REPORT_REASONS = ['harassment', 'spam', 'inappropriate', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, context?: string) => void;
  t: (key: string) => string;
  /** Optional override for the dialog title key (defaults to report.title). */
  titleKey?: string;
}

/**
 * Reusable report form (Google Play "Social Apps & Features" policy).
 * Presentational: the parent wires the actual transport in `onSubmit`.
 */
export function ReportDialog({ open, onClose, onSubmit, t, titleKey }: ReportDialogProps): React.JSX.Element {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [context, setContext] = useState('');

  const reset = useCallback(() => {
    setReason(null);
    setContext('');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSubmit = useCallback(() => {
    if (!reason) return;
    const trimmed = context.trim();
    onSubmit(reason, trimmed.length > 0 ? trimmed : undefined);
    reset();
    onClose();
  }, [reason, context, onSubmit, reset, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent noDescription closeButtonLabel={t('common.close')} className="max-w-sm">
        <DialogHeader variant="pink" className="text-start">
          <DialogTitle className="flex items-center gap-2 text-lg font-black uppercase">
            <Flag className="w-5 h-5 stroke-3" aria-hidden="true" />
            {t(titleKey || 'report.title')}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <p className="text-sm font-bold text-current/70">{t('report.reason')}</p>

          <div className="grid grid-cols-1 gap-2">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                aria-pressed={reason === r}
                className={cn(
                  'w-full text-start px-3 py-2.5 rounded-neo border-2 border-neo-black font-black text-sm uppercase tracking-wide transition-all',
                  reason === r
                    ? 'bg-neo-pink text-neo-white shadow-hard'
                    : 'bg-neo-cream dark:bg-neo-navy-light text-neo-black dark:text-neo-white shadow-hard-sm hover:-translate-y-0.5'
                )}
              >
                {t(`report.reasons.${r}`)}
              </button>
            ))}
          </div>

          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value.slice(0, 500))}
            placeholder={t('report.detailsOptional')}
            maxLength={500}
            rows={3}
            className="w-full px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-cream dark:bg-neo-navy-light text-neo-black dark:text-neo-white text-sm font-medium resize-none"
          />

          <div className="flex gap-2 justify-end">
            <Button
              onClick={handleClose}
              className="px-4 py-2 rounded-neo border-2 border-neo-black shadow-hard-sm font-black text-xs uppercase tracking-wide bg-neo-cream dark:bg-neo-navy-light text-neo-black dark:text-neo-white"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!reason}
              className="px-4 py-2 rounded-neo border-2 border-neo-black shadow-hard font-black text-xs uppercase tracking-wide bg-neo-pink text-neo-white disabled:opacity-50"
            >
              {t('report.submit')}
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
