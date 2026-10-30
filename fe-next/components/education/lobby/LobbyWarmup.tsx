'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Send, Zap } from 'lucide-react';
import posthog from '@/lib/analytics/lazyPosthog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAssignments } from '@/hooks/useAssignments';
import { isAssignmentLimitError } from '@/lib/education/assignmentLimit';
import { getClassroomAssignments } from '@/lib/supabase/education/assignments';
import { trackEduFirstAssignmentCreated } from '@/lib/education/telemetry';
import { localDayPlus } from '@/components/teacher/assignments/AssignmentCreatorDueDate';
import { cn } from '@/lib/utils';

export interface LobbyWarmupArgs {
  classroomId: string | null;
  lessonId: string | null;
  teacherId: string | null;
  source: 'lobby' | 'class_ready' | 'home';
}

type SendState = 'idle' | 'sending' | 'capped' | 'failed';

/** "Warm up, then play live": send the picked list as practice homework, and count who has practised it. */
export function useLobbyWarmup({ classroomId, lessonId, teacherId, source }: LobbyWarmupArgs) {
  const { assignments, isLoading, error, createAssignment, refresh } = useAssignments(classroomId || null);
  const [sendState, setSendState] = useState<SendState>('idle');
  // Offer Send only after this class's list has loaded cleanly: an empty list before that would re-send real homework.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const sawLoading = useRef<string | null>(null);
  useEffect(() => {
    if (isLoading) sawLoading.current = classroomId;
    else if (sawLoading.current === classroomId && !error) setLoadedFor(classroomId);
  }, [isLoading, error, classroomId]);
  // An existing assignment of this list is reused as-is: re-sending would reset the teacher's due date and focus.
  const existing = lessonId ? assignments.find((a) => a.lesson_id === lessonId) ?? null : null;

  const send = useCallback(async () => {
    if (!classroomId || !lessonId || !teacherId || existing || sendState === 'sending') return;
    setSendState('sending');
    const fresh = await getClassroomAssignments(classroomId);
    if (fresh.error || fresh.data.some((a) => a.lesson_id === lessonId)) {
      setSendState(fresh.error ? 'failed' : 'idle');
      void refresh();
      return;
    }
    const firstForClass = fresh.data.length === 0;
    const result = await createAssignment({
      classroom_id: classroomId,
      lesson_id: lessonId,
      teacher_id: teacherId,
      assignment_type: 'practice',
      due_date: localDayPlus(1),
      practice_focus: null,
    });
    if (result.success) {
      setSendState('idle');
      posthog.capture('teacher_warmup_sent', { classroom_id: classroomId, lesson_id: lessonId, source });
      if (firstForClass) trackEduFirstAssignmentCreated({ classroomId });
      void refresh();
    } else {
      setSendState(isAssignmentLimitError(result.error) ? 'capped' : 'failed');
    }
  }, [classroomId, lessonId, teacherId, existing, sendState, createAssignment, refresh, source]);

  return {
    active: !!classroomId && !!lessonId && !!teacherId && !isLoading && loadedFor === classroomId,
    sent: existing ? { done: existing.completion_count ?? 0, total: existing.student_count ?? 0 } : null,
    sendState,
    send,
    refresh,
  };
}

export type LobbyWarmupState = ReturnType<typeof useLobbyWarmup>;

/** One quiet tap under the word list; it never blocks GO LIVE. */
export function LobbyWarmupButton({ warmup, className }: { warmup: LobbyWarmupState; className?: string }) {
  const { t } = useLanguage();
  if (!warmup.active || warmup.sent) return null;
  if (warmup.sendState === 'capped') {
    return (
      <p data-testid="lobby-warmup-capped" className={cn('font-neo-body text-xs font-bold text-neo-cream/75', className)}>
        {t('eduShell.warmup.capped', 'Free plan homework limit reached. Pro sends unlimited warm-ups.')}
      </p>
    );
  }
  return (
    <button
      type="button"
      data-testid="lobby-warmup-send"
      disabled={warmup.sendState === 'sending'}
      onClick={() => void warmup.send()}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-neo border-2 border-neo-cream/35 px-3 font-neo-body text-sm font-bold text-neo-cream/85',
        'transition-colors hover:border-neo-cream/60 hover:text-neo-cream disabled:opacity-60',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
        className
      )}
    >
      <Send className="size-4 shrink-0 rtl:-scale-x-100" strokeWidth={3} aria-hidden="true" />
      {warmup.sendState === 'failed'
        ? t('eduShell.warmup.retry', 'Could not send. Try again')
        : t('eduShell.warmup.send', 'Send a warm-up to students')}
    </button>
  );
}

/** "N of M students warmed up" once the list is out as homework. */
export function LobbyWarmupStatus({ warmup, className }: { warmup: LobbyWarmupState; className?: string }) {
  const { t } = useLanguage();
  if (!warmup.active || !warmup.sent) return null;
  const { done, total } = warmup.sent;
  const all = total > 0 && done >= total;
  return (
    <p
      data-testid="lobby-warmup-status"
      role="status"
      className={cn('flex items-center gap-1.5 font-neo-body text-sm font-bold text-neo-cream/85', className)}
    >
      {all ? <Check className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" /> : <Zap className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />}
      {total === 0
        ? t('eduShell.warmup.sent', 'Warm-up sent')
        : t('eduShell.warmup.status', '{done} of {total} students warmed up', { done, total })}
    </p>
  );
}
