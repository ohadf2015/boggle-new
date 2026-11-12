'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { useClassrooms } from '@/hooks/useClassroom';
import { getClassroom } from '@/lib/supabase/education/classrooms';
import { getLesson } from '@/lib/supabase/education/lessons';
import { countClassroomsLessonAssignments } from '@/lib/supabase/education/assignments';
import { createdClassroom } from '@/lib/education/createdClassroomHandoff';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherActivationProgress } from '@/hooks/useTeacherActivationProgress';
import { PageLoader } from '@/components/ui/PageLoader';
import { classroomJoinUrl, inviteLocale, joinAddressForDisplay } from '@/lib/education/classroomInvitePayload';
import { trackEduFirstStudentJoined, trackEduJoinCodeShown } from '@/lib/education/telemetry';
import { trackFirstRoundGuideClicked, trackFirstRoundGuideShown } from '@/lib/education/firstRoundGuideTelemetry';
import { captureTeacherOnboardingFunnel, TEACHER_ONBOARDING_FUNNEL_EVENTS, teacherFunnelPlan } from '@/lib/education/teacherOnboardingFunnel';
import { cn } from '@/lib/utils';
import { useClassRoster } from '@/components/teacher/hq/useClassRoster';
import { HqProjectorSheet } from '@/components/teacher/hq/HqProjectorSheet';
import { RehearseWithBotsButton } from '@/components/teacher/home/RehearseWithBotsButton';
import { PANEL, SECONDARY_BUTTON } from '@/components/teacher/home/homeStyles';
import { MIN_PASTED_WORDS, QUICK_LAUNCH_FLOW, writeQuickLaunchIntent } from '@/components/teacher/dashboard/quickLaunchIntent';
import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';
import { packsForLanguage, recommendedPack } from '@/components/teacher/setup/starterPackPick';
import { FirstGameWords, PlayNowButton, type FirstGameError } from '@/components/teacher/setup/FirstGameWords';
import { SavedListCard } from '@/components/teacher/setup/SavedListCard';
import { useSavedList } from '@/components/teacher/setup/useSavedList';
import { firstGameIntent, readPasted, sameWords, type FirstGameChoice } from '@/components/teacher/setup/firstGameLaunch';
import { ClassCreatedAsk } from '@/components/education/ClassCreatedAsk';
import { ClassSetupInvitePlan } from '@/components/education/ClassSetupInvitePlan';
import { useInviteShare } from './useInviteShare';
import { ClassSetupInviteView } from './ClassSetupInviteView';
import { firstStudentSeen } from './lobby/inviteLinks';

type T = (key: string, params?: Record<string, string | number>) => string;

const JOIN_POLL_MS = 5_000;

export interface ClassSetupInviteProps {
  classroomId: string;
  packKey?: string | null;
  /** That pack's list, already saved to this class; Play now runs it with no new write. */
  lessonId?: string | null;
}

type ReadyClassroom = { id: string; name: string; join_code: string; language?: string | null };

/** The one "get students in" moment after a class is made: code, QR, every share channel, and names landing live. */
export function ClassSetupInvite({ classroomId, packKey, lessonId }: ClassSetupInviteProps) {
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
  const rowLanguage = 'language' in classroom && typeof classroom.language === 'string' ? classroom.language : null;
  const classLanguage: string = rowLanguage || STARTER_LESSON_PACKS.find((p) => p.nameKey === packKey)?.language || language;
  return (
    <InviteReady
      classroom={{ id: classroom.id, name: classroom.name, join_code: classroom.join_code, language: classLanguage }}
      packKey={packKey ?? null}
      lessonId={lessonId ?? null}
      t={t}
      language={language}
    />
  );
}

/** Last resort before "not found": read this one class by id, fresh, once. */
function useClassroomLookup(classroomId: string, enabled: boolean): { pending: boolean; classroom: ReadyClassroom | null } {
  const [state, setState] = useState<{ pending: boolean; classroom: ReadyClassroom | null; done: boolean }>({ pending: false, classroom: null, done: false });
  useEffect(() => {
    if (!enabled || state.done) return;
    let live = true;
    setState((s) => ({ ...s, pending: true }));
    void getClassroom(classroomId)
      .then(({ data }) => {
        if (!live) return;
        setState({ pending: false, done: true, classroom: data?.join_code ? { id: data.id, name: data.name, join_code: data.join_code, language: data.language } : null });
      })
      .catch(() => live && setState({ pending: false, done: true, classroom: null }));
    return () => {
      live = false;
    };
  }, [classroomId, enabled, state.done]);
  return { pending: enabled && !state.done, classroom: state.classroom };
}

interface InviteReadyProps {
  classroom: { id: string; name: string; join_code: string; language: string };
  packKey: string | null;
  lessonId: string | null;
  t: T;
  language: string;
}

function InviteReady({ classroom, packKey, lessonId, t, language }: InviteReadyProps) {
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

  const share = useInviteShare(classroom, t);

  const joinLocale = inviteLocale(classroom.language, language);
  const joinUrl = origin ? classroomJoinUrl(origin, joinLocale, classroom.join_code) : '';
  const displayHost = origin ? `${joinAddressForDisplay(origin)}/${joinLocale}/join` : '';
  const startHref = `/${language}/education/classroom-game?flow=${QUICK_LAUNCH_FLOW}`;
  const firstGame = useFirstGame({ classroom, packKey, lessonId, t, language });
  const hasWordList = useClassHasWordList(classroom.id, Boolean(lessonId));

  return (
    <>
      <ClassSetupInviteView
        classroom={classroom}
        roster={roster}
        joinUrl={joinUrl}
        displayHost={displayHost}
        startHref={startHref}
        homeHref={`/${language}/teacher`}
        reduced={reduced}
        onShare={(c, p) => void share(c, p)}
        onOpenProjector={() => setProjectorOpen(true)}
        words={firstGame.words}
        play={firstGame.play}
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
        plan={
          <ClassSetupInvitePlan
            classroomId={classroom.id}
            calendar={
              origin && joinUrl
                ? {
                    classroom,
                    joinUrl,
                    origin,
                    language,
                    onSendHomeLink: hasWordList
                      ? () => void share('native', { url: joinUrl, text: t('teacher.classroom.shareInviteText', { name: classroom.name, code: classroom.join_code }) })
                      : undefined,
                  }
                : null
            }
            t={t}
            className="lg:col-span-2 lg:mx-auto lg:w-full lg:max-w-xl"
          />
        }
        footer={
          <ClassCreatedAsk
            language={language}
            href={startHref}
            onStart={() => trackFirstRoundGuideClicked({ surface: 'class_ready', locale: language, step: 'day0_bridge' })}
            className="w-full text-start lg:col-span-2 lg:mx-auto lg:max-w-xl"
          />
        }
        t={t}
      />
      {projectorOpen ? <HqProjectorSheet classroom={classroom} onClose={() => setProjectorOpen(false)} /> : null}
    </>
  );
}

/**
 * True when the class has a word list students can practise. Known at once right after
 * the class is made (lessonId in the URL); a return visit from the calendar Start link or
 * a reminder email carries only classroomId, so read it once. Unknown or failed: false.
 */
function useClassHasWordList(classroomId: string, known: boolean): boolean {
  const [found, setFound] = useState(false);
  useEffect(() => {
    if (known) return;
    let live = true;
    void countClassroomsLessonAssignments([classroomId]).then((count) => {
      if (live) setFound((count ?? 0) > 0);
    });
    return () => {
      live = false;
    };
  }, [classroomId, known]);
  return known || found;
}

async function lessonExists(id: string): Promise<boolean> {
  const { data, error } = await getLesson(id);
  if (error) throw new Error(error.message);
  return Boolean(data);
}

function useFirstGame({ classroom, packKey, lessonId, t, language }: { classroom: InviteReadyProps['classroom']; packKey: string | null; lessonId: string | null; t: T; language: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { createLesson } = useLessons();
  const packs = packsForLanguage(classroom.language);
  const savedPack = packs.find((p) => p.nameKey === packKey) ?? null;
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<string>(() => (savedPack ?? recommendedPack(classroom.language, null)).nameKey);
  const [error, setError] = useState<FirstGameError>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const { words, skipped } = readPasted(text);
  const pack = packs.find((p) => p.nameKey === picked) ?? packs[0];
  const ownLessonId = lessonId && !packKey ? lessonId : null;
  const saved = useSavedList(ownLessonId, t('eduShell.setup.words.title'));
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      inFlight.current = false;
      setBusy(false);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const onPlay = async () => {
    if (inFlight.current) return;
    const blocked: FirstGameError = skipped > 0 && words.length === 0 ? 'phrasesOnly' : words.length > 0 && words.length < MIN_PASTED_WORDS ? 'tooFew' : null;
    if (blocked) {
      setError(blocked);
      box.current?.focus();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    trackFirstRoundGuideClicked({ surface: 'class_ready', locale: language, step: 'start_round' });
    const ownTitle = t('eduShell.setup.words.listName', { date: new Date().toLocaleDateString(language, { month: 'short', day: 'numeric' }) });
    const untouched = saved.status === 'ready' && sameWords(words, saved.words);
    const choice: FirstGameChoice =
      words.length > 0 && !untouched
        ? { kind: 'paste', words }
        : ownLessonId
          ? { kind: 'saved', lessonId: ownLessonId, fallback: pack, fallbackTitle: t(pack.nameKey) }
          : { kind: 'pack', pack, lessonId: savedPack && pack.nameKey === savedPack.nameKey ? lessonId : null };
    const title = choice.kind === 'pack' ? t(pack.nameKey) : ownTitle;
    try {
      const launch = await firstGameIntent({ choice, classroomId: classroom.id, language: classroom.language, title, teacherId: user?.id ?? '', createLesson, lessonExists });
      if (launch.listMissing) toast.error(t('eduShell.setup.words.listMissing'));
      else if (launch.assignFailed) toast.error(t('eduShell.setup.assignFailed'));
      writeQuickLaunchIntent(launch.intent);
      router.push(`/${language}/education/classroom-game?flow=${QUICK_LAUNCH_FLOW}`);
    } catch {
      inFlight.current = false;
      setBusy(false);
      toast.error(t('eduShell.setup.words.playFailed'));
    }
  };

  const savedList = !changing && (saved.status === 'loading' || saved.status === 'ready') ? saved : null;
  return {
    words: savedList ? (
      <SavedListCard
        list={savedList}
        onChangeWords={() => {
          if (saved.status === 'ready') setText(saved.words.join(', '));
          setChanging(true);
          requestAnimationFrame(() => box.current?.focus());
        }}
        t={t}
      />
    ) : (
      <FirstGameWords
        text={text}
        onTextChange={(next) => {
          setText(next);
          setError(null);
        }}
        count={words.length}
        skipped={skipped}
        minWords={MIN_PASTED_WORDS}
        error={error}
        packs={packs}
        packKey={pack.nameKey}
        savedPackKey={lessonId ? savedPack?.nameKey ?? null : null}
        ownListSaved={Boolean(ownLessonId)}
        onPackChange={setPicked}
        textareaRef={box}
        t={t}
      />
    ),
    play: <PlayNowButton busy={busy} onClick={() => void onPlay()} t={t} />,
  };
}

export default ClassSetupInvite;
