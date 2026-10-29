'use client';

import { useEffect, useRef, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { QuickLaunchStage } from '@/components/teacher/hq/QuickLaunchStage';
import { getClassrooms, getLesson, createLesson } from '@/lib/supabase/education';
import { trackEduClassroomCreated } from '@/lib/education/telemetry';
import type { Classroom, Language } from '@/lib/supabase/education/types';
import type { QuickLaunchIntent } from '@/components/teacher/dashboard/quickLaunchIntent';
import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';
import logger from '@/utils/logger';
import { provisionQuickLaunch, type QuickLaunchFailure, type QuickLaunchProvision, type QuickLaunchProvisionDeps } from './quickLaunchProvision';

export const PROVISION_TIMEOUT_MS = 20_000;

export interface QuickLaunchReady {
  classroomId: string;
  lessonId: string;
  mode: ClassroomGameMode;
}

// Keyed by intent + attempt so a double mount shares one run: provisioning creates rows.
const runs = new Map<string, Promise<QuickLaunchProvision>>();

export function resetProvisionsForTest(): void {
  runs.clear();
}

function provisionOnce(key: string, deps: QuickLaunchProvisionDeps, intent: QuickLaunchIntent): Promise<QuickLaunchProvision> {
  const existing = runs.get(key);
  if (existing) return existing;
  let step: QuickLaunchFailure['code'] = 'classroom';
  const work = provisionQuickLaunch({ ...deps, onStep: (s) => { step = s; } }, intent).catch(
    (err): QuickLaunchProvision => ({ ok: false, failure: { code: step, reason: String(err) } })
  );
  const timeout = new Promise<QuickLaunchProvision>((resolve) => {
    setTimeout(() => resolve({ ok: false, failure: { code: step, reason: 'TIMEOUT' } }), PROVISION_TIMEOUT_MS);
  });
  const run = Promise.race([work, timeout]);
  runs.set(key, run);
  return run;
}

export interface QuickLaunchProvisionerProps {
  intent: QuickLaunchIntent;
  onReady: (ready: QuickLaunchReady) => void;
  onOpenFullSetup: () => void;
}

/** Makes whatever a one-tap launch is missing (a first class, a list from a pack or a paste), then hands over to the lobby. */
export function QuickLaunchProvisioner({ intent, onReady, onOpenFullSetup }: QuickLaunchProvisionerProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState<QuickLaunchFailure | null>(null);
  const userId = user?.id;
  const latest = useRef({ onReady, defaultClassName: t('teacher.playNow.defaultClassName'), language });
  latest.current = { onReady, defaultClassName: t('teacher.playNow.defaultClassName'), language };

  useEffect(() => {
    if (!userId) return;
    let live = true;
    const deps: QuickLaunchProvisionDeps = {
      defaultClassName: latest.current.defaultClassName,
      uiLanguage: latest.current.language,
      listClassrooms: async () => ((await getClassrooms(userId)).data || []) as Classroom[],
      createClassroom: async (name, lang) => {
        try {
          const res = await fetch('/api/education/classroom/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, language: lang }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) return { success: false, error: body?.message, code: body?.error };
          if (body?.data?.id) trackEduClassroomCreated({ classroomId: body.data.id, createdVia: 'express_lobby' });
          return { success: true, data: body?.data as Classroom };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      },
      getLessonById: async (id) => (await getLesson(id)).data,
      createLesson: async (input) =>
        createLesson({
          teacher_id: userId,
          classroom_id: null,
          name: input.name,
          description: input.description || '',
          language: input.language as Language,
          words: input.words,
          is_public: false,
          source_game_code: null,
        }),
    };
    void provisionOnce(`${intent.createdAt}:${attempt}`, deps, intent).then((result) => {
      if (!live) return;
      if (result.ok) {
        latest.current.onReady({ classroomId: result.classroomId, lessonId: result.lessonId, mode: result.mode });
        return;
      }
      logger.error('Quick launch provisioning failed:', result.failure.code, result.failure.reason || '');
      setFailure(result.failure);
    });
    return () => {
      live = false;
    };
  }, [userId, intent, attempt]);

  if (!failure) return <QuickLaunchStage />;

  return (
    <div
      data-testid="quick-launch-failure"
      role="alert"
      className="m-auto w-full max-w-lg rounded-neo-lg border-4 border-neo-red bg-neo-cream p-6 text-center shadow-hard-lg"
    >
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-neo border-3 border-neo-black bg-neo-red shadow-hard-sm">
        <TriangleAlert className="size-7 text-neo-black" strokeWidth={3} aria-hidden="true" />
      </div>
      <p className="font-neo-display text-xl font-black text-neo-black text-balance">{t(`teacher.playNow.failure.${failure.code}`)}</p>
      <p className="mt-1 font-neo-body text-sm font-bold text-neo-black/70 text-pretty">{t('teacher.playNow.failureHint')}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          data-testid="quick-launch-retry"
          onClick={() => {
            setFailure(null);
            setAttempt((n) => n + 1);
          }}
          className="inline-flex min-h-11 items-center rounded-neo border-3 border-neo-black bg-neo-lime px-6 py-2.5 font-neo-display font-black uppercase text-neo-black shadow-hard transition-transform active:translate-y-0.5"
        >
          {t('teacher.playNow.retry')}
        </button>
        <button
          type="button"
          data-testid="quick-launch-open-full-setup"
          onClick={onOpenFullSetup}
          className="inline-flex min-h-11 items-center rounded-neo border-3 border-neo-black bg-neo-cyan px-6 py-2.5 font-neo-display font-black uppercase text-neo-black shadow-hard-sm transition-transform active:translate-y-0.5"
        >
          {t('teacher.playNow.openFullSetup')}
        </button>
      </div>
    </div>
  );
}

export default QuickLaunchProvisioner;
