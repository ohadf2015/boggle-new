'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { hasProAccess } from '@/lib/education/teacherPlanGate';
import { getClassroomStudents } from '@/lib/supabase/education/classrooms';
import { getClassMastery } from '@/lib/supabase/wordMastery';
import { resolveDisplayName } from '@/lib/displayName';
import { buildClassInsights, type StudentInsight } from '@/components/teacher/reports/classInsights';
import AvatarLite from '@/components/AvatarLite';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';

const VISIBLE = 6;

type Status = 'below' | 'notYet' | 'played' | 'onTrack';
const ORDER: Record<Status, number> = { below: 0, notYet: 1, played: 2, onTrack: 2 };
const CHIP: Record<Status, string> = {
  below: 'border-neo-pink bg-neo-pink/15 text-neo-pink',
  notYet: 'border-black/30 bg-black/5 text-black/70',
  played: 'border-black bg-neo-cyan text-black',
  onTrack: 'border-neo-lime bg-neo-lime text-black',
};

interface Row {
  id: string;
  name: string;
  status: Status;
  accuracy: number;
}

function toRows(
  roster: { student_id: string; profiles?: { display_name?: string | null; username?: string | null } | null }[],
  insights: StudentInsight[],
  fallback: string,
  judge: boolean,
): Row[] {
  const byId = new Map(insights.map((s) => [s.studentId, s]));
  return roster
    .map((s) => {
      const insight = byId.get(s.student_id);
      const status: Status = !insight ? 'notYet' : !judge ? 'played' : insight.belowGoal ? 'below' : 'onTrack';
      return {
        id: s.student_id,
        name: resolveDisplayName([s.profiles?.display_name, s.profiles?.username], fallback),
        status,
        accuracy: insight?.accuracy ?? 0,
      };
    })
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.accuracy - b.accuracy || a.name.localeCompare(b.name));
}

/** Who in this class needs attention, from the same evidence the reports use. */
export function ClassRosterStatus({ classroomId }: { classroomId: string }) {
  const { t, language } = useLanguage();
  const entitlement = useTeacherPro();
  const { hasPro } = entitlement;
  const [nowMs] = useState(() => Date.now());
  const canOpenReport = !entitlement.loading && hasProAccess(entitlement, nowMs);
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fallback = t('teacher.reports.arc.unknownStudent');
    Promise.all([getClassroomStudents(classroomId), getClassMastery(classroomId)])
      .then(([roster, mastery]) => {
        if (cancelled) return;
        const insights = mastery.data ? buildClassInsights(mastery.data).students : [];
        setRows(toRows(roster.data ?? [], insights, fallback, hasPro));
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [classroomId, t, hasPro]);

  if (!rows || rows.length === 0) return null;

  const report = `/${language}/teacher/reports?classroomId=${classroomId}`;
  const hidden = rows.length - VISIBLE;
  const anyPlayed = rows.some((row) => row.status !== 'notYet');

  return (
    <section
      data-testid="roster-status"
      aria-label={t('eg2Polish.classes.rosterTitle')}
      className="rounded-neo border-2 border-black bg-neo-white px-3 py-2 font-neo-body text-sm text-black shadow-hard-sm"
    >
      <h3 className="mb-1 font-neo-display text-[0.65rem] font-black uppercase tracking-wide text-black/60">
        {t('eg2Polish.classes.rosterTitle')}
      </h3>
      <ul className="divide-y divide-black/10">
        {rows.slice(0, VISIBLE).map((row) => (
          <li key={row.id}>
            <RowShell href={canOpenReport ? `${report}&studentId=${row.id}` : null}>
              <span className="flex min-w-0 items-center gap-2">
                <AvatarLite userId={row.id} pixelSize={28} />
                <span className="min-w-0 truncate font-bold" dir="auto">
                  {row.name}
                </span>
              </span>
              {anyPlayed ? (
                <span className={cn('shrink-0 rounded-full border-2 px-2 py-0.5 text-xs font-black tabular-nums', CHIP[row.status])}>
                  {row.status === 'notYet' || row.status === 'played'
                    ? t(`eg2Polish.classes.status.${row.status}`)
                    : t(`eg2Polish.classes.status.${row.status}`, { pct: row.accuracy })}
                </span>
              ) : null}
            </RowShell>
          </li>
        ))}
      </ul>
      {entitlement.loading ? null : (
        <Link
          data-testid="roster-status-report"
          href={report}
          className="mt-1 inline-flex min-h-9 items-center gap-1 text-xs font-black uppercase text-black underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
        >
          {hidden > 0 ? t('eg2Polish.classes.moreInReport', { count: hidden }) : t('eg2Polish.classes.openReport')}
          {canOpenReport ? null : (
            <span className="rounded-full border-2 border-black bg-neo-lime px-1.5 py-px text-[0.6rem] normal-case">
              {t('teacher.subscription.proPlanName')}
            </span>
          )}
          <DirectionalIcon icon={ArrowRight} className="size-3.5" />
        </Link>
      )}
    </section>
  );
}

const ROW = 'flex min-h-9 items-center justify-between gap-2 rounded-sm py-1';

function RowShell({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) return <div data-testid="roster-status-row" className={ROW}>{children}</div>;
  return (
    <Link
      data-testid="roster-status-row"
      href={href}
      className={cn(ROW, 'hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan')}
    >
      {children}
    </Link>
  );
}

export default ClassRosterStatus;
