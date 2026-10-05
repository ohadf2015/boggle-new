'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  applyActivationPatch,
  EMPTY_TEACHER_ACTIVATION_PROGRESS,
  type TeacherActivationPatch,
  type TeacherActivationProgress,
} from '@/lib/education/teacherActivationProgress';

async function readProgress(): Promise<TeacherActivationProgress> {
  try {
    const res = await fetch('/api/education/teacher/activation', { cache: 'no-store' });
    if (!res.ok) return { ...EMPTY_TEACHER_ACTIVATION_PROGRESS };
    const body = (await res.json()) as Partial<TeacherActivationProgress>;
    return {
      inviteCopied: body.inviteCopied === true,
      liveStarted: body.liveStarted === true,
      dismissed: body.dismissed === true,
    };
  } catch {
    return { ...EMPTY_TEACHER_ACTIVATION_PROGRESS };
  }
}

async function writeProgress(patch: TeacherActivationPatch): Promise<void> {
  try {
    await fetch('/api/education/teacher/activation', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  } catch {
    /* session-local optimistic state still holds */
  }
}

export function useTeacherActivationProgress() {
  const [progress, setProgress] = useState<TeacherActivationProgress>(
    EMPTY_TEACHER_ACTIVATION_PROGRESS,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readProgress().then((next) => {
      if (cancelled) return;
      setProgress(next);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = useCallback((partial: TeacherActivationPatch) => {
    setProgress((current) => applyActivationPatch(current, partial));
    void writeProgress(partial);
  }, []);

  return {
    progress,
    ready,
    markInviteCopied: () => patch({ inviteCopied: true }),
    markLiveStarted: () => patch({ liveStarted: true }),
    dismiss: () => patch({ dismissed: true }),
  };
}
