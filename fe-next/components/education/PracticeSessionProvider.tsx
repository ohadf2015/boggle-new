'use client';

/**
 * PracticeSessionProvider - XP Context for Practice Activities
 *
 * Wraps practice components (FlashcardReview, SoloPracticeBoard) with XP state.
 * Handles:
 * - XP state from useEducationXp hook
 * - Session-specific tracking (XP earned this session)
 * - Achievement unlock detection
 * - Supabase persistence on session completion
 *
 * Design: Mastery-focused (research pitfall 1 - intrinsic > extrinsic)
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import useEducationXp, { type XpProgress, type LessonStreak } from '@/hooks/useEducationXp';
import type { PracticeStreak } from '@/lib/education/practiceStreak';
import useAchievementUnlock, { type UnlockPayload } from '@/hooks/useAchievementUnlock';
import { UnifiedAchievementModal } from '@/components/achievements/UnifiedAchievementModal';
// supabase import removed — XP persistence handled server-side only
import type { VocabFocus } from '@/lib/education/vocabFocus';
import { practiceXpPayload } from '@/lib/education/practiceXpPayload';
import logger from '@/utils/logger';
import { completionPatchBody } from '@/lib/education/practiceCompletionRecord';
import type { WordResult } from '@/lib/education/wordMemory';
import { publishLevelUp } from '@/lib/avatar/revealTrigger';
import { trackEduPracticeComplete, trackEduError } from '@/lib/education/telemetry';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface CompletePracticeSessionData {
  type: 'flashcard' | 'solo_board' | 'lesson_completion' | 'matching' | 'spelling' | 'blitz' | 'vocab_focus';
  /** vocab_focus only: which skill was drilled. */
  focus?: VocabFocus;
  /**
   * The `practice_sessions.id` the round was started under (from
   * `usePracticeProgress().startSession()`). When present, completion PATCHes
   * `/api/education/practice` to set `completed_at` and award server-side XP —
   * the ONLY writer of both. Omitted for rounds with no persistable session
   * (guest practice, or types like `warmup`/`word_list` the caller already
   * filters out before reaching here).
   */
  sessionId?: string;
  cardsReviewed?: number;
  cardsCorrect?: number;
  vocabularyWordsFound?: string[];
  wordsFound?: string[];
  newWordsFound?: string[];
  /** One entry per answer, for the word memory (server validates each word against the lesson). */
  wordResults?: WordResult[];
  masteryLevel?: 'not_started' | 'started' | 'practicing' | 'mastered';
}

export interface ServerRewards {
  newAwards?: UnlockPayload[] | null;
  practiceStreak?: PracticeStreak | null;
}

export interface PracticeServerOutcome {
  completed: boolean;
  assignmentCompleted: boolean;
}

export interface PracticeSessionContextValue {
  // XP State (from useEducationXp)
  totalXp: number;
  currentLevel: number;
  xpProgress: XpProgress;
  streak: LessonStreak;

  // Session tracking
  sessionXpEarned: number;
  sessionMasteryMessage: string | null;

  // Actions
  /** Resolves with the server's verdict on the round, or null when no session was patched. */
  completePracticeSession: (sessionData: CompletePracticeSessionData) => Promise<PracticeServerOutcome | null>;
  /** For rounds that PATCH the practice route themselves: apply the awards and streak it returned. */
  applyServerRewards: (body: ServerRewards) => void;

  // Loading state
  isLoading: boolean;
}

export interface PracticeSessionProviderProps {
  children: ReactNode;
  studentId: string;
  lessonId: string;
  initialXp?: number;
  initialLevel?: number;
  initialStreak?: number;
}

// ============================================
// CONTEXT
// ============================================

const PracticeSessionContext = createContext<PracticeSessionContextValue | null>(null);

// ============================================
// PROVIDER COMPONENT
// ============================================

export function PracticeSessionProvider({
  children,
  studentId,
  lessonId,
  initialXp,
  initialLevel,
  initialStreak,
}: PracticeSessionProviderProps) {
  // Core XP state from hook
  const {
    totalXp,
    currentLevel,
    xpProgress,
    streak,
    awardPracticeXp,
    applyServerStreak,
    reconcileAwardedXp,
    isLoading: xpLoading,
  } = useEducationXp({
    studentId,
    lessonId,
    initialXp,
    initialLevel,
    initialStreak,
  });

  // Achievement unlock detection
  const { currentUnlock, acknowledgeUnlock, enqueueUnlocks } = useAchievementUnlock({
    studentId,
    enabled: true,
  });

  const applyServerRewards = useCallback(
    ({ newAwards, practiceStreak }: ServerRewards) => {
      if (Array.isArray(newAwards)) enqueueUnlocks(newAwards);
      if (practiceStreak) applyServerStreak(practiceStreak);
    },
    [enqueueUnlocks, applyServerStreak],
  );

  // Session-specific state
  const [sessionXpEarned, setSessionXpEarned] = useState<number>(0);
  const [sessionMasteryMessage, setSessionMasteryMessage] = useState<string | null>(null);
  const [isPersisting, setIsPersisting] = useState<boolean>(false);

  // Guards the server PATCH against a double-send (e.g. a fast double-tap on
  // the same completion). Independent of the server's own idempotency guard
  // (completed_at already set → no re-award) — this just avoids firing the
  // request twice from one client.
  const completedSessionIdsRef = useRef<Set<string>>(new Set());

  /**
   * Complete a practice session and award XP
   * Handles XP calculation, level up detection, and database persistence
   */
  const completePracticeSession = useCallback(
    async (sessionData: CompletePracticeSessionData): Promise<PracticeServerOutcome | null> => {
      setIsPersisting(true);
      let outcome: PracticeServerOutcome | null = null;

      try {
        /*
          One mapping, one place. Each practice type is scored by the server off
          its OWN fields (`wordsSpelled`, `pairsMatched`, `blitzWordsFound`), and
          the branch that used to live here filled only the flashcard and board
          ones — so Spelling, Matching and Blitz all sent an empty payload,
          earned the daily base and nothing per word, and reported "0 words
          correctly" under a card showing a real score.
        */
        const payload = practiceXpPayload(sessionData);

        // Award XP via hook
        const result = await awardPracticeXp({
          type: payload.type,
          sessionData: payload.sessionData as Parameters<typeof awardPracticeXp>[0]['sessionData'],
          streakDays: streak.currentStreak,
        });

        // A saved round shows only what the server granted; a guest round has no server value.
        const serverScored = !!sessionData.sessionId;
        const firstSend = serverScored && !completedSessionIdsRef.current.has(sessionData.sessionId!);
        let earnedXp = serverScored ? 0 : result.totalXp;
        if (!serverScored || firstSend) setSessionXpEarned(earnedXp);
        setSessionMasteryMessage(result.masteryMessage);

        // XP persistence is handled server-side by PATCH /api/education/practice.
        // Do NOT call persistToSupabase() here — it bypasses server validation (C2 fix).
        //
        // `sessionId` is the id `startSession()` created; without it there is
        // no row to complete (guest rounds, or types the caller already
        // filtered out). The ref guards against sending this PATCH twice for
        // the same session from this client.
        if (sessionData.sessionId && !completedSessionIdsRef.current.has(sessionData.sessionId)) {
          completedSessionIdsRef.current.add(sessionData.sessionId);
          try {
            const patchBody = completionPatchBody(sessionData);

            const response = await fetch('/api/education/practice', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(patchBody),
            });

            if (response.ok) {
              const data = await response.json();
              if (data?.levelUp) publishLevelUp(data.levelUp, 'practice');
              // Server is the XP source of truth (it never trusts a
              // client-supplied amount, and an idempotent replay returns the
              // existing session with no re-award) — prefer its number over
              // the client-side estimate once it's back.
              if (typeof data?.session?.xp_awarded === 'number') earnedXp = data.session.xp_awarded;
              // Recorded only as an ATTEMPT (Word Craft below the bar): no XP, and a replay may still finish this session.
              if (data?.session && data.session.completed_at == null) {
                earnedXp = 0;
                completedSessionIdsRef.current.delete(sessionData.sessionId);
              }
              if (data?.session) outcome = { completed: data.session.completed_at != null, assignmentCompleted: data.assignmentCompleted === true };
              applyServerRewards(data ?? {});
            } else {
              logger.error('Failed to complete practice session on server', {
                sessionId: sessionData.sessionId,
                status: response.status,
              });
            }
          } catch (patchError) {
            logger.error('Error completing practice session on server:', patchError);
          }
        }

        if (serverScored) {
          reconcileAwardedXp(result.totalXp, earnedXp);
          if (firstSend) setSessionXpEarned(earnedXp);
        }

        // F1: announce session completion to PostHog so we can build
        // funnels (D1/D7 return, mode mix, drop-off step) without inventing
        // events at every call site.
        trackEduPracticeComplete({
          lessonId,
          practiceType: sessionData.type,
          cardsReviewed: sessionData.cardsReviewed,
          cardsCorrect: sessionData.cardsCorrect,
        });
      } catch (error) {
        logger.error('Error completing practice session:', error);
        trackEduError({ surface: 'practice_session', code: 'complete_failed' });
      } finally {
        setIsPersisting(false);
      }
      return outcome;
    },
    [
      awardPracticeXp,
      reconcileAwardedXp,
      streak,
      applyServerRewards,
      lessonId,
    ]
  );

  // Context value
  const value = useMemo<PracticeSessionContextValue>(
    () => ({
      // XP State
      totalXp,
      currentLevel,
      xpProgress,
      streak,

      // Session tracking
      sessionXpEarned,
      sessionMasteryMessage,

      // Actions
      completePracticeSession,
      applyServerRewards,

      // Loading state
      isLoading: xpLoading || isPersisting,
    }),
    [
      totalXp,
      currentLevel,
      xpProgress,
      streak,
      sessionXpEarned,
      sessionMasteryMessage,
      completePracticeSession,
      applyServerRewards,
      xpLoading,
      isPersisting,
    ]
  );

  return (
    <PracticeSessionContext.Provider value={value}>
      {children}

      {/* Achievement unlock celebration modal */}
      {currentUnlock && (
        <UnifiedAchievementModal
          type="education"
          unlock={currentUnlock}
          onClose={acknowledgeUnlock}
        />
      )}
    </PracticeSessionContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

/**
 * Access the practice session context
 * Must be used within a PracticeSessionProvider
 */
export function usePracticeSession(): PracticeSessionContextValue {
  const context = useContext(PracticeSessionContext);

  if (!context) {
    throw new Error(
      'usePracticeSession must be used within a PracticeSessionProvider'
    );
  }

  return context;
}

// ============================================
// PERSISTENCE HELPER
// ============================================

/**
 * Persist XP and streak to Supabase
 * Uses upsert to handle both new and existing records
 */
// persistToSupabase removed (C2 fix) — all XP persistence goes through
// PATCH /api/education/practice which uses server-side award_education_xp RPC

// ============================================
// EXPORTS
// ============================================

export default PracticeSessionProvider;
