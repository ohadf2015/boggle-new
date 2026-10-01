'use client';

import { useEffect } from 'react';
import { Flame, Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { MasteryStatCards } from './MasteryStatCards';
import { HardestWordsList } from './HardestWordsList';
import { MasteryHeatmap } from './MasteryHeatmap';
import { MasteryLockedTeaser } from './MasteryLockedTeaser';
import { MissedPracticeAction } from './MissedPracticeAction';
import { useRosterNames, useWordMasteryReport } from './useWordMasteryReport';

export interface WordMasteryReportProps {
  classroomId: string;
  classroomName: string;
}

/**
 * Teacher Pro per-word mastery. The API decides what a free teacher may see
 * (top 3 words + totals); this component never receives more than that.
 */
export function WordMasteryReport({ classroomId, classroomName }: WordMasteryReportProps) {
  const { t } = useLanguage();
  const state = useWordMasteryReport(classroomId);
  const names = useRosterNames(classroomId, state.status === 'ready', t('teacher.reports.arc.unknownStudent'));

  useEffect(() => {
    if (state.status === 'locked') trackGrowthEvent('iap_viewed', { source: 'pro_gate_mastery' });
  }, [state.status]);

  if (state.status === 'loading') {
    return (
      <Shell>
        <div data-testid="word-mastery-loading" aria-busy="true" className="space-y-3">
          <span className="sr-only" role="status">{t('eduPro.mastery.loading')}</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} aria-hidden="true" className="h-24 rounded-neo bg-neo-cream/10 motion-safe:animate-pulse" />
            ))}
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} aria-hidden="true" className="h-14 rounded-neo bg-neo-cream/10 motion-safe:animate-pulse" />
          ))}
        </div>
      </Shell>
    );
  }

  if (state.status === 'error') {
    return (
      <Shell>
        <p role="alert" className="rounded-neo border-2 border-neo-pink bg-neo-pink/15 px-3 py-2 text-sm font-bold text-neo-white">
          {t('eduPro.mastery.error')}
        </p>
      </Shell>
    );
  }

  const totals = state.status === 'ready' ? state.report.totals : state.preview.totals;
  if (totals.sessions === 0) {
    return (
      <Shell locked={state.status === 'locked'}>
        <p className="rounded-neo border-2 border-dashed border-neo-cream/30 p-6 text-center text-sm font-bold text-neo-cream/80">
          {t('eduPro.mastery.empty')}
        </p>
      </Shell>
    );
  }

  if (state.status === 'locked') {
    const { preview } = state;
    return (
      <Shell locked>
        <div className="space-y-4">
          <MasteryStatCards totals={totals} />
          <HardestBlock>
            <MasteryLockedTeaser words={preview.hardestWords} hidden={preview.hiddenWords} />
          </HardestBlock>
        </div>
      </Shell>
    );
  }

  const { report } = state;
  return (
    <Shell>
      <div className="space-y-4">
        <MasteryStatCards totals={totals} />
        <HardestBlock>
          {report.hardestWords.length > 0 ? (
            <HardestWordsList words={report.hardestWords} />
          ) : (
            <p className="text-sm font-bold text-neo-cream/70">{t('eduPro.mastery.noneMissed')}</p>
          )}
        </HardestBlock>
        {report.hardestWords.length > 0 && (
          <div className="rounded-neo border-2 border-neo-lime/50 bg-neo-lime/5 p-3">
            <MissedPracticeAction classroomId={classroomId} classroomName={classroomName} locked={false} />
            <p className="mt-2 text-xs font-bold text-neo-cream/60">{t('eduPro.practice.whyNote')}</p>
          </div>
        )}
        <MasteryHeatmap report={report} names={names} />
      </div>
    </Shell>
  );
}

function HardestBlock({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black uppercase text-neo-cream/80">
        <Flame className="size-4 text-neo-pink" aria-hidden="true" />
        {t('eduPro.mastery.hardestTitle')}
      </h3>
      {children}
    </div>
  );
}

function Shell({ children, locked = false }: { children: React.ReactNode; locked?: boolean }) {
  const { t } = useLanguage();
  return (
    <section
      data-testid="word-mastery-report"
      aria-label={t('eduPro.mastery.title')}
      className="rounded-neo-lg border-2 border-neo-cream/40 bg-neo-navy-light/95 p-4 shadow-hard sm:p-6"
    >
      <div className="mb-4">
        <h2 className="flex items-center gap-2 font-neo-display text-xl font-bold text-neo-white sm:text-2xl">
          {t('eduPro.mastery.title')}
          <span className="inline-flex shrink-0 items-center gap-1 rounded-neo border-2 border-black bg-neo-lime px-2 py-0.5 font-neo-body text-xs font-black uppercase text-neo-black shadow-hard-sm">
            {locked && <Lock className="size-3" aria-hidden="true" />}
            {t('eduPro.mastery.proBadge')}
          </span>
        </h2>
        <p className="mt-0.5 text-sm text-neo-cream/70">{t('eduPro.mastery.subtitle')}</p>
      </div>
      {children}
    </section>
  );
}

export default WordMasteryReport;
