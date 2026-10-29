/**
 * ClassroomGameLobby — the host flow in three taps: class → mode → Start.
 * Data, socket and catalogue live in `lobby/`; fine-tuning sits behind one "Options" door.
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
import {
  VOCAB_QUIZ_DEFAULT_QUESTION_COUNT,
  VOCAB_QUIZ_DEFAULT_SECONDS,
  VOCAB_QUIZ_MODE,
  type ClassroomGameMode,
  type PracticeFocusSetting,
} from '@/shared/types/vocabQuiz';
import { getPresetValues, applyVocabularyCap, type ClassroomPresetId } from '@/lib/education/classroomPresets';
import type { PlayStyle } from '@/shared/utils/teamBattle';
import type { ClassroomAccessibility, ClassroomPressure } from '@/shared/types/classroom';
import { DEFAULT_CLASSROOM_PRESSURE } from '@/shared/utils/classroomPressure';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { trackEduLiveGameStarted } from '@/lib/education/telemetry';
import { useRecentGameSettings } from '@/hooks/useRecentGameSettings';
import { configuredRoundMinutes, recommendedModeBadge } from '@/lib/education/gameModes';
import { launchOf, type ClassroomCatalogueId } from '@/lib/education/classroomCatalogueId';
import { useRotatingBoss } from './boss/useRotatingBoss';
import { availableFocuses } from '@/lib/education/vocabFocus';
import { ClassroomLobbyShell } from './lobby/ClassroomLobbyShell';
import { ClassroomModeCatalogue } from './ClassroomModeCatalogue';
import { LobbyModeGrid } from './lobby/LobbyModeGrid';
import { LobbySetupPanel } from './lobby/LobbySetupPanel';
import { ModeSuggestion } from './lobby/ModeSuggestion';
import { playableLessonWords } from '@/lib/education/lessonPickerModel';
import { wordcraftPlayable } from './lobby/wordcraftPlayable';
import { LobbyRoundSettings } from './lobby/LobbyRoundSettings';
import { LobbySetupDisclosure } from './lobby/LobbySetupDisclosure';
import { LobbyPressureDials } from './lobby/LobbyPressureDials';
import { LobbyNoClassrooms, LobbyNoLessons } from './lobby/LobbyEmptyStates';
import { LobbyClassPicker } from './lobby/LobbyClassPicker';
import { LobbyLateJoinToggle } from './lobby/LobbyLateJoinToggle';
import { LobbyEconomyToggles, type ClassroomEconomyConfig } from './lobby/LobbyEconomyToggles';
import { ZERO_ECONOMY_SNAPSHOT } from '@/shared/constants/classroomEconomy';
import { defaultLessonIdsFor, useTeacherLobbyData } from './lobby/useTeacherLobbyData';
import { useClassroomLaunchSocket } from './lobby/useClassroomLaunchSocket';
import { buildClassroomLaunchPayload } from './lobby/classroomLaunchPayload';
import { useRepeatLastSetup } from './lobby/useRepeatLastSetup';
import { readRememberedRoundDefaults } from './lobby/rememberedRoundDefaults';

export interface ClassroomGameLobbyProps {
  initialLessonId?: string;
  /** Pre-select this class in the lobby (deep-link from HQ start-live CTA). */
  initialClassroomId?: string;
  /** 'repeatLast' → prefill classroom + lessons + settings from the last game. */
  initialFlow?: string;
  /**
   * `?cefr=` from the ESL page's "Run this list with the class" demo CTA.
   * Pre-selects the matching starter lesson, materializing it first if the
   * teacher does not have it yet.
   */
  cefrLevel?: CefrLevel;
  /** `?mode=` from Teacher Home: open with this mode already chosen. */
  initialMode?: ClassroomCatalogueId;
  /** `?minutes=` (onboarding's 2-minute demo). */
  initialMinutes?: number;
  onBack: () => void;
}

export function ClassroomGameLobby({ initialLessonId, initialClassroomId, initialFlow, cefrLevel, initialMode, initialMinutes, onBack }: ClassroomGameLobbyProps) {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const router = useRouter();

  const {
    lessons,
    classrooms,
    isLoading,
    isCreatingFromPack,
    selectedLessonIds,
    setSelectedLessonIds,
    selectedClassroomId,
    setSelectedClassroomId,
    createLessonFromPack,
  } = useTeacherLobbyData(user?.id, t, initialLessonId, initialClassroomId);


  // ?cefr= deep link from the ESL page demo: once the teacher's lessons are
  // loaded, select the matching CEFR starter lesson — or create it from the
  // pack (createLessonFromPack selects the new lesson itself). Runs once per
  // mount; the pack name is stable, so a repeat visit reuses the lesson.
  const cefrApplied = useRef(false);
  useEffect(() => {
    if (!cefrLevel || cefrApplied.current || isLoading) return;
    cefrApplied.current = true;
    const pack = cefrLessonPack(cefrLevel);
    const existing = lessons.find((l) => l.name === pack.name);
    if (existing) {
      setSelectedLessonIds([existing.id]);
    } else {
      void createLessonFromPack(pack);
    }
  }, [cefrLevel, isLoading, lessons, createLessonFromPack, setSelectedLessonIds]);

  const { gameCode, isStarting, startError, setStartError, launch, roomCreatedGameCode, pressurePending } = useClassroomLaunchSocket(t, language);

  // Same single hop as the express launch; held while a pressure write awaits its ack so a refusal is still shown.
  useEffect(() => {
    if (roomCreatedGameCode && !pressurePending) router.replace(classroomLivePath(language, roomCreatedGameCode, { host: true }));
  }, [roomCreatedGameCode, pressurePending, router, language]);

  // No class yet: the 2-step setup names it properly and shows the code before a game.
  const handleCreateClassroom = useCallback(() => {
    router.push(`/${language}/teacher/classroom/new`);
  }, [router, language]);

  // The mode the teacher explicitly picked. `null` means untouched, and the
  // default below is derived at render from whether a lesson is attached — ONE
  // source of truth, nothing that can flip it late (pitfalls class 1).
  const [pickedGameMode, setPickedGameMode] = useState<ClassroomCatalogueId | null>(initialMode ?? null);
  const [bossId, setBossId] = useRotatingBoss();
  const [vocabQuizFocus, setVocabQuizFocus] = useState<PracticeFocusSetting>('any');
  const [vocabQuizQuestionCount, setVocabQuizQuestionCount] = useState(VOCAB_QUIZ_DEFAULT_QUESTION_COUNT);
  const [vocabQuizSeconds, setVocabQuizSeconds] = useState(VOCAB_QUIZ_DEFAULT_SECONDS);
  const [treasureChestsEnabled, setTreasureChestsEnabled] = useState(true);
  const [targetWord, setTargetWord] = useState('');
  const [minWordLength, setMinWordLength] = useState(3);
  const [remembered] = useState(readRememberedRoundDefaults);
  const [timerMinutes, setTimerMinutes] = useState(initialMinutes ?? remembered?.timerMinutes ?? 3);
  const [allowLateJoin, setAllowLateJoin] = useState(remembered?.allowLateJoin ?? true);
  const [economy, setEconomy] = useState<ClassroomEconomyConfig>(ZERO_ECONOMY_SNAPSHOT.config);
  const [boardSize, setBoardSize] = useState<'small' | 'medium' | 'large'>(remembered?.boardSize ?? 'medium');
  const [playStyle, setPlayStyle] = useState<PlayStyle>('ffa');
  const [teamCount, setTeamCount] = useState(2);
  const [accessibility, setAccessibility] = useState<ClassroomAccessibility>({});
  // The Pro pressure dials. State starts on the loud defaults; the launch
  // carries them only for a Pro teacher — the loud game-show IS the free tier.
  const [pressure, setPressure] = useState<ClassroomPressure>(DEFAULT_CLASSROOM_PRESSURE);
  const { hasPro: hasTeacherPro } = useTeacherPro();
  const [activePreset, setActivePreset] = useState<ClassroomPresetId | null>(null);
  /** Starts shut every visit: the screen a teacher opens in front of a class is the one-tap one. */
  const [setupOpen, setSetupOpen] = useState(false);

  const { saveConfig } = useRecentGameSettings();

  const applyPreset = useCallback(
    (id: ClassroomPresetId) => {
      const preset = getPresetValues(id);
      setTimerMinutes(preset.timerMinutes);
      setBoardSize(preset.boardSize);
      setMinWordLength(preset.minWordLength);
      setPlayStyle(preset.playStyle);
      setTeamCount(preset.teamCount);
      setAccessibility(preset.accessibility);
      setActivePreset(id);
      if (id === 'friday-battle') {
        const classLanguage = classrooms.find((c) => c.id === selectedClassroomId)?.language;
        setSelectedLessonIds((prev) => (prev.length > 0 ? prev : defaultLessonIdsFor(lessons, classLanguage)));
      }
    },
    [lessons, classrooms, selectedClassroomId, setSelectedLessonIds]
  );

  const { pending: repeatPending } = useRepeatLastSetup({
    flow: initialFlow,
    isLoading,
    classrooms,
    lessons,
    setSelectedClassroomId,
    setSelectedLessonIds,
    setTimerMinutes,
    setBoardSize,
  });

  useEffect(() => {
    if (!user) router.push(`/${language}/education`);
  }, [user, language, router]);

  const selectedLessons = useMemo(
    () => lessons.filter((l) => selectedLessonIds.includes(l.id)),
    [lessons, selectedLessonIds]
  );

  // Every word the teacher assigned, deduped — NOT filtered by `canIntegrate`,
  // which answers "can a Boggle grid hold this?" (3-12 letters) and not "is this
  // part of the lesson?". Using it here turned a ten-word list into nine and
  // dropped "photosynthesis" with no error anywhere (measured 2026-09-07).
  const allPlayableWords = useMemo(() => playableLessonWords(selectedLessons), [selectedLessons]);

  // The RICH per-word rows the quiz builds questions from — and what the
  // "best fit" flag is computed off.
  const lessonWords = useMemo(
    () => selectedLessons.flatMap((lesson) => lesson.words ?? []).filter((w) => w?.canIntegrate !== false),
    [selectedLessons]
  );
  const lessonLanguage = selectedLessons[0]?.language;

  // A lesson attached means the teacher came to drill THOSE words, and Classic
  // cannot: a 6×6 board carried 1 of 9 lesson words because a straight run caps
  // at six letters. Classic stays the default with nothing attached.
  // The same focus scan the server's question builder runs, so "can this list be quizzed" has one answer.
  const quizPlayable = useMemo(
    () => availableFocuses(lessonWords as VocabularyWord[], { language: lessonLanguage }).length > 0,
    [lessonWords, lessonLanguage]
  );
  const pickedId: ClassroomCatalogueId =
    pickedGameMode ?? (selectedLessonIds.length > 0 && quizPlayable ? VOCAB_QUIZ_MODE : 'classic');
  const { gameMode, vocabQuizVariant, classroomBossId } = launchOf(pickedId, bossId);
  const recommended = useMemo(() => recommendedModeBadge(lessonWords), [lessonWords]);
  // The poster's minute chip quotes THIS room, not the catalog, so it cannot
  // promise five minutes and open a three-minute round (pitfall class 3).
  const roundMinutes = configuredRoundMinutes(gameMode, {
    timerMinutes,
    vocabQuizQuestionCount,
    vocabQuizSeconds,
  });

  const minutesFor = useCallback(
    (id: ClassroomCatalogueId) =>
      configuredRoundMinutes(launchOf(id).gameMode, { timerMinutes, vocabQuizQuestionCount, vocabQuizSeconds }),
    [timerMinutes, vocabQuizQuestionCount, vocabQuizSeconds]
  );

  const cannotStart =
    selectedLessonIds.length === 0 || !selectedClassroomId || allPlayableWords.length === 0;
  const wordcraftOk = wordcraftPlayable(allPlayableWords, { lessonLanguage, classroomLanguage: classrooms.find((c) => c.id === selectedClassroomId)?.language, preset: activePreset });

  const startGame = useCallback(
    (mode: ClassroomGameMode, variant?: typeof vocabQuizVariant, boss?: Parameters<typeof launchOf>[1]) => {
      setStartError(null);
      const classroom = classrooms.find((c) => c.id === selectedClassroomId);
      if ((mode === VOCAB_QUIZ_MODE && !quizPlayable) || (mode === 'wordcraft' && !wordcraftOk)) return;
      if (!user || !classroom || selectedLessonIds.length === 0) {
        toast.error(t('education.classroomGame.missingRequirements'));
        setStartError('education.classroomGame.missingRequirements');
        return;
      }

      const presetCap = activePreset ? getPresetValues(activePreset).vocabularyCap : 0;
      const playableWords = applyVocabularyCap(allPlayableWords, presetCap);
      const lessonNames = selectedLessons.map((l) => l.name);

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
            templateSettings: {
              timerSeconds: timerMinutes * 60,
              difficulty: boardSize,
              minWordLength,
              allowLateJoin,
            },
          })
        );
      } catch {
        /* storage off — the socket payload still carries the words */
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
          economy,
          bossId: boss,
          targetWord,
          quiz: { focus: vocabQuizFocus, questionCount: vocabQuizQuestionCount, seconds: vocabQuizSeconds, treasureChestsEnabled, variant },
          playStyle,
          teamCount,
          accessibility,
          // Absent for a free teacher: the loud default is the free tier.
          pressure: hasTeacherPro ? pressure : undefined,
        })
      );

      trackEduLiveGameStarted({
        classroomId: selectedClassroomId,
        source: 'create_room',
        lessonCount: selectedLessonIds.length,
      });
    },
    [
      user, profile, classrooms, selectedClassroomId, selectedLessonIds, selectedLessons,
      allPlayableWords, activePreset, gameCode, language, t, launch, saveConfig, setStartError,
      targetWord, minWordLength, timerMinutes, allowLateJoin, economy, boardSize, playStyle, teamCount, accessibility,
      vocabQuizFocus, vocabQuizQuestionCount, vocabQuizSeconds, treasureChestsEnabled,
      pressure, hasTeacherPro, quizPlayable, lessonLanguage, wordcraftOk,
    ]
  );

  // A poster only CHOOSES; GO LIVE is the one launch (a double tap must never open a room).
  const pickMode = useCallback((mode: ClassroomCatalogueId) => {
    setPickedGameMode(mode);
  }, []);

  // Why GO LIVE is greyed, said before the tap (pitfall class 4).
  const blockedKey = cannotStart
    ? 'education.modePicker.needsLesson'
    : gameMode === VOCAB_QUIZ_MODE && !quizPlayable
      ? 'eg2Modes.needsMeanings'
      : gameMode === 'wordcraft' && !wordcraftOk
        ? 'education.modePicker.wordcraftNeedsShortWords'
        : null;

  if (roomCreatedGameCode) {
    return <PageLoader text={t('teacher.classroom.settingUp')} size="lg" nested />;
  }

  // `repeatPending` is part of the gate on purpose: the restored lesson decides
  // which poster leads, so painting before it lands shows Classic and then
  // jumps to the quiz (pitfall class 1).
  if (isLoading || repeatPending) {
    return <PageLoader text={t('teacher.classroom.settingUp')} size="lg" nested />;
  }

  if (classrooms.length === 0) {
    return (
      <LobbyNoClassrooms onBack={onBack} onCreateClassroom={handleCreateClassroom} />
    );
  }

  if (lessons.length === 0) {
    return (
      <LobbyNoLessons
        starterPacks={<StarterPacksSection onSelectPack={createLessonFromPack} language={classrooms.find((c) => c.id === selectedClassroomId)?.language} />}
        isCreating={isCreatingFromPack}
        onBack={onBack}
        onCreateLesson={() => router.push(`/${language}/teacher`)}
      />
    );
  }

  return (
    <ClassroomLobbyShell expanded={setupOpen}
      pinned={
        <LobbyClassPicker
          classrooms={classrooms}
          selectedId={selectedClassroomId}
          onSelect={setSelectedClassroomId}
          label={t('eduShell.host.classLabel')}
        />
      }
      aside={
        <ClassroomModeCatalogue
          selected={pickedId}
          recommended={recommended}
          minutes={roundMinutes}
          minutesFor={minutesFor}
          playStyle={playStyle}
          busy={isStarting}
          blockedKey={blockedKey}
          onPick={pickMode}
          onGoLive={() => startGame(gameMode, vocabQuizVariant, classroomBossId)}
          withCardRow={false}
        />
      }
    >
      {startError && (
        <div
          role="alert"
          data-testid="create-room-error"
          className="mb-4 rounded-neo border-[3px] border-neo-pink bg-neo-navy-light px-4 py-3 text-center font-bold text-neo-white"
        >
          <span className="block">{t(startError)}</span>
          <button
            type="button"
            data-testid="create-room-retry"
            disabled={isStarting}
            onClick={() => startGame(gameMode, vocabQuizVariant, classroomBossId)}
            className="mt-2 inline-flex min-h-[44px] items-center rounded-neo border-[3px] border-neo-black bg-neo-cream px-4 font-neo-display text-sm font-black text-neo-black shadow-hard-sm transition-transform active:scale-[0.97] disabled:opacity-60"
          >
            {t('eduShell.host.retry')}
          </button>
        </div>
      )}

      <LobbySetupDisclosure
        classroomName={classrooms.find((c) => c.id === selectedClassroomId)?.name ?? ''}
        lessonNames={selectedLessons.map((l) => l.name)}
        wordCount={allPlayableWords.length}
        boardLanguage={lessonLanguage}
        incomplete={cannotStart}
        open={setupOpen}
        onToggle={() => setSetupOpen((v) => !v)}
      >
        <LobbySetupPanel
          classrooms={classrooms}
          lessons={lessons}
          selectedClassroomId={selectedClassroomId}
          selectedLessonIds={selectedLessonIds}
          wordCount={allPlayableWords.length}
          activePreset={activePreset}
          playStyle={playStyle}
          teamCount={teamCount}
          accessibility={accessibility}
          onSelectClassroom={setSelectedClassroomId}
          onSelectLessons={setSelectedLessonIds}
          onApplyPreset={applyPreset}
          onPlayStyleChange={(style) => { setPlayStyle(style); setActivePreset(null); }}
          onTeamCountChange={(count) => { setTeamCount(count); setActivePreset(null); }}
          onAccessibilityChange={(next) => { setAccessibility(next); setActivePreset(null); }}
        />

        {/* The Pro dials lead the fine-tuning: the lock chip is the
            monetization entry, so it is visible on first expand — never
            below the sheet's scroll window. */}
        <LobbyPressureDials pressure={pressure} onChange={setPressure} />

        <LobbyRoundSettings
          gameMode={gameMode}
          timerMinutes={timerMinutes}
          boardSize={boardSize}
          minWordLength={minWordLength}
          targetWord={targetWord}
          allPlayableWords={allPlayableWords}
          lessonWords={lessonWords}
          lessonLanguage={lessonLanguage}
          vocabQuizFocus={vocabQuizFocus}
          vocabQuizQuestionCount={vocabQuizQuestionCount}
          vocabQuizSeconds={vocabQuizSeconds}
          treasureChestsEnabled={treasureChestsEnabled}
          treasureChestsAvailable={vocabQuizVariant !== 'boss'}
          bossId={classroomBossId}
          onBossChange={setBossId}
          onTimerChange={setTimerMinutes}
          onBoardSizeChange={setBoardSize}
          onMinWordLengthChange={setMinWordLength}
          onTargetWordChange={setTargetWord}
          onVocabQuizFocusChange={setVocabQuizFocus}
          onVocabQuizQuestionCountChange={setVocabQuizQuestionCount}
          onVocabQuizSecondsChange={setVocabQuizSeconds}
          onTreasureChestsChange={setTreasureChestsEnabled}
        />

        <LobbyLateJoinToggle
          checked={allowLateJoin}
          onChange={setAllowLateJoin}
          label={t('eduShell.host.lateJoin')}
          hint={t('eduShell.host.lateJoinHint')}
        />

        <LobbyEconomyToggles value={economy} onChange={setEconomy} />

      </LobbySetupDisclosure>

      <div className="mt-3 flex flex-col gap-3 lg:mt-4">
        <ModeSuggestion selected={pickedId} isBlocked={(id) => (id === VOCAB_QUIZ_MODE && !quizPlayable) || (id === 'wordcraft' && !wordcraftOk)} onPick={pickMode} t={t as (key: string, params?: Record<string, string | number>) => string} />
        <LobbyModeGrid
          selected={pickedId}
          recommended={recommended}
          selectedMinutes={roundMinutes}
          minutesFor={minutesFor}
          busy={isStarting}
          onPick={pickMode}
          t={t as (key: string, params?: Record<string, string | number>) => string}
        />
      </div>
    </ClassroomLobbyShell>
  );
}
