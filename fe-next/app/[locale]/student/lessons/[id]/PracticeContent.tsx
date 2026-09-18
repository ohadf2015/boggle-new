/**
 * The solo practice loop: picker → round → payoff → next round.
 *
 * Split out of PageClient, which had grown to 482 lines by carrying both the
 * page shell (auth, lesson fetch, the dead-link card) and the loop itself. The
 * shell decides *whether* a student may practise; this decides *what* they are
 * practising and what happens when a round ends.
 */

'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePracticeProgress, usePracticeWords, type PracticeType } from '@/hooks/usePracticeSession';
import { toVocabularyWords } from '@/lib/education/practiceWordShape';
import { EducationHeader } from '@/components/education/EducationHeader';
import { EducationShell } from '@/components/education/shell/EducationShell';
import type { VocabFocus } from '@/lib/education/vocabFocus';
import PracticePicker from '@/components/education/practicePicker/PracticePicker';
import PracticeModeStage from '@/components/education/practice/PracticeModeStage';
import { PracticeCelebrationProvider } from '@/components/education/practice/PracticeCelebrationContext';
import {
  buildPracticeTiles,
  nextReadyTile,
  WORD_TOWER_TILE_ID,
  type PracticeTile,
  type PracticeVariant,
} from '@/lib/education/practicePicker';
// PERF: deep imports, not the '@/components/education' barrel. The barrel
// statically re-exports EducationHeader, ClassroomGameLobby, TeacherOnboarding,
// ClassroomLeaderboard, EducationBadgeGrid and AchievementProgressCard, all of
// which a student practising a lesson never renders.
import { usePracticeSession } from '@/components/education/PracticeSessionProvider';
import XpProgressBar from '@/components/education/XpProgressBar';
import StreakBonusIndicator from '@/components/education/StreakBonusIndicator';
import { cn } from '@/lib/utils';
import type { Language, VocabularyWord } from '@/lib/supabase/education/types';

// Renders only after a level-up event, so it must not ship in the first load
// of the practice page. Celebratory UI never needs SSR.
const LevelUpCelebration = dynamic(
  () => import('@/components/education/LevelUpCelebration').then(m => m.LevelUpCelebration),
  { ssr: false }
);

/**
 * The header draws its title in the brand lockup, which has no truncation and
 * shares its row with the back button, the mute toggle and the menu. Real
 * lesson names run long ("Unit 4 — Greek and Latin Roots, Week 2"), and an
 * untrimmed one pushes that row off a 390px phone.
 */
const HEADER_TITLE_MAX = 24;
export function headerTitle(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= HEADER_TITLE_MAX) return trimmed;
  return `${trimmed.slice(0, HEADER_TITLE_MAX - 1).trimEnd()}…`;
}

/** Session-start options; only Word Craft's variant is persisted (as `mode`). */
function sessionOptions(focus: VocabFocus | null, variant: PracticeVariant | null) {
  if (focus) return { focus };
  if (variant === 'wordcraft') return { variant: 'wordcraft' as const };
  return undefined;
}

export interface PracticeLessonShape {
  id: string;
  name: string;
  /** Narrow, not `string`: the practice screens key their letter bags and
   *  distractor banks off this and only accept the supported set. */
  language: Language;
  words: VocabularyWord[];
}

export interface PracticeContentProps {
  lesson: PracticeLessonShape;
  language: string;
  isRTL: boolean;
  progress: ReturnType<typeof usePracticeProgress>['progress'];
  mastery: ReturnType<typeof usePracticeProgress>['mastery'];
  startSession: ReturnType<typeof usePracticeProgress>['startSession'];
  router: ReturnType<typeof useRouter>;
  initialMode: PracticeType | null;
  /** vocab_focus only: skill pinned by the teacher's assignment / deep link. */
  initialFocus: VocabFocus | null;
  /** solo_board only: 'wordcraft' when a Word Craft assignment deep-links here. */
  initialVariant?: PracticeVariant | null;
  /** Records a finished round on the device when there is no account. */
  onGuestResult: (result: { cardsReviewed?: number; cardsCorrect?: number; vocabularyWordsFound?: string[] }) => void;
}

export default function PracticeContent({
  lesson,
  language,
  isRTL,
  progress,
  mastery,
  startSession,
  router,
  initialMode,
  initialFocus,
  initialVariant = null,
  onGuestResult,
}: PracticeContentProps) {
  const { t } = useLanguage();
  const [selectedMode, setSelectedMode] = useState<PracticeType | null>(initialMode);
  const [selectedFocus, setSelectedFocus] = useState<VocabFocus | null>(initialFocus);
  // Word Tower records as `solo_board` (no 'word_tower' value exists in the
  // practice_type CHECK), so the variant is what decides which screen opens.
  // Client-side only: there is no `?mode=` deep link for it yet.
  const [selectedVariant, setSelectedVariant] = useState<PracticeVariant | null>(initialVariant);
  const [hasInitialized, setHasInitialized] = useState(false);
  // Set the moment a round finishes, cleared on every mode change. It is what
  // turns the round-end into a fork rather than a dead end.
  const [roundFinished, setRoundFinished] = useState(false);
  // POST /api/education/practice can 403/500 (e.g. a classroom student the
  // server doesn't yet recognise as a member). `startSession` already reports
  // that as `{ success: false }` — this is what stops the failure from being
  // swallowed silently, per the picker's dead-end problem.
  const [startError, setStartError] = useState<string | null>(null);
  // The `practice_sessions.id` the currently-open round started under. Set on
  // every successful `startSession()` call, read by `finishRound` so
  // completion can PATCH the same row completed_at/xp_awarded is written to —
  // without it, nothing downstream had a session to complete.
  const currentSessionIdRef = useRef<string | undefined>(undefined);
  /*
    `lessons.words` is jsonb and holds two shapes: objects from the lesson
    builder, plain strings from seeded/imported lists. Every practice mode reads
    `entry.word`, so a string list arrived as N `undefined`s — the board found
    nothing, the picker locked every skill "for want of data", and Spelling threw
    inside a sort comparator and handed the round to the error boundary. Shape it
    once, here, before anything downstream trusts the type.
  */
  const shapedWords = useMemo(() => toVocabularyWords(lesson.words), [lesson.words]);
  // Per-student differentiation: every practice mode below takes its words from here
  // (filtered by the student's classroom level), never from raw `lesson.words`.
  const { words: practiceWords } = usePracticeWords(shapedWords);

  const tiles = useMemo(
    () => buildPracticeTiles(practiceWords, { language: lesson.language, sessions: progress }),
    [practiceWords, lesson.language, progress]
  );

  // Auto-start session if we have an initial mode from URL. `selectedMode`
  // already opened this mode optimistically (its initial state is
  // `initialMode`); a failure here must walk that back to the picker instead
  // of leaving a round on screen with no session behind it.
  useEffect(() => {
    if (initialMode && !hasInitialized) {
      setHasInitialized(true);
      void startSession(initialMode, sessionOptions(initialFocus, initialVariant)).then((result) => {
        if (!result.success) {
          setStartError(t('education.practice.startFailed'));
          setSelectedMode(null);
        } else {
          currentSessionIdRef.current = result.sessionId;
        }
      });
    }
  }, [initialMode, initialFocus, initialVariant, hasInitialized, startSession, t]);

  // Access XP context
  const {
    totalXp,
    streak,
    sessionXpEarned,
    sessionMasteryMessage,
    completePracticeSession,
    levelUpData,
    dismissLevelUp,
  } = usePracticeSession();

  const openMode = useCallback(async (
    mode: PracticeType,
    options?: { focus?: VocabFocus; variant?: PracticeVariant }
  ) => {
    setSelectedMode(mode);
    setSelectedFocus(options?.focus ?? null);
    setSelectedVariant(options?.variant ?? null);
    // A fresh round is not a finished one. Without this the next-mode bar from
    // the previous round survives into the new one (Class 2: stale state
    // carried across a reset path).
    setRoundFinished(false);
    /*
      And a level-up belonging to the round that just ended must not follow the
      student INTO the new one. The completion card normally claims it (and
      clears it) as it draws its banner; clearing again here covers the case
      where the student tapped NEXT faster than that, and the case of a screen
      that shows no completion card at all. An overlay over live play is exactly
      what the round-end redesign exists to remove.
    */
    dismissLevelUp();
    setStartError(null);
    // The variant is a client-side routing detail; the session still starts as
    // the practice type the database accepts.
    const result = await startSession(mode, sessionOptions(options?.focus ?? null, options?.variant ?? null));
    if (!result.success) {
      // Don't leave the student staring at a round with no session behind
      // it — back out to the picker and say so.
      setStartError(t('education.practice.startFailed'));
      setSelectedMode(null);
    } else {
      currentSessionIdRef.current = result.sessionId;
    }
  }, [startSession, dismissLevelUp, t]);

  // Handle back to mode selector
  const handleBack = useCallback(() => {
    setSelectedMode(null);
    // Clear the variant with the mode, or the next plain solo_board tap would
    // re-open Word Tower instead of the board (Class 2: stale state across a
    // reset path).
    setSelectedVariant(null);
    setRoundFinished(false);
  }, []);

  /**
   * One completion path for every mode. Each drill reports a different shape,
   * so the shape is normalised here and then fanned out to the three things a
   * finished round must touch: XP, the on-device guest record, and the
   * round-end fork.
   */
  const finishRound = useCallback(async (
    type: PracticeType,
    payload: {
      focus?: VocabFocus;
      cardsReviewed?: number;
      cardsCorrect?: number;
      vocabularyWordsFound?: string[];
      newWordsFound?: string[];
    }
  ) => {
    setRoundFinished(true);
    onGuestResult({
      cardsReviewed: payload.cardsReviewed,
      cardsCorrect: payload.cardsCorrect,
      vocabularyWordsFound: payload.vocabularyWordsFound,
    });
    // ponytail: warmup / word_list are not persistable session types (the API union
    // has no row for them) — the guard also narrows `type` for the call below.
    if (type === 'warmup' || type === 'word_list') return;
    await completePracticeSession({ type, sessionId: currentSessionIdRef.current, ...payload });
  }, [completePracticeSession, onGuestResult]);

  // XP session data for practice components
  const xpSessionData = {
    sessionXpEarned,
    sessionMasteryMessage,
  };

  /** The tile currently on screen, so the round-end knows what "next" means. */
  const currentTileId = selectedVariant === 'word_tower'
    ? WORD_TOWER_TILE_ID
    : selectedMode === 'vocab_focus' && selectedFocus
      ? `vocab_focus:${selectedFocus}`
      : selectedMode ?? '';
  const nextTile: PracticeTile | null = roundFinished ? nextReadyTile(tiles, currentTileId) : null;

  const handleNextTile = useCallback(() => {
    if (!nextTile) return;
    void openMode(nextTile.mode, {
      ...(nextTile.focus ? { focus: nextTile.focus } : {}),
      ...(nextTile.variant ? { variant: nextTile.variant } : {}),
    });
  }, [nextTile, openMode]);

  /*
    A level-up used to open its modal ON TOP of the completion card the round
    had just earned (r1 capture: "fully obscuring it until dismissed"). While a
    round is finishing, the level-up belongs to the card — the provider hands it
    down and the card folds it in as a banner. The modal only opens when no card
    is there to claim it.
  */
  const celebrationLevelUp = roundFinished ? levelUpData : null;
  const modalLevelUp = roundFinished ? null : levelUpData;

  // Playing: the XP bar is the shell's header, the round is the one scroller.
  if (selectedMode) {
    return (
      <PracticeCelebrationProvider levelUp={celebrationLevelUp} onAcknowledge={dismissLevelUp}>
        <EducationShell
          className={cn(isRTL && 'rtl')}
          scrollRegionLabel={lesson.name}
          // Active drill = chrome-free: on a measured-square board the tab bar
          // is grid area thrown away. The PICKER (below) keeps its nav — a
          // deep-linked picker with no way home is a dead end.
          chromeFree
          header={
            /*
              The XP bar used to be `position: fixed` with a `pt-16` spacer
              under it, which left the document scrolling behind a floating
              bar on every phone. As the shell's header slot it is the same
              always-visible strip, but now the shell owns the height and the
              round below it is the only thing that scrolls.

              It must stay mounted here: it carries `data-xp-flight-target`,
              and the coins a finished round throws aim at that node.
            */
            <div
              className="flex shrink-0 items-center gap-3 border-b-2 border-neo-white/15 bg-neo-navy px-3 py-2"
              style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))' }}
            >
              <div className="min-w-0 flex-1">
                <XpProgressBar
                  totalXp={totalXp}
                  recentXpGain={sessionXpEarned}
                  size="sm"
                  showNextLevel={false}
                />
              </div>
              {streak.currentStreak > 0 && (
                <StreakBonusIndicator currentStreak={streak.currentStreak} size="sm" />
              )}
            </div>
          }
        >
          {/*
            The round itself. The old layout added a fixed bottom strip carrying
            "next game" while the score card carried "play again" — two halves of
            one decision, 400px apart, with the strip regularly off-screen on a
            phone. Both now live on the completion card, so `onNext` goes down
            into the mode rather than a bar being stacked on top of it.
          */}
          <PracticeModeStage
            mode={selectedMode}
            variant={selectedVariant}
            focus={selectedFocus}
            lessonName={lesson.name}
            language={lesson.language}
            words={practiceWords}
            onFinish={finishRound}
            onBack={handleBack}
            xpSessionData={xpSessionData}
            onNext={nextTile ? handleNextTile : undefined}
            nextLabel={nextTile ? t(nextTile.titleKey) : undefined}
          />
        </EducationShell>

        {/* Only when nothing on screen already celebrated it. */}
        <LevelUpCelebration levelUpData={modalLevelUp} onClose={dismissLevelUp} />
      </PracticeCelebrationProvider>
    );
  }

  /*
    Mode selector view. `title` is not decoration: an untitled EducationHeader
    draws a phone breadcrumb row whose last crumb is the URL segment, and on
    this route that segment is the lesson's UUID — `Lessons › d647f2f8…` sat
    above the games on the r5 capture. Naming the lesson retires that row and
    the picker below therefore stops repeating the name.
  */
  return (
    <EducationShell className={cn(isRTL && 'rtl')} header={<EducationHeader showBackButton title={headerTitle(lesson.name)} />}
      scrollRegionLabel={lesson.name}
      contentClassName="flex flex-col overflow-hidden px-3 py-3 sm:px-6">
      {/*
        `h-full min-h-0 flex-col` is what hands the scroll to the tile grid.
        Without it the picker's own `h-full` resolved against an auto-height
        scroll context, the grid grew to its full 1700px, and the shell scrolled
        instead — taking the title, the XP bar and the readiness line off the
        top of the phone on the first flick.
      */}
      <div className="flex h-full min-h-0 w-full max-w-4xl flex-col mx-auto">
        {startError && (
          <div
            role="alert"
            className="mb-2 shrink-0 rounded-lg border-2 border-neo-pink bg-neo-pink/10 px-3 py-2 text-sm font-medium text-neo-pink"
          >
            {startError}
          </div>
        )}
        {/* XP progress: one slim line. The "next level" preview is a second
            row of chrome on a screen whose job is showing games. */}
        <div className="mb-2 flex shrink-0 items-center gap-3">
          <div className="min-w-0 flex-1">
            <XpProgressBar totalXp={totalXp} size="sm" showNextLevel={false} />
          </div>
          {streak.currentStreak > 0 && (
            <StreakBonusIndicator currentStreak={streak.currentStreak} size="sm" />
          )}
        </div>

        {/*
          One word list, many games. The picker lists every practice type this
          lesson can drive, with a readiness badge per tile, so a student never
          taps into a drill the lesson has no material for.
        */}
        <PracticePicker
          lessonName={lesson.name}
          words={practiceWords}
          language={lesson.language}
          mastery={mastery}
          sessions={progress}
          onSelectMode={openMode}
          onBack={() => router.push(`/${language}/student`)}
        />
      </div>

      {/* Level up celebration modal */}
      <LevelUpCelebration levelUpData={levelUpData} onClose={dismissLevelUp} />
    </EducationShell>
  );
}
