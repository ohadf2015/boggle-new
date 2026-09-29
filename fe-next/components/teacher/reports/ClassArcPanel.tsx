/**
 * ClassArcPanel — the free "learning arc" surface of the class report view.
 *
 * Two jobs (evidence pack §8.2 + §8.3):
 *  1. THE STUDENT IS THE UNIT. Every roster student appears, stuck-first —
 *     including the ones with no session evidence, who a flat ranking hides.
 *  2. REPORT -> REMEDIATION IN ONE CLICK. The words the class keeps missing
 *     become a follow-up lesson assigned to the class; each student's own
 *     misses also re-queue automatically in their Missed Words review
 *     (collectReviewCandidates ranks own misses first), and the panel says so.
 *
 * Free on purpose: the arc is the product's answer to "Kahoot wins the moment,
 * loses the arc". Exports, passback and the deep printable reports stay Pro.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookMarked, Check, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWordMasteryTrend } from '@/hooks/useWordMasteryTrend';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { getClassroomStudents } from '@/lib/supabase/education/classrooms';
import { resolveDisplayName } from '@/lib/displayName';
import { createLessonAndAssign } from '@/lib/education/createLessonWithAssignment';
import { buildClassArcRows, pickFollowUpWords, type ArcRosterEntry } from '@/lib/education/studentArc';
import type { Language } from '@/lib/supabase/education/types';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import logger from '@/utils/logger';

export interface ClassArcPanelProps {
  classroomId: string;
  classroomName: string;
  classroomLanguage: Language;
  /** Name included when known, so the drill-down header can greet the student. */
  onStudentClick: (studentId: string, name?: string) => void;
}

type AssignStatus = 'idle' | 'saving' | 'done' | 'failed';

export function ClassArcPanel({ classroomId, classroomName, classroomLanguage, onStudentClick }: ClassArcPanelProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { mastery, isLoading: masteryLoading, error } = useWordMasteryTrend({ classroomId });
  const { createLesson } = useLessons();
  const [profiles, setProfiles] = useState<{ studentId: string; candidates: (string | null | undefined)[] }[] | null>(null);
  const [status, setStatus] = useState<AssignStatus>('idle');

  useEffect(() => {
    let cancelled = false;
    setProfiles(null);
    setStatus('idle');
    getClassroomStudents(classroomId).then(({ data }) => {
      if (cancelled) return;
      setProfiles(
        (data ?? []).map((s) => ({
          studentId: s.student_id,
          candidates: [s.profiles?.display_name, s.profiles?.username],
        }))
      );
    });
    return () => {
      cancelled = true;
    };
  }, [classroomId]);

  // Names resolve at render: the fallback copy follows the locale, and this
  // effect-free mapping can never reset the assign status mid-flight.
  const roster = useMemo<ArcRosterEntry[]>(
    () =>
      (profiles ?? []).map((p) => ({
        studentId: p.studentId,
        name: resolveDisplayName(p.candidates, t('teacher.reports.arc.unknownStudent')),
      })),
    [profiles, t]
  );

  const rows = useMemo(() => buildClassArcRows(mastery, roster), [mastery, roster]);
  const followUpWords = useMemo(
    () => (mastery ? pickFollowUpWords(mastery.classStuckWords) : []),
    [mastery]
  );

  const assign = async () => {
    if (status === 'saving' || followUpWords.length === 0) return;
    setStatus('saving');
    try {
      const result = await createLessonAndAssign({
        lesson: {
          name: t('teacher.reports.arc.followUpName', {
            classroom: classroomName,
            date: new Date().toLocaleDateString(language),
          }),
          language: classroomLanguage,
          words: followUpWords.map((word) => ({ word, canIntegrate: true })),
          classroomId,
        },
        teacherId: user?.id ?? '',
        createLesson,
      });
      setStatus(result.success && result.assigned ? 'done' : 'failed');
    } catch (err) {
      logger.error('ClassArcPanel: follow-up assign failed', err);
      setStatus('failed');
    }
  };

  if (masteryLoading || profiles === null) {
    return (
      <Shell title={t('teacher.reports.arc.title')} subtitle={t('teacher.reports.arc.subtitle')}>
        <div data-testid="class-arc-loading" aria-busy="true" className="space-y-2">
          <span className="sr-only" role="status">{t('teacher.reports.loading')}</span>
          {[0, 1, 2].map((i) => (
            <div key={i} aria-hidden="true" className="h-12 rounded-neo bg-neo-cream/10 motion-safe:animate-pulse" />
          ))}
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell title={t('teacher.reports.arc.title')} subtitle={t('teacher.reports.arc.subtitle')}>
        <p role="alert" className="rounded-neo border-2 border-neo-pink bg-neo-pink/15 px-3 py-2 text-sm font-bold text-neo-white">
          {t('teacher.reports.error')}
        </p>
      </Shell>
    );
  }

  if (!mastery || mastery.sessionsAnalyzed === 0) {
    return (
      <Shell title={t('teacher.reports.arc.title')} subtitle={t('teacher.reports.arc.subtitle')}>
        <p data-testid="class-arc-empty" className="rounded-neo border-2 border-dashed border-neo-cream/30 p-6 text-center text-sm text-neo-cream/80">
          {t('teacher.reports.arc.noEvidenceClass')}
        </p>
      </Shell>
    );
  }

  return (
    <Shell title={t('teacher.reports.arc.title')} subtitle={t('teacher.reports.arc.subtitle')}>
      {mastery.classStuckWords.length > 0 && (
        <div className="mb-5">
          <h3 className="mb-2 text-sm font-bold text-neo-cream/80">{t('teacher.reports.arc.wordsClassMisses')}</h3>
          <ul className="mb-3 flex flex-wrap gap-2">
            {mastery.classStuckWords.slice(0, 6).map((w) => (
              <li
                key={w.word}
                data-testid="class-arc-stuck-chip"
                className="inline-flex items-baseline gap-2 rounded-neo border-2 border-neo-pink bg-neo-pink/15 px-3 py-1.5"
              >
                <span className="font-bold text-neo-white" dir="auto">{w.display}</span>
                <span className="text-xs font-bold text-neo-cream/70 tabular-nums">
                  {t('teacher.reports.arc.studentsStuck', { stuck: w.studentsStuck, total: w.studentsWithEvidence })}
                </span>
              </li>
            ))}
          </ul>
          <p data-testid="class-arc-requeue-note" className="mb-3 text-xs font-bold text-neo-cream/60">
            {t('teacher.reports.arc.requeueNote')}
          </p>
          {status === 'done' ? (
            <p
              data-testid="class-arc-assigned"
              className="inline-flex items-center gap-2 rounded-neo border-2 border-neo-lime bg-neo-lime/15 px-3 py-2 text-sm font-black text-neo-white"
            >
              <Check className="size-4 shrink-0 text-neo-lime" aria-hidden="true" />
              {t('teacher.reports.arc.followUpDone')}
            </p>
          ) : (
            <button
              type="button"
              data-testid="class-arc-assign"
              onClick={assign}
              disabled={status === 'saving'}
              className={cn(
                'inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-neo-black bg-neo-lime px-4 py-2',
                'font-neo-display text-sm font-black uppercase text-neo-black shadow-hard',
                'transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-white disabled:opacity-70',
                'motion-reduce:transition-none motion-reduce:hover:translate-y-0'
              )}
            >
              {status === 'saving' ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Sparkles className="size-4" aria-hidden="true" />
              )}
              {status === 'saving' ? t('teacher.reports.arc.assigning') : t('teacher.reports.arc.assignFollowUp')}
            </button>
          )}
          {status === 'failed' && (
            <p role="alert" className="mt-2 text-sm font-black text-neo-pink">
              {t('teacher.reports.arc.followUpFailed')}
            </p>
          )}
        </div>
      )}

      {/* Legend: the pills pair colour with counts, so the meaning of each
          tone is spelled out once here rather than guessed per row. */}
      <p className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-neo-cream/70">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full bg-neo-pink" />{t('teacher.reports.arc.trend.stuck')}</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full bg-neo-cyan" />{t('teacher.reports.arc.trend.improving')}</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full bg-neo-lime" />{t('teacher.reports.arc.trend.mastered')}</span>
      </p>
      <ul className="divide-y divide-neo-cream/15">
        {rows.map((row) => (          <li key={row.studentId} data-testid="class-arc-student" data-student={row.studentId}>
            <div data-testid={`class-arc-student-${row.studentId}`} className="flex items-center gap-3 py-2">
              <button
                type="button"
                onClick={() => onStudentClick(row.studentId, row.name)}
                aria-label={t('teacher.reports.arc.viewStudent', { name: row.name })}
                className="group inline-flex min-h-11 min-w-0 flex-1 items-center gap-2 text-start font-bold text-neo-white underline-offset-4 transition-colors hover:text-neo-cyan hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
              >
                <span className="break-words">{row.name}</span>
                <DirectionalIcon
                  icon={ChevronRight}
                  className="size-4 shrink-0 opacity-40 transition-[opacity,transform] group-hover:translate-x-0.5 group-hover:opacity-100 rtl:group-hover:-translate-x-0.5"
                />
              </button>
              {row.hasEvidence ? (
                <span className="flex shrink-0 items-center gap-1.5 text-xs font-black tabular-nums">
                  {row.stuck > 0 && <TrendPill tone="pink" count={row.stuck} label={t('teacher.reports.arc.trend.stuck')} />}
                  {row.improving > 0 && <TrendPill tone="cyan" count={row.improving} label={t('teacher.reports.arc.trend.improving')} />}
                  {row.mastered > 0 && <TrendPill tone="lime" count={row.mastered} label={t('teacher.reports.arc.trend.mastered')} />}
                </span>
              ) : (
                <span className="shrink-0 text-xs font-bold text-neo-cream/50">
                  {t('teacher.reports.arc.noEvidenceStudent')}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

/** Colour + count + word: the pill never relies on colour alone. */
function TrendPill({ tone, count, label }: { tone: 'lime' | 'cyan' | 'pink'; count: number; label: string }) {
  const tones = {
    lime: 'border-neo-lime bg-neo-lime/15 text-neo-lime',
    cyan: 'border-neo-cyan bg-neo-cyan/15 text-neo-cyan',
    pink: 'border-neo-pink bg-neo-pink/15 text-neo-pink',
  } as const;
  return (
    <span title={label} className={cn('inline-flex items-center gap-1 rounded-neo border-2 px-1.5 py-0.5', tones[tone])}>
      <span className="tabular-nums">{count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section
      data-testid="class-arc-panel"
      aria-label={title}
      className="rounded-neo-lg border-2 border-neo-cream/40 bg-neo-navy-light/95 p-4 shadow-hard sm:p-6"
    >
      <h2 className="flex items-center gap-2 font-neo-display text-xl font-bold text-neo-white">
        <span className="grid size-8 shrink-0 place-items-center rounded-neo border-2 border-neo-cyan bg-neo-cyan/15">
          <BookMarked className="size-4 text-neo-cyan" aria-hidden="true" />
        </span>
        {title}
      </h2>
      <p className="mb-4 mt-1 text-sm text-neo-cream/70">{subtitle}</p>
      {children}
    </section>
  );
}

export default ClassArcPanel;
