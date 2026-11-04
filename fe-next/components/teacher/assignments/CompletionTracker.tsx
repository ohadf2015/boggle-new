'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAssignmentCompletions } from '@/lib/supabase/education/assignments';
import { getClassroomStudents } from '@/lib/supabase/education/classrooms';
import { teacherFacingName } from '@/lib/education/rosterName';
import {
  buildAssignmentResults,
  type AssignmentResults,
  type AssignmentResultsRow,
  type AssignmentRosterEntry,
} from '@/lib/education/assignmentCompletionResults';
import { Loader } from '@/components/ui/Loader';
import { AssignmentResultsView } from './AssignmentResultsView';

interface StudentRosterEntry {
  student_id: string;
  display_name: string;
}

interface CompletionTrackerProps {
  assignmentId: string;
  totalStudents: number;
  classroomId?: string;
  classroomName?: string;
  studentRoster?: StudentRosterEntry[];
}

type State = { kind: 'loading' } | { kind: 'failed' } | { kind: 'ready'; results: AssignmentResults };

async function loadRoster(
  classroomId: string | undefined,
  studentRoster: StudentRosterEntry[] | undefined,
  fallbackName: string,
): Promise<AssignmentRosterEntry[]> {
  if (studentRoster) return studentRoster.map((s) => ({ studentId: s.student_id, name: s.display_name }));
  if (!classroomId) return [];
  // A roster that fails to load still leaves the results readable, named from each player's profile.
  const { data, error } = await getClassroomStudents(classroomId).catch(() => ({ data: [], error: { message: 'roster' } }));
  if (error) return [];
  return (data ?? []).map((s) => {
    return { studentId: s.student_id, name: teacherFacingName(s.roster_name, s.profiles, fallbackName) };
  });
}

export default function CompletionTracker({
  assignmentId,
  totalStudents,
  classroomId,
  classroomName = '',
  studentRoster,
}: CompletionTrackerProps) {
  const { t } = useLanguage();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const latest = useRef({ t, studentRoster });
  useEffect(() => {
    latest.current = { t, studentRoster };
  });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    const { t: tr } = latest.current;
    Promise.all([getAssignmentCompletions(assignmentId), loadRoster(classroomId, latest.current.studentRoster, tr('teacher.completion.student'))])
      .then(([completions, roster]) => {
        if (cancelled) return;
        if (completions.error) return setState({ kind: 'failed' });
        const results = buildAssignmentResults({
          rows: (completions.data ?? []) as AssignmentResultsRow[],
          roster,
          fallbackName: tr('teacher.completion.student'),
        });
        setState({ kind: 'ready', results: { ...results, total: Math.max(results.total, totalStudents) } });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'failed' });
      });
    return () => {
      cancelled = true;
    };
  }, [assignmentId, classroomId, totalStudents, attempt]);

  if (state.kind === 'loading') {
    return (
      <div className="flex justify-center py-6">
        <Loader size="sm" />
      </div>
    );
  }

  if (state.kind === 'failed') {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-neo border-2 border-neo-pink bg-neo-pink/10 p-3">
        <p className="flex-1 font-neo-body text-sm font-bold text-neo-white">{t('teacher.completion.loadFailed')}</p>
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="min-h-11 rounded-neo border-2 border-black bg-neo-cream px-4 font-neo-body text-sm font-bold text-neo-black shadow-hard-sm active:translate-y-px focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return <AssignmentResultsView results={state.results} classroomId={classroomId} classroomName={classroomName} />;
}
