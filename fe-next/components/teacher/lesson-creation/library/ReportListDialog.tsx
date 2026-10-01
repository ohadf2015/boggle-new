'use client';

import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { REPORT_REASONS, reportList, type ReportReason } from '@/lib/education/libraryClient';

interface ReportListDialogProps {
  lessonId: string | null;
  listName: string;
  onClose: () => void;
  onReported: (lessonId: string) => void;
}

export default function ReportListDialog({ lessonId, listName, onClose, onReported }: ReportListDialogProps) {
  const { t } = useLanguage();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!lessonId || !reason) return;
    setSending(true);
    const ok = await reportList(lessonId, reason, details);
    setSending(false);
    if (!ok) {
      toast.error(t('eduLibrary.report.failed'));
      return;
    }
    toast.success(t('eduLibrary.report.thanks'));
    onReported(lessonId);
    setReason(null);
    setDetails('');
  };

  return (
    <Dialog open={lessonId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-neo-navy p-5 text-neo-white sm:max-w-md" closeButtonLabel={t('common.close')} style={{ backgroundImage: 'none' }}>
        <DialogTitle className="flex items-center gap-2 pe-12 font-neo-display text-xl normal-case text-neo-white">
          <Flag className="size-5 text-neo-pink" aria-hidden="true" />
          {t('eduLibrary.report.title')}
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-neo-white/80" dir="auto">
          {t('eduLibrary.report.description', { name: listName })}
        </DialogDescription>
        <div role="radiogroup" aria-label={t('eduLibrary.report.title')} className="mt-4 grid gap-2">
          {REPORT_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={reason === r}
              onClick={() => setReason(r)}
              className={cn(
                'min-h-11 rounded-neo border-2 px-3 text-start text-sm font-bold transition-colors',
                reason === r ? 'border-neo-black bg-neo-pink text-neo-black shadow-hard-sm' : 'border-neo-cream/50 bg-neo-navy-light text-neo-white',
              )}
            >
              {t(`eduLibrary.report.reason.${r}`)}
            </button>
          ))}
        </div>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder={t('eduLibrary.report.detailsPlaceholder')}
          aria-label={t('eduLibrary.report.detailsPlaceholder')}
          className="mt-3 w-full rounded-neo border-2 border-neo-cream/50 bg-neo-black/30 px-3 py-2 text-sm text-neo-white placeholder:text-neo-white/40 focus:outline-hidden focus:ring-2 focus:ring-neo-cyan"
        />
        <button
          type="button"
          data-testid="report-submit"
          disabled={!reason || sending}
          onClick={() => void submit()}
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-pink font-neo-display font-bold uppercase text-neo-black shadow-hard transition-all active:translate-y-0.5 active:shadow-none disabled:opacity-50"
        >
          {sending && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
          {t('eduLibrary.report.submit')}
        </button>
      </DialogContent>
    </Dialog>
  );
}
