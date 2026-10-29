'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getLessons } from '@/lib/supabase/education';
import { QUICK_LAUNCH_FLOW, writeQuickLaunchIntent } from '@/components/teacher/dashboard/quickLaunchIntent';
import { writeRehearseIntent } from '@/lib/education/rehearsal';
import { buildRehearsalLaunch } from '@/lib/education/rehearsalLaunch';
import { QUIET_LINK } from './homeStyles';

// Fail open to the starter pack: a slow list lookup must not hold the teacher on a spinner.
const LESSON_LOOKUP_CAP_MS = 2000;

type T = (key: string, params?: Record<string, string | number>) => string;

export interface RehearseWithBotsButtonProps {
  /** Undefined when the teacher has no class yet: the launch makes the default one. */
  classroomId: string | undefined;
  source: 'hq' | 'class';
  language: string;
  t: T;
  showNote?: boolean;
  className?: string;
  /** Fired on press, before the launch (telemetry hook). */
  onStart?: () => void;
}

export function RehearseWithBotsButton({ classroomId, source, language, t, showNote = false, className, onStart }: RehearseWithBotsButtonProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [pending, setPending] = useState(false);

  const rehearse = async () => {
    if (pending) return;
    onStart?.();
    setPending(true);
    type Lessons = Awaited<ReturnType<typeof getLessons>>['data'];
    let lessons: Lessons = [];
    if (user) {
      const capped = new Promise<Lessons>((resolve) => setTimeout(() => resolve([]), LESSON_LOOKUP_CAP_MS));
      lessons = await Promise.race([getLessons(user.id).then((r) => r.data ?? []), capped]).catch(() => []);
    }
    writeQuickLaunchIntent(buildRehearsalLaunch({ lessons, uiLanguage: language, classroomId, packName: (key) => t(key) }));
    writeRehearseIntent({ source, classExists: !!classroomId });
    router.push(`/${language}/education/classroom-game?flow=${QUICK_LAUNCH_FLOW}`);
  };

  return (
    <div className={cn('flex flex-col items-start gap-0.5', className)}>
      <button
        type="button"
        data-testid="rehearse-with-bots"
        onClick={() => void rehearse()}
        disabled={pending}
        aria-busy={pending || undefined}
        title={showNote ? undefined : t('education.projectorLobby.rehearsePrivate')}
        className={QUIET_LINK}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <Bot className="size-4" aria-hidden="true" />
        )}
        {t('education.projectorLobby.rehearseCta')}
      </button>
      {showNote ? (
        <p className="px-2 font-neo-body text-xs font-semibold text-neo-cream/60">{t('education.projectorLobby.rehearsePrivate')}</p>
      ) : null}
    </div>
  );
}

export default RehearseWithBotsButton;
