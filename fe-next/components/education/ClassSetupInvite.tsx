'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { getClassroom } from '@/lib/supabase/education/classrooms';
import { createdClassroom } from '@/lib/education/createdClassroomHandoff';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherActivationProgress } from '@/hooks/useTeacherActivationProgress';
import { PageLoader } from '@/components/ui/PageLoader';
import { classroomJoinUrl } from '@/lib/education/classroomInvitePayload';
import { trackEduFirstStudentJoined, trackEduJoinCodeCopied, trackEduJoinCodeShared, trackEduJoinCodeShown } from '@/lib/education/telemetry';
import { trackFirstRoundGuideClicked, trackFirstRoundGuideShown } from '@/lib/education/firstRoundGuideTelemetry';
import { captureTeacherOnboardingFunnel, TEACHER_ONBOARDING_FUNNEL_EVENTS, teacherFunnelPlan } from '@/lib/education/teacherOnboardingFunnel';
import { shareWithFallback } from '@/utils/shareWithFallback';
import { cn } from '@/lib/utils';
import { useClassRoster } from '@/components/teacher/hq/useClassRoster';
import { HqProjectorSheet } from '@/components/teacher/hq/HqProjectorSheet';
import { RehearseWithBotsButton } from '@/components/teacher/home/RehearseWithBotsButton';
import { PANEL, SECONDARY_BUTTON } from '@/components/teacher/home/homeStyles';
import { writeQuickLaunchIntent } from '@/components/teacher/dashboard/quickLaunchIntent';
import { ResultsTeacherProTrialCard, CLASS_CREATED_TRIAL_PLACEMENT } from '@/components/education/results/ResultsTeacherProTrialCard';
import type { InviteChannel } from './ClassSetupInviteCode';
import { ClassSetupInviteView } from './ClassSetupInviteView';
import { firstStudentSeen, inviteStartTarget } from './lobby/inviteLinks';

type T = (key: string, params?: Record<string, string | number>) => string;

const JOIN_POLL_MS = 5_000;

export interface ClassSetupInviteProps {
  classroomId: string;
  /** Starter pack picked on the details step; Start then runs it on this class. */
  packKey?: string | null;
}

/** The one "get students in" moment after a class is made: code, QR, every share channel, and names landing live. */
export function ClassSetupInvite({ classroomId, packKey }: ClassSetupInviteProps) {
  const { t: rawT, language } = useLanguage();
  const t = rawT as T;
  const { classrooms, isLoading } = useClassrooms();
  const listed = classrooms.find((c) => c.id === classroomId);
  // The form hands over the row it just made; the list read can be stale (see createdClassroomHandoff).
  const handed = createdClassroom(classroomId);
  const lookup = useClassroomLookup(classroomId, !isLoading && !listed?.join_code && !handed);
  const classroom = listed?.join_code ? listed : (handed ?? lookup.classroom);

  if (!classroom?.join_code && (isLoading || lookup.pending)) return <PageLoader text={t('teacher.classroom.settingUp')} size="lg" nested />;
  if (!classroom?.join_code) {
    return (
      <div role="alert" className={cn(PANEL, 'mx-auto my-6 flex max-w-md flex-col items-center gap-3 p-6 text-center')}>
        <p className="font-neo-display text-lg font-bold text-neo-cream">{t('education.classroomGame.classroomNotFound')}</p>
        <Link href={`/${language}/teacher/classroom`} className={cn(SECONDARY_BUTTON, 'w-full')}>
          {t('eduShell.home.yourClasses')}
        </Link>
      </div>
    );
  }
  return <InviteReady classroom={{ id: classroom.id, name: classroom.name, join_code: classroom.join_code }} packKey={packKey ?? null} t={t} language={language} />;
}

/** Last resort before "not found": read this one class by id, fresh, once. */
function useClassroomLookup(classroomId: string, enabled: boolean): { pending: boolean; classroom: { id: string; name: string; join_code: string } | null } {
  const [state, setState] = useState<{ pending: boolean; classroom: { id: string; name: string; join_code: string } | null; done: boolean }>({ pending: false, classroom: null, done: false });
  useEffect(() => {
    if (!enabled || state.done) return;
    let live = true;
    setState((s) => ({ ...s, pending: true }));
    void getClassroom(classroomId)
      .then(({ data }) => {
        if (!live) return;
        setState({ pending: false, done: true, classroom: data?.join_code ? { id: data.id, name: data.name, join_code: data.join_code } : null });
      })
      .catch(() => live && setState({ pending: false, done: true, classroom: null }));
    return () => {
      live = false;
    };
  }, [classroomId, enabled, state.done]);
  return { pending: enabled && !state.done, classroom: state.classroom };
}

interface InviteReadyProps {
  classroom: { id: string; name: string; join_code: string };
  packKey: string | null;
  t: T;
  language: string;
}

function InviteReady({ classroom, packKey, t, language }: InviteReadyProps) {
  const { hasPro, status, loading: proLoading } = useTeacherPro();
  const { markInviteCopied } = useTeacherActivationProgress();
  const { playPlayerJoinedSound } = useSoundEffects();
  const reduced = useReducedMotion() ?? false;
  const [origin, setOrigin] = useState('');
  const [projectorOpen, setProjectorOpen] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);

  const roster = useClassRoster(classroom.id, t('teacher.classrooms.students.unknown'), JOIN_POLL_MS);
  const joined = roster.loading ? null : roster.students.length;

  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    document.getElementById('setup-ready-title')?.focus({ preventScroll: true });
    markInviteCopied();
    trackEduJoinCodeShown({ classroomId: classroom.id });
    trackFirstRoundGuideShown({ surface: 'class_ready', locale: language });
  }, [markInviteCopied, classroom.id, language]);

  const lastCount = useRef<number | null>(null);
  useEffect(() => {
    if (joined === null) return;
    const prev = lastCount.current;
    lastCount.current = joined;
    if (!firstStudentSeen(prev, joined)) return;
    trackEduFirstStudentJoined({ classroomId: classroom.id });
    captureTeacherOnboardingFunnel(TEACHER_ONBOARDING_FUNNEL_EVENTS.studentJoined, {
      locale: language,
      plan: teacherFunnelPlan({ hasPro, status, loading: proLoading }),
    });
  }, [joined, classroom.id, language, hasPro, status, proLoading]);

  useEffect(() => {
    if (roster.arrivals.length > 0) playPlayerJoinedSound?.();
  }, [roster.arrivals, playPlayerJoinedSound]);

  const share = useCallback(
    async (channel: InviteChannel, payload: { url: string; text: string }) => {
      if (channel === 'whatsapp' || channel === 'google_classroom') {
        trackEduJoinCodeShared({ classroomId: classroom.id, method: channel });
        return;
      }
      if (channel === 'copy') {
        try {
          await navigator.clipboard.writeText(payload.url);
          toast.success(t('eduShell.setup.copied'));
          trackEduJoinCodeCopied({ classroomId: classroom.id });
        } catch {
          toast.error(t('eduShell.setup.copyFailed'));
        }
        return;
      }
      const result = await shareWithFallback({ title: classroom.name, text: payload.text, url: payload.url, clipboardText: payload.url });
      if (result === 'shared') trackEduJoinCodeShared({ classroomId: classroom.id, method: 'native' });
      if (result === 'copied') {
        trackEduJoinCodeShared({ classroomId: classroom.id, method: 'copy_fallback' });
        toast.success(t('eduShell.setup.copied'));
      }
      if (result === 'failed') toast.error(t('eduShell.setup.copyFailed'));
    },
    [classroom.id, classroom.name, t],
  );

  const joinUrl = origin ? classroomJoinUrl(origin, language, classroom.join_code) : '';
  const displayHost = origin ? `${origin.replace(/^https?:\/\//, '')}/${language}/join` : '';
  const start = inviteStartTarget({ locale: language, classroomId: classroom.id, packKey });
  const onStart = () => {
    if (start.intent) writeQuickLaunchIntent({ ...start.intent, title: t(start.intent.packKey ?? '') });
    trackFirstRoundGuideClicked({ surface: 'class_ready', locale: language, step: 'start_round' });
  };

  return (
    <>
      <ClassSetupInviteView
        classroom={classroom}
        roster={roster}
        joinUrl={joinUrl}
        displayHost={displayHost}
        startHref={start.href}
        homeHref={`/${language}/teacher`}
        reduced={reduced}
        onShare={(c, p) => void share(c, p)}
        onOpenProjector={() => setProjectorOpen(true)}
        onStart={onStart}
        rehearse={
          <RehearseWithBotsButton
            classroomId={classroom.id}
            source="class"
            language={language}
            t={t}
            withSeat
            label={t('eduShell.home.practice.cta')}
            onStart={() => trackFirstRoundGuideClicked({ surface: 'class_ready', locale: language, step: 'practice_bots' })}
          />
        }
        footer={<ResultsTeacherProTrialCard language={language} placement={CLASS_CREATED_TRIAL_PLACEMENT} className="w-full text-start lg:col-span-2 lg:mx-auto lg:max-w-xl" />}
        t={t}
      />
      {projectorOpen ? <HqProjectorSheet classroom={classroom} onClose={() => setProjectorOpen(false)} /> : null}
    </>
  );
}

export default ClassSetupInvite;
