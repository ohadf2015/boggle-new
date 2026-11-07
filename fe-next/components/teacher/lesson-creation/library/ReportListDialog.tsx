'use client';

import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/dialog';
import { REPORT_REASONS, reportList, type ReportReason } from '@/lib/education/libraryClient';
import { NbDialogBody, NbDialogContent, NbDialogFooter, NbDialogHeader } from '@/components/teacher/nb/NbDialog';
import { NB_BLOCK, NB_INPUT, NB_PRIMARY, NB_SMALL } from '@/components/teacher/nb/nbStyles';

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
      <NbDialogContent size="sm">
        <NbDialogHeader
          color="pink"
          icon={<Flag className="size-6" strokeWidth={3} aria-hidden="true" />}
          title={t('eduLibrary.report.title')}
          description={<span dir="auto">{t('eduLibrary.report.description', { name: listName })}</span>}
          closeLabel={t('common.close')}
        />
        <NbDialogBody className="space-y-3">
          <div role="radiogroup" aria-label={t('eduLibrary.report.title')} className="grid gap-2.5">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={reason === r}
                onClick={() => setReason(r)}
                className={cn(NB_SMALL, 'w-full justify-start whitespace-normal py-2 text-start', reason === r ? NB_BLOCK.pink : NB_BLOCK.navy)}
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
            className={cn(NB_INPUT, 'resize-none py-2.5 text-sm')}
          />
        </NbDialogBody>
        <NbDialogFooter>
          <button
            type="button"
            data-testid="report-submit"
            disabled={!reason || sending}
            onClick={() => void submit()}
            className={cn(NB_PRIMARY, 'w-full sm:w-auto')}
          >
            {sending && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
            {t('eduLibrary.report.submit')}
          </button>
        </NbDialogFooter>
      </NbDialogContent>
    </Dialog>
  );
}
