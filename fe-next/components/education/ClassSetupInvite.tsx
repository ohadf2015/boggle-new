'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useReducedMotion } from 'framer-motion';
import { MonitorPlay, Play, UsersRound } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherActivationProgress } from '@/hooks/useTeacherActivationProgress';
import { PageLoader } from '@/components/ui/PageLoader';
import { EduMascot } from '@/components/education/EduMascot';
import { classroomJoinUrl } from '@/lib/education/classroomInvitePayload';
import { trackEduFirstStudentJoined, trackEduJoinCodeCopied, trackEduJoinCodeShared, trackEduJoinCodeShown } from '@/lib/education/telemetry';
import { trackFirstRoundGuideClicked, trackFirstRoundGuideShown } from '@/lib/education/firstRoundGuideTelemetry';
import { captureTeacherOnboardingFunnel, TEACHER_ONBOARDING_FUNNEL_EVENTS, teacherFunnelPlan } from '@/lib/education/teacherOnboardingFunnel';
import { shareWithFallback } from '@/utils/shareWithFallback';
import { cn } from '@/lib/utils';
import { useClassRoster } from '@/components/teacher/hq/useClassRoster';
import { RosterSeats } from '@/components/teacher/hq/RosterSeats';
import { HqProjectorSheet } from '@/components/teacher/hq/HqProjectorSheet';
import { RehearseWithBotsButton } from '@/components/teacher/home/RehearseWithBotsButton';
import { PANEL, PRIMARY_BUTTON, QUIET_LINK, SECONDARY_BUTTON } from '@/components/teacher/home/homeStyles';
import { writeQuickLaunchIntent } from '@/components/teacher/dashboard/quickLaunchIntent';
import { ResultsTeacherProTrialCard, CLASS_CREATED_TRIAL_PLACEMENT } from '@/components/education/results/ResultsTeacherProTrialCard';
import { ClassSetupInviteCode, type InviteChannel } from './ClassSetupInviteCode';
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
  const classroom = classrooms.find((c) => c.id === classroomId);

  if (isLoading) return <PageLoader text={t('teacher.classroom.settingUp')} size="lg" nested />;
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
  const studentsIn = (joined ?? 0) > 0;

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
  const joinedLabel =
    joined === null ? '…' : joined === 0 ? t('eduShell.setup.joinedNone') : joined === 1 ? t('eduShell.setup.joinedOne') : t('eduShell.setup.joinedMany', { count: joined });

  return (
    <section
      data-testid="setup-step-ready"
      aria-labelledby="setup-ready-title"
      className="mx-auto grid w-full max-w-xl grid-cols-1 gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-5 lg:max-w-6xl lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-x-8"
    >
      <header className="flex items-center gap-3 lg:col-span-2">
        <EduMascot moment="success" size={96} className="size-14 shrink-0 sm:size-20" />
        <div className="min-w-0">
          <h1 id="setup-ready-title" tabIndex={-1} style={{ outline: 'none' }} className="font-neo-display text-2xl font-black leading-tight text-neo-cream sm:text-4xl">
            {t('eduShell.setup.readyTitle')}
          </h1>
          <p dir="auto" className="truncate font-neo-body text-base font-semibold text-neo-cream/80">
            {classroom.name}
          </p>
        </div>
      </header>

      <ClassSetupInviteCode code={classroom.join_code} className={classroom.name} joinUrl={joinUrl} displayHost={displayHost} onShare={(c, p) => void share(c, p)} t={t} />

      <div className="flex min-w-0 flex-col gap-3">
        <div data-testid="invite-roster" className={cn(PANEL, 'flex flex-col gap-3 p-3 sm:p-4')}>
          <p data-testid="setup-joined-count" aria-live="polite" className="inline-flex items-center gap-2 font-neo-display text-lg font-bold text-neo-cream">
            <UsersRound className={cn('size-5 shrink-0', studentsIn ? 'text-neo-lime' : 'text-neo-cream/70')} aria-hidden="true" />
            {joinedLabel}
          </p>
          <RosterSeats students={roster.students} arrivals={roster.arrivals} seats={5} size={40} reduced={reduced} showNames className="min-h-[64px]" />
          <p className="font-neo-body text-sm text-neo-cream/75">{t('eduShell.setup.noAccount')}</p>
        </div>

        <button
          type="button"
          data-testid="setup-projector"
          data-hero={studentsIn ? 'false' : 'true'}
          onClick={() => setProjectorOpen(true)}
          className={cn(studentsIn ? SECONDARY_BUTTON : PRIMARY_BUTTON, 'w-full', !studentsIn && 'min-h-14 text-xl')}
        >
          <MonitorPlay className={studentsIn ? 'size-5' : 'size-6'} aria-hidden="true" />
          {t('eduShell.setup.showProjector')}
        </button>
        <Link
          href={start.href}
          data-testid="setup-start-game"
          data-hero={studentsIn ? 'true' : 'false'}
          onClick={onStart}
          className={cn(studentsIn ? PRIMARY_BUTTON : SECONDARY_BUTTON, 'w-full', studentsIn && 'min-h-14 text-xl')}
        >
          <Play className={cn(studentsIn ? 'size-6' : 'size-5', 'fill-current')} aria-hidden="true" />
          {t(studentsIn ? 'eduShell.setup.startQuick' : 'eduShell.setup.firstRound.start')}
        </Link>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {studentsIn ? null : (
            <RehearseWithBotsButton
              classroomId={classroom.id}
              source="class"
              language={language}
              t={t}
              onStart={() => trackFirstRoundGuideClicked({ surface: 'class_ready', locale: language, step: 'practice_bots' })}
            />
          )}
          <Link href={`/${language}/teacher`} className={QUIET_LINK}>
            {t('eduShell.setup.backHome')}
          </Link>
        </div>
      </div>

      <ResultsTeacherProTrialCard language={language} placement={CLASS_CREATED_TRIAL_PLACEMENT} className="w-full text-start lg:col-span-2 lg:mx-auto lg:max-w-xl" />
      {projectorOpen ? <HqProjectorSheet classroom={classroom} onClose={() => setProjectorOpen(false)} /> : null}
    </section>
  );
}

export default ClassSetupInvite;
