'use client';

import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { NeoButton } from '@/components/ui/button';
import LessonBuilder from '../LessonBuilder';
import { WeeklyProgressDigestCard } from '../digest/WeeklyProgressDigestCard';
import { WeeklyEmailReport } from '../digest/WeeklyEmailReport';

type T = (key: string, params?: Record<string, string | number>) => string;

interface HomeReportsDialogProps {
  classroom: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overFreeTierCaps: boolean;
  resultsHref: string;
  t: T;
}

export function HomeReportsDialog({ classroom, open, onOpenChange, overFreeTierCaps, resultsHref, t }: HomeReportsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeButtonLabel={t('common.close')}
        closeButtonVariant="minimal"
        style={{ backgroundImage: 'none' }}
        className="max-h-[90dvh] w-[calc(100%-1.5rem)] overflow-auto border-2 border-neo-cream/40 bg-neo-navy p-5 text-neo-cream dark:border-neo-cream/40 dark:bg-neo-navy sm:max-w-3xl lg:max-w-5xl"
      >
        <DialogTitle className="pe-12 font-neo-display text-xl font-black normal-case tracking-normal text-neo-cream">{t('eduShell.home.weeklyReports')}</DialogTitle>
        <DialogDescription className="mb-4 font-neo-body text-sm text-neo-cream/70">
          {classroom.name} · {t('eduShell.home.weeklyReportsHint')}
        </DialogDescription>
        <div data-testid="home-weekly-reports-grid" className="grid items-start gap-4 lg:grid-cols-2">
          <WeeklyProgressDigestCard classroomId={classroom.id} classroomName={classroom.name} overFreeTierCaps={overFreeTierCaps} />
          <WeeklyEmailReport classroomId={classroom.id} classroomName={classroom.name} />
        </div>
        <NeoButton asChild variant="outline" className="mt-4 self-start">
          <Link href={resultsHref} data-testid="home-weekly-reports-all">{t('eduShell.home.allResults')}</Link>
        </NeoButton>
      </DialogContent>
    </Dialog>
  );
}

interface HomeReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewWords: string[];
  t: T;
}

export function HomeReviewDialog({ open, onOpenChange, reviewWords, t }: HomeReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-auto border-[3px] border-neo-cream bg-neo-navy sm:max-w-3xl">
        <DialogTitle className="font-neo-display text-xl font-black text-neo-cream">{t('eduShell.home.reviewTitle')}</DialogTitle>
        {open ? <LessonBuilder initialReviewWords={reviewWords} /> : null}
      </DialogContent>
    </Dialog>
  );
}
