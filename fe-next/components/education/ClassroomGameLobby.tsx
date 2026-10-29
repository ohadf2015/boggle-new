/**
 * ClassroomGameLobby: class (only when there is more than one) → word list → mode → GO LIVE.
 * Round settings sit behind one "Game options" door. A quick launch opens the same lobby
 * already decided, with one GO LIVE and everything else behind "More options".
 */

'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { StarterPacksSection } from '@/components/teacher/StarterPacksSection';
import { socketTeacherName } from '@/lib/education/classroomGameHandoff';
import { classroomLivePath } from '@/lib/education/classroomLivePath';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import { cefrLessonPack, type CefrLevel } from '@/lib/education/eslCefrDemo';
import { VOCAB_QUIZ_MODE, type ClassroomGameMode } from '@/shared/types/vocabQuiz';
import { getPresetValues, applyVocabularyCap, type ClassroomPresetId } from '@/lib/education/classroomPresets';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { launchPressure } from './lobby/pressureAccess';
import { useRecentGameSettings } from '@/hooks/useRecentGameSettings';
import { configuredRoundMinutes, recommendedModeBadge } from '@/lib/education/gameModes';
import { launchOf, type ClassroomCatalogueId } from '@/lib/education/classroomCatalogueId';
import { availableFocuses } from '@/lib/education/vocabFocus';
import { playableLessonWords } from '@/lib/education/lessonPickerModel';
import { ClassroomLobbyShell } from './lobby/ClassroomLobbyShell';
import { ClassroomModeCatalogue } from './ClassroomModeCatalogue';
import { LobbyModeGrid } from './lobby/LobbyModeGrid';
import { ModeSuggestion } from './lobby/ModeSuggestion';
import { wordcraftPlayable } from './lobby/wordcraftPlayable';
import { LobbyNoClassrooms, LobbyNoLessons } from './lobby/LobbyEmptyStates';
import { LobbyClassPicker } from './lobby/LobbyClassPicker';
import { LobbyLessonStep } from './lobby/LobbyLessonStep';
import { useLobbyWarmup, LobbyWarmupButton, LobbyWarmupStatus } from './lobby/LobbyWarmup';
import { LobbyGameOptions } from './lobby/LobbyGameOptions';
import { LobbyQuickSummary } from './lobby/LobbyQuickSummary';
import { useLobbyRoundOptions } from './lobby/useLobbyRoundOptions';
import { useTeacherLobbyData } from './lobby/useTeacherLobbyData';
import { useClassroomLaunchSocket } from './lobby/useClassroomLaunchSocket';
import { buildClassroomLaunchPayload } from './lobby/classroomLaunchPayload';
import { useRepeatLastSetup } from './lobby/useRepeatLastSetup';
import { useSessionRun } from './lobby/useSessionRun';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface ClassroomGameLobbyProps {
  initialLessonId?: string;
  /** Pre-select this class (deep link from Teacher HQ). */
  initialClassroomId?: string;
  /** 'repeatLast' → prefill classroom + lessons + settings from the last game. */
  initialFlow?: string;
  /** `?cefr=` from the ESL demo: pre-select (or create) the matching starter list. */
  cefrLevel?: CefrLevel;
  /** `?mode=`: open with this mode already chosen. */
  initialMode?: ClassroomCatalogueId;
  /** `?minutes=` (onboarding's 2-minute demo). */
  initialMinutes?: number;
  /** Arrived from a one-tap quick launch: show the decided room first. */
  quick?: boolean;
  /** "Run this" session link: themed pack code, preset and quiz shape (validated by the page). */
  sessionPack?: string;
  initialPreset?: ClassroomPresetId;
  initialQuestions?: number;
  initialSeconds?: number;
  onBack: () => void;
}

export function ClassroomGameLobby({ initialLessonId, initialClassroomId, initialFlow, cefrLevel, initialMode, initialMinutes, quick = false, sessionPack, initialPreset, initialQuestions, initialSeconds, onBack }: ClassroomGameLobbyProps) {
  const { t, language } = useLanguage();
  const tt = t as Translate;
  const { user, profile } = useAuth();
  const router = useRouter();
  const [showQuick, setShowQuick] = useState(quick);

  const {
    lessons, classrooms, isLoading, isCreatingFromPack,
    selectedLessonIds, setSelectedLessonIds, selectedClassroomId, setSelectedClassroomId, createLessonFromPack,
  } = useTeacherLobbyData(user?.id, t, initialLessonId, initialClassroomId);

  const cefrApplied = useRef(false);
  useEffect(() => {
    if (!cefrLevel || cefrApplied.current || isLoading) return;
    cefrApplied.current = true;
    const pack = cefrLessonPack(cefrLevel);
    const existing = lessons.find((l) => l.name === pack.name);
    if (existing) setSelectedLessonIds([existing.id]);
    else void createLessonFromPack(pack);
  }, [cefrLevel, isLoading, lessons, createLessonFromPack, setSelectedLessonIds]);

  const { gameCode, isStarting, startError, setStartError, launch, roomCreatedGameCode, pressurePending } = useClassroomLaunchSocket(tt);

  // Held while a pressure write awaits its ack, so a refusal is still shown.
  useEffect(() => {
    if (roomCreatedGameCode && !pressurePending) router.replace(classroomLivePath(language, roomCreatedGameCode, { host: true }));
  }, [roomCreatedGameCode, pressurePending, router, language]);

  const handleCreateClassroom = useCallback(() => {
    router.push(`/${language}/teacher/classroom/new`);
  }, [router, language]);

  // `null` = untouched; the default is derived at render from the attached list (one source, pitfall class 1).
  const [pickedGameMode, setPickedGameMode] = useState<ClassroomCatalogueId | null>(initialMode ?? null);
  const opts = useLobbyRoundOptions({ initialMinutes, initialQuestions, initialSeconds, lessons, selectedClassroomId, setSelectedLessonIds });
  const { runSession, pending: sessionPending } = useSessionRun({
    isLoading, lessons, setSelectedLessonIds, createLessonFromPack, opts, setPickedGameMode, sessionPack, initialPreset, initialMinutes,
  });
  const { hasPro: hasTeacherPro, loading: proLoading, accessTrialExpires } = useTeacherPro();
  const warmup = useLobbyWarmup({ classroomId: selectedClassroomId, lessonId: selectedLessonIds[0] ?? null, teacherId: user?.id ?? null, source: 'lobby' });
  const { saveConfig } = useRecentGameSettings();

  const { pending: repeatPending } = useRepeatLastSetup({
    flow: initialFlow,
    isLoading,
    classrooms,
    lessons,
    setSelectedClassroomId,
    setSelectedLessonIds,
    setTimerMinutes: opts.setTimerMinutes,
    setBoardSize: opts.setBoardSize,
  });

  useEffect(() => {
    if (!user) router.push(`/${language}/education`);
  }, [user, language, router]);

  const classroom = classrooms.find((c) => c.id === selectedClassroomId);
  const selectedLessons = useMemo(() => lessons.filter((l) => selectedLessonIds.includes(l.id)), [lessons, selectedLessonIds]);
  // Every assigned word, deduped; `canIntegrate` answers "fits a grid?", not "is it in the lesson?".
  const allPlayableWords = useMemo(() => playableLessonWords(selectedLessons), [selectedLessons]);
  const lessonWords = useMemo(
    () => selectedLessons.flatMap((lesson) => lesson.words ?? []).filter((w) => w?.canIntegrate !== false),
    [selectedLessons]
  );
  const lessonLanguage = selectedLessons[0]?.language;

  // The same focus scan the server's question builder runs, so "can this list be quizzed" has one answer.
  const quizPlayable = useMemo(
    () => availableFocuses(lessonWords as VocabularyWord[], { language: lessonLanguage }).length > 0,
    [lessonWords, lessonLanguage]
  );
  const pickedId: ClassroomCatalogueId =
    pickedGameMode ?? (selectedLessonIds.length > 0 && quizPlayable ? VOCAB_QUIZ_MODE : 'classic');
  const { gameMode, vocabQuizVariant, classroomBossId } = launchOf(pickedId, opts.bossId);
  const recommended = useMemo(() => recommendedModeBadge(lessonWords), [lessonWords]);
  const quizShape = { timerMinutes: opts.timerMinutes, vocabQuizQuestionCount: opts.vocabQuizQuestionCount, vocabQuizSeconds: opts.vocabQuizSeconds };
  const roundMinutes = configuredRoundMinutes(gameMode, quizShape);
  const minutesFor = (id: ClassroomCatalogueId) => configuredRoundMinutes(launchOf(id).gameMode, quizShape);

  const cannotStart = selectedLessonIds.length === 0 || !selectedClassroomId || allPlayableWords.length === 0;
  const wordcraftOk = wordcraftPlayable(allPlayableWords, { lessonLanguage, classroomLanguage: classroom?.language, preset: opts.activePreset });
  const isBlocked = (id: ClassroomCatalogueId) => (id === VOCAB_QUIZ_MODE && !quizPlayable) || (id === 'wordcraft' && !wordcraftOk);

  const startGame = useCallback(
    (mode: ClassroomGameMode, variant?: typeof vocabQuizVariant, boss?: Parameters<typeof launchOf>[1]) => {
      setStartError(null);
      if ((mode === VOCAB_QUIZ_MODE && !quizPlayable) || (mode === 'wordcraft' && !wordcraftOk)) return;
      if (!user || !classroom || selectedLessonIds.length === 0) {
        toast.error(t('education.classroomGame.missingRequirements'));
        setStartError('education.classroomGame.missingRequirements');
        return;
      }
      const presetCap = opts.activePreset ? getPresetValues(opts.activePreset).vocabularyCap : 0;
      const playableWords = applyVocabularyCap(allPlayableWords, presetCap);
      const lessonNames = selectedLessons.map((l) => l.name);
      const { timerMinutes, boardSize, minWordLength, allowLateJoin, playStyle, teamCount, accessibility, targetWord } = opts;

      try {
        sessionStorage.setItem(
          'lessonGameData',
          JSON.stringify({
            lessonId: selectedLessonIds.join(','),
            lessonName: lessonNames.join(', '),
            vocabularyWords: playableWords,
            language: lessonLanguage ?? language,
            gameMode: mode,
            ...(variant ? { vocabQuizVariant: variant } : {}),
            ...(boss ? { classroomBossId: boss } : {}),
            quizPlayable,
            targetWord,
            playStyle,
            teamCount,
            accessibility,
            templateSettings: { timerSeconds: timerMinutes * 60, difficulty: boardSize, minWordLength, allowLateJoin },
          })
        );
      } catch {
        /* storage off: the socket payload still carries the words */
      }

      saveConfig({
        id: `${Date.now()}`,
        classroomId: selectedClassroomId,
        classroomName: classroom.name,
        lessonIds: selectedLessonIds,
        lessonNames,
        settings: { timerMinutes, boardSize, allowLateJoin },
        savedAt: Date.now(),
      });

      launch(
        buildClassroomLaunchPayload({
          gameCode,
          classroomId: selectedClassroomId,
          teacherId: user.id,
          teacherName: socketTeacherName(user, profile?.display_name),
          lessonIds: selectedLessonIds,
          lessonNames,
          vocabularyWords: playableWords,
          language: lessonLanguage,
          mode,
          timerMinutes,
          boardSize,
          allowLateJoin,
          economy: opts.economy,
          bossId: boss,
          targetWord,
          quiz: { focus: opts.vocabQuizFocus, questionCount: opts.vocabQuizQuestionCount, seconds: opts.vocabQuizSeconds, treasureChestsEnabled: opts.treasureChestsEnabled, variant },
          playStyle,
          teamCount,
          accessibility,
          pressure: launchPressure({ hasPro: hasTeacherPro, loading: proLoading, accessTrialExpires }, opts.pressure, Date.now()),
        }),
        quick ? 'hq_express' : 'create_room'
      );
    },
    [
      user, profile, classroom, selectedClassroomId, selectedLessonIds, selectedLessons, allPlayableWords, gameCode,
      language, t, launch, saveConfig, setStartError, opts, hasTeacherPro, proLoading, accessTrialExpires, quizPlayable, lessonLanguage, wordcraftOk, quick,
    ]
  );

  const goLive = () => startGame(gameMode, vocabQuizVariant, classroomBossId);

  // Why GO LIVE is greyed, said before the tap (pitfall class 4).
  const blockedKey = cannotStart
    ? 'education.modePicker.needsLesson'
    : gameMode === VOCAB_QUIZ_MODE && !quizPlayable
      ? 'eg2Modes.needsMeanings'
      : gameMode === 'wordcraft' && !wordcraftOk
        ? 'education.modePicker.wordcraftNeedsShortWords'
        : null;

  // `repeatPending` gates paint: the restored list decides which poster leads (pitfall class 1).
  if (roomCreatedGameCode || isLoading || repeatPending || sessionPending) {
    return <PageLoader text={t('teacher.classroom.settingUp')} size="lg" nested />;
  }

  if (classrooms.length === 0) {
    return <LobbyNoClassrooms onBack={onBack} onCreateClassroom={handleCreateClassroom} />;
  }

  if (lessons.length === 0) {
    return (
      <LobbyNoLessons
        starterPacks={<StarterPacksSection onSelectPack={createLessonFromPack} language={classroom?.language} classroomId={selectedClassroomId} onRunSession={runSession} />}
        isCreating={isCreatingFromPack}
        onBack={onBack}
        onCreateLesson={() => router.push(`/${language}/teacher`)}
      />
    );
  }

  const quickView = showQuick && !cannotStart;

  return (
    <ClassroomLobbyShell
      pinned={
        quickView ? null : (
          <LobbyClassPicker classrooms={classrooms} selectedId={selectedClassroomId} onSelect={setSelectedClassroomId} label={t('eduShell.host.classLabel')} />
        )
      }
      aside={
        <>
          <ClassroomModeCatalogue
            selected={pickedId}
            minutes={roundMinutes}
            playStyle={opts.playStyle}
            busy={isStarting}
            blockedKey={blockedKey}
            onGoLive={goLive}
          />
          <LobbyWarmupStatus warmup={warmup} className="mt-2 justify-center" />
        </>
      }
    >
      {startError && (
        <div role="alert" data-testid="create-room-error" className="mb-4 rounded-neo border-[3px] border-neo-pink bg-neo-navy-light px-4 py-3 text-center font-bold text-neo-white">
          <span className="block">{t(startError)}</span>
          <button
            type="button"
            data-testid="create-room-retry"
            disabled={isStarting}
            onClick={goLive}
            className="mt-2 inline-flex min-h-11 items-center rounded-neo border-[3px] border-neo-black bg-neo-cream px-4 font-neo-display text-sm font-black text-neo-black shadow-hard-sm transition-transform active:scale-[0.97] disabled:opacity-60"
          >
            {t('eduShell.host.retry')}
          </button>
        </div>
      )}

      {quickView ? (
        <LobbyQuickSummary
          classroomName={classroom?.name ?? ''}
          lessonNames={selectedLessons.map((l) => l.name)}
          wordCount={allPlayableWords.length}
          boardLanguage={lessonLanguage}
          onMoreOptions={() => setShowQuick(false)}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <LobbyLessonStep
            lessons={lessons}
            selectedLessonIds={selectedLessonIds}
            onChange={setSelectedLessonIds}
            classLanguage={classroom?.language}
            createHref={`/${language}/teacher/curriculum${selectedClassroomId ? `?classroomId=${selectedClassroomId}` : ''}`}
            wordCount={allPlayableWords.length}
            boardLanguage={lessonLanguage}
            activePreset={opts.activePreset}
          />
          <LobbyWarmupButton warmup={warmup} />
          <ModeSuggestion selected={pickedId} isBlocked={isBlocked} onPick={setPickedGameMode} t={tt} />
          <LobbyModeGrid
            selected={pickedId}
            recommended={recommended}
            selectedMinutes={roundMinutes}
            minutesFor={minutesFor}
            busy={isStarting}
            onPick={setPickedGameMode}
            t={tt}
          />
          <LobbyGameOptions
            opts={opts}
            roundMinutes={roundMinutes}
            gameMode={gameMode}
            vocabQuizVariant={vocabQuizVariant}
            classroomBossId={classroomBossId}
            allPlayableWords={allPlayableWords}
            lessonWords={lessonWords}
            lessonLanguage={lessonLanguage}
          />
        </div>
      )}
    </ClassroomLobbyShell>
  );
}
