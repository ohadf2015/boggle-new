/**
 * ClassroomGameLobby — pick the game, and the class is playing.
 *
 * The lobby used to open on a wizard: "Step 1 of 1", a preset block, classroom
 * radios, a lesson list, team settings, a timer grid, a board-size grid, and
 * only at the very bottom five small icon radios for the game mode — the one
 * choice that decides what the lesson actually is. Blooket leads with the mode
 * and makes it a wall of posters, but its poster says only the mode's NAME —
 * how it plays, how long it runs and whether it suits your material all sit
 * behind a second tap. This leads with the mode too, puts all three on the
 * poster's face, and makes the live one a wide hero so there is a lead tile
 * rather than five equal ones. Switching is free (the settings below reshape in
 * place); GO LIVE, which names the chosen game, is the one and only commit.
 *
 * Everything else moved into `lobby/` so this file stays a coordinator:
 *  - `useTeacherLobbyData`      — classes, lessons, starter packs
 *  - `useClassroomLaunchSocket` — the socket, the emit, the failure paths
 *  - `LobbyModeHero`            — the pinned picker
 *  - `LobbySetupPanel` / `LobbyRoundSettings` — the fine-tuning that scrolls
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
import { useClassrooms } from '@/hooks/useClassroom';
import type { Language } from '@/lib/supabase/education/types';
import { cefrLessonPack, type CefrLevel } from '@/lib/education/eslCefrDemo';
import {
  VOCAB_QUIZ_DEFAULT_QUESTION_COUNT,
  VOCAB_QUIZ_DEFAULT_SECONDS,
  VOCAB_QUIZ_MODE,
  type ClassroomGameMode,
  type PracticeFocusSetting,
} from '@/shared/types/vocabQuiz';
import { getPresetValues, applyVocabularyCap, type ClassroomPresetId } from '@/lib/education/classroomPresets';
import { clampTeamCount, type PlayStyle } from '@/shared/utils/teamBattle';
import type { ClassroomAccessibility } from '@/shared/types/classroom';
import { trackEduLiveGameStarted } from '@/lib/education/telemetry';
import { useRecentGameSettings } from '@/hooks/useRecentGameSettings';
import { configuredRoundMinutes, recommendedModeBadge } from '@/lib/education/gameModes';
import { ClassroomLobbyShell } from './lobby/ClassroomLobbyShell';
import { LobbyModeHero } from './lobby/LobbyModeHero';
import { LobbySetupPanel } from './lobby/LobbySetupPanel';
import { LobbyRoundSettings } from './lobby/LobbyRoundSettings';
import { LobbySetupDisclosure } from './lobby/LobbySetupDisclosure';
import { LobbyNoClassrooms, LobbyNoLessons } from './lobby/LobbyEmptyStates';
import { ClassroomLiveLobby } from './lobby/ClassroomLiveLobby';
import { useTeacherLobbyData } from './lobby/useTeacherLobbyData';
import { useClassroomLaunchSocket } from './lobby/useClassroomLaunchSocket';
import { useRepeatLastSetup } from './lobby/useRepeatLastSetup';

export interface ClassroomGameLobbyProps {
  initialLessonId?: string;
  /** 'repeatLast' → prefill classroom + lessons + settings from the last game. */
  initialFlow?: string;
  /**
   * `?cefr=` from the ESL page's "Run this list with the class" demo CTA.
   * Pre-selects the matching starter lesson, materializing it first if the
   * teacher does not have it yet.
   */
  cefrLevel?: CefrLevel;
  onBack: () => void;
}

export function ClassroomGameLobby({ initialLessonId, initialFlow, cefrLevel, onBack }: ClassroomGameLobbyProps) {
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
    fetchTeacherData,
  } = useTeacherLobbyData(user?.id, t, initialLessonId);

  const { createClassroom } = useClassrooms();

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

  const { gameCode, isStarting, startError, setStartError, launch, socket, roomCreatedGameCode, startLiveGame } = useClassroomLaunchSocket(t, language);

  // Create classroom from the empty-state button
  const handleCreateClassroom = useCallback(async () => {
    const defaultName = t('education.classroomGame.defaultClassroomName');
    const classroomLanguage = language as Language;

    const result = await createClassroom(defaultName, classroomLanguage);

    if (!result.success) {
      if (result.code === 'CLASS_LIMIT_REACHED') {
        toast.error(t('education.subscription.classLimitReached'));
      } else {
        toast.error(result.error || t('errors.classroomCreateFailed'));
      }
      return;
    }

    toast.success(t('education.lesson.createdClassroom'));
    // Refetch the lobby data so the new classroom appears
    await fetchTeacherData();
  }, [t, language, createClassroom, fetchTeacherData]);

  // The mode the teacher explicitly picked. `null` means untouched, and the
  // default below is derived at render from whether a lesson is attached — ONE
  // source of truth, nothing that can flip it late (pitfalls class 1).
  const [pickedGameMode, setPickedGameMode] = useState<ClassroomGameMode | null>(null);
  const [vocabQuizFocus, setVocabQuizFocus] = useState<PracticeFocusSetting>('any');
  const [vocabQuizQuestionCount, setVocabQuizQuestionCount] = useState(VOCAB_QUIZ_DEFAULT_QUESTION_COUNT);
  const [vocabQuizSeconds, setVocabQuizSeconds] = useState(VOCAB_QUIZ_DEFAULT_SECONDS);
  const [treasureChestsEnabled, setTreasureChestsEnabled] = useState(true);
  const [targetWord, setTargetWord] = useState('');
  const [minWordLength, setMinWordLength] = useState(3);
  const [timerMinutes, setTimerMinutes] = useState(3);
  const [boardSize, setBoardSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [playStyle, setPlayStyle] = useState<PlayStyle>('ffa');
  const [teamCount, setTeamCount] = useState(2);
  const [accessibility, setAccessibility] = useState<ClassroomAccessibility>({});
  const [activePreset, setActivePreset] = useState<ClassroomPresetId | null>(null);
  /**
   * Both folds start SHUT, and neither is remembered across visits: the screen
   * a teacher opens in front of a class is the one-tap one, every time.
   */
  const [modesExpanded, setModesExpanded] = useState(false);
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
        setSelectedLessonIds((prev) => (prev.length > 0 ? prev : lessons.slice(0, 1).map((l) => l.id)));
      }
    },
    [lessons, setSelectedLessonIds]
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
  const allPlayableWords = useMemo(() => {
    const words = selectedLessons.flatMap(
      (lesson) => lesson.words?.map((w) => w.word).filter((w): w is string => !!w?.trim()) || []
    );
    return [...new Set(words)];
  }, [selectedLessons]);

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
  const gameMode: ClassroomGameMode =
    pickedGameMode ?? (selectedLessonIds.length > 0 ? VOCAB_QUIZ_MODE : 'classic');
  const recommended = useMemo(() => recommendedModeBadge(lessonWords), [lessonWords]);
  // The poster's minute chip quotes THIS room, not the catalog, so it cannot
  // promise five minutes and open a three-minute round (pitfall class 3).
  const roundMinutes = configuredRoundMinutes(gameMode, {
    timerMinutes,
    vocabQuizQuestionCount,
    vocabQuizSeconds,
  });

  const cannotStart =
    selectedLessonIds.length === 0 || !selectedClassroomId || allPlayableWords.length === 0;

  const startGame = useCallback(
    (mode: ClassroomGameMode) => {
      setStartError(null);
      const classroom = classrooms.find((c) => c.id === selectedClassroomId);
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
            language,
            gameMode: mode,
            targetWord,
            playStyle,
            teamCount,
            accessibility,
            templateSettings: {
              timerSeconds: timerMinutes * 60,
              difficulty: boardSize,
              minWordLength,
              allowLateJoin: true,
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
        settings: { timerMinutes, boardSize, allowLateJoin: true },
        savedAt: Date.now(),
      });

      launch({
        gameCode,
        classroomId: selectedClassroomId,
        teacherId: user.id,
        teacherName: socketTeacherName(user, profile?.display_name),
        lessonIds: selectedLessonIds,
        lessonNames,
        vocabularyWords: playableWords,
        settings: {
          timerMinutes,
          boardSize,
          allowLateJoin: true,
          gameMode: mode,
          targetWord: targetWord || undefined,
          ...(mode === VOCAB_QUIZ_MODE
            ? { vocabQuizFocus, vocabQuizQuestionCount, vocabQuizSeconds, treasureChestsEnabled }
            : {}),
          playStyle,
          teamCount: playStyle === 'teams' ? clampTeamCount(teamCount) : undefined,
          accessibility:
            accessibility.largeText || accessibility.audioCues || accessibility.participationPoints
              ? accessibility
              : undefined,
        },
      });

      trackEduLiveGameStarted({
        classroomId: selectedClassroomId,
        source: 'create_room',
        lessonCount: selectedLessonIds.length,
      });
    },
    [
      user, profile, classrooms, selectedClassroomId, selectedLessonIds, selectedLessons,
      allPlayableWords, activePreset, gameCode, language, t, launch, saveConfig, setStartError,
      targetWord, minWordLength, timerMinutes, boardSize, playStyle, teamCount, accessibility,
      vocabQuizFocus, vocabQuizQuestionCount, vocabQuizSeconds, treasureChestsEnabled,
    ]
  );

  /**
   * A tap on a poster CHOOSES; it never fires a room.
   *
   * Creating a room navigates away to /multiplayer, so a poster that launched
   * would make "switch the mode from the lobby" impossible — and on a phone a
   * double tap would open a room in front of thirty students by accident. It
   * would also put a second launch control on a screen that is allowed exactly
   * one. GO LIVE is that one, it names the chosen mode, and the recommended
   * mode is already chosen, so the teacher who agrees with us still taps once.
   */
  const pickMode = useCallback((mode: ClassroomGameMode) => {
    setPickedGameMode(mode);
    // The chosen poster becomes the hero, so leaving the list open would show
    // it twice and re-open the decision the teacher just closed.
    setModesExpanded(false);
  }, []);

  /**
   * Why GO LIVE is greyed, said out loud and BEFORE the tap — a disabled
   * primary action with no sentence beside it is the silent no-op of
   * recurring pitfall class 4.
   */
  const blockedKey = cannotStart ? 'education.modePicker.needsLesson' : null;

  // After the room is created, show the live lobby instead of the setup screen
  if (roomCreatedGameCode && socket) {
    return <ClassroomLiveLobby gameCode={roomCreatedGameCode} socket={socket} onStart={startLiveGame} />;
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
        starterPacks={<StarterPacksSection onSelectPack={createLessonFromPack} />}
        isCreating={isCreatingFromPack}
        onBack={onBack}
        onCreateLesson={() => router.push(`/${language}/teacher`)}
      />
    );
  }

  return (
    <ClassroomLobbyShell
      pinned={
        <LobbyModeHero
          selected={gameMode}
          recommended={recommended}
          minutes={roundMinutes}
          busy={isStarting}
          blockedKey={blockedKey}
          expanded={modesExpanded}
          onToggleExpanded={() => setModesExpanded((v) => !v)}
          onPick={pickMode}
          onGoLive={() => startGame(gameMode)}
        />
      }
    >
      {startError && (
        <p
          role="alert"
          data-testid="create-room-error"
          className="mb-4 rounded-neo border-[3px] border-neo-pink bg-neo-navy-light px-4 py-3 text-center font-bold text-neo-white"
        >
          {t(startError)}
        </p>
      )}

      <LobbySetupDisclosure
        classroomName={classrooms.find((c) => c.id === selectedClassroomId)?.name ?? ''}
        lessonNames={selectedLessons.map((l) => l.name)}
        wordCount={allPlayableWords.length}
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
          onTimerChange={setTimerMinutes}
          onBoardSizeChange={setBoardSize}
          onMinWordLengthChange={setMinWordLength}
          onTargetWordChange={setTargetWord}
          onVocabQuizFocusChange={setVocabQuizFocus}
          onVocabQuizQuestionCountChange={setVocabQuizQuestionCount}
          onVocabQuizSecondsChange={setVocabQuizSeconds}
          onTreasureChestsChange={setTreasureChestsEnabled}
        />
      </LobbySetupDisclosure>
    </ClassroomLobbyShell>
  );
}
