'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import {
  fetchWaitingInputs,
  waitingNudge,
  type WaitingClient,
  type WaitingNudge as WaitingNudgeModel,
} from '@/lib/education/waitingStudents';
import { cn } from '@/lib/utils';

type T = (key: string, params?: Record<string, string | number>) => string;

const POLL_MS = 30_000;

export function WaitingStudentsNudge({
  classroomIds,
  selectedId,
  language,
  t,
  nowMs,
}: {
  classroomIds: readonly string[];
  selectedId: string;
  language: string;
  t: T;
  nowMs?: number;
}) {
  const idsKey = [...classroomIds].sort().join(',');
  const [nudge, setNudge] = useState<WaitingNudgeModel | null>(null);

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : [];
    if (ids.length === 0) {
      setNudge(null);
      return;
    }
    let cancelled = false;
    const load = () => {
      const now = nowMs ?? Date.now();
      fetchWaitingInputs(supabase as unknown as WaitingClient, ids, now)
        .then((inputs) => {
          if (cancelled) return;
          setNudge(waitingNudge({ ...inputs, now, preferId: selectedId || undefined }));
        })
        .catch(() => {
          if (!cancelled) setNudge(null);
        });
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [idsKey, selectedId, nowMs]);

  if (!nudge) return null;
  const label =
    nudge.count === 1
      ? t('eduShell.home.waitingNudgeOne')
      : t('eduShell.home.waitingNudge', { count: nudge.count });

  return (
    <Link
      href={teacherHostHref(language, { classroomId: nudge.classroomId })}
      data-testid="waiting-students-nudge"
      className={cn(
        'flex min-h-14 w-full items-center justify-center rounded-neo border-3 border-neo-black bg-neo-yellow px-4 py-3 text-center font-neo-display text-lg font-black uppercase leading-tight text-neo-navy shadow-hard [overflow-wrap:anywhere]',
        'focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-neo-cyan',
      )}
    >
      {label}
    </Link>
  );
}
