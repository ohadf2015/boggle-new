/**
 * Results Modals Component
 *
 * Centralizes all overlay modals shown on the results page.
 * Extracted from ResultsPage.tsx to reduce complexity and improve maintainability.
 *
 * Modals included:
 * - WordFeedbackModal: Self-healing dictionary validation
 * - ReferralMilestonePopup: Friend milestone notifications
 * - LevelUpCelebration: Epic full-screen GSAP animation
 * - AuthModal: Guest signup prompt
 * - FirstWinSignupModal: Celebratory first win signup
 */

'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useModalQueue } from '@/hooks/useModalQueue';
import { trackModalDismissed } from '@/utils/posthogEngagement';
import type { WordToVote } from '@/types/components';
import type { ReferralMilestone, LevelUpPayload } from '@/shared/types/socket';

// Dynamic imports for modals (loaded after initial render)
const WordFeedbackModal = dynamic(() => import('@/components/voting/WordFeedbackModal'), { ssr: false });
const ReferralMilestonePopup = dynamic(() => import('@/components/engagement/ReferralMilestonePopup'), { ssr: false });
const LevelUpCelebration = dynamic(() => import('@/components/animations/LevelUpCelebration'), { ssr: false });
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });
const FirstWinSignupModal = dynamic(() => import('@/components/auth/FirstWinSignupModal'), { ssr: false });

// ==============================================
// TYPES
// ==============================================

/** Word feedback modal state */
interface WordFeedbackState {
  /** Whether word feedback modal is visible */
  showWordFeedback: boolean;
  /** Word currently being voted on */
  wordToVote: WordToVote | null;
  /** Queue of words pending feedback */
  wordQueue: WordToVote[];
  /** Vote handler callback */
  onVote: (voteType: 'like' | 'dislike', word?: string) => void;
  /** Skip/timeout handler callback */
  onSkip: () => void;
}

/** Referral milestone modal state */
interface ReferralMilestoneState {
  /** Milestone data */
  milestone: ReferralMilestone | null;
  /** Whether milestone modal is visible */
  showReferralMilestone: boolean;
  /** Close handler callback */
  onClose: () => void;
}

/** Level up celebration state */
interface LevelUpState {
  /** Level up data (new level, XP gained, etc.) */
  levelUpData: LevelUpPayload | null;
  /** Whether celebration is visible */
  showLevelUpCelebration: boolean;
  /** Close handler callback */
  setShowLevelUpCelebration: (show: boolean) => void;
  /** Clear level up data after display */
  setLevelUpData?: (data: LevelUpPayload | null) => void;
}

/** Auth modal state */
interface AuthModalState {
  /** Whether auth modal is visible */
  showAuthModal: boolean;
  /** Close handler callback */
  setShowAuthModal: (show: boolean) => void;
}

/** First win signup modal state */
interface FirstWinModalState {
  /** Whether first win modal is visible */
  showFirstWinModal: boolean;
  /** Close handler callback */
  setShowFirstWinModal: (show: boolean) => void;
}

export interface ResultsModalsProps {
  /** Word feedback modal state and handlers */
  wordFeedback: WordFeedbackState;
  /** Referral milestone modal state and handlers */
  referralMilestone: ReferralMilestoneState;
  /** Level up celebration state and handlers */
  levelUp: LevelUpState;
  /** Auth modal state and handlers */
  authModal: AuthModalState;
  /** First win modal state and handlers */
  firstWinModal: FirstWinModalState;

}

// ==============================================
// COMPONENT
// ==============================================

export function ResultsModals({
  wordFeedback,
  referralMilestone,
  levelUp,
  authModal,
  firstWinModal,
}: ResultsModalsProps) {
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const hideExternal = isOnCrazyGamesPlatform;

  const modals = useMemo(
    () => [
      // Level-up celebration disabled on MP results — XP/level shown inline in player card
      { id: 'levelUp', priority: 1, isReady: false },
      { id: 'referralMilestone', priority: 2, isReady: referralMilestone.showReferralMilestone },
      { id: 'firstWin', priority: 3, isReady: !hideExternal && firstWinModal.showFirstWinModal },
      { id: 'auth', priority: 4, isReady: !hideExternal && authModal.showAuthModal },
      { id: 'wordFeedback', priority: 5, isReady: wordFeedback.showWordFeedback && wordFeedback.wordToVote !== null },
    ],
    [
      referralMilestone.showReferralMilestone,
      firstWinModal.showFirstWinModal,
      authModal.showAuthModal,
      wordFeedback.showWordFeedback, wordFeedback.wordToVote,
      hideExternal,
    ]
  );

  const { activeModalId, dismiss } = useModalQueue({ modals });

  return (
    <>
      {/* Word Feedback Modal - Self-healing dictionary validation */}
      <WordFeedbackModal
        isOpen={activeModalId === 'wordFeedback'}
        word={wordFeedback.wordToVote?.word || ''}
        submittedBy={wordFeedback.wordToVote?.submittedBy || ''}
        submitterAvatar={wordFeedback.wordToVote?.submitterAvatar ?? undefined}
        voteInfo={wordFeedback.wordToVote?.voteInfo}
        wordQueue={wordFeedback.wordQueue.map(w => ({
          word: w.word,
          submittedBy: w.submittedBy,
          submitterAvatar: w.submitterAvatar ?? undefined
        }))}
        timeoutSeconds={wordFeedback.wordToVote?.timeoutSeconds || 15}
        onVote={wordFeedback.onVote}
        onSkip={() => { dismiss('wordFeedback'); wordFeedback.onSkip(); }}
        onTimeout={() => { dismiss('wordFeedback'); wordFeedback.onSkip(); }}
      />

      {/* Referral Milestone Popup - Notify when friend hits milestone */}
      <ReferralMilestonePopup
        milestone={referralMilestone.milestone}
        isOpen={activeModalId === 'referralMilestone'}
        onClose={() => { dismiss('referralMilestone'); referralMilestone.onClose(); }}
      />

      {/* Epic Level Up Celebration - Full-screen GSAP animation */}
      {levelUp.levelUpData && (
        <LevelUpCelebration
          level={levelUp.levelUpData.newLevel}
          show={activeModalId === 'levelUp'}
          onDismiss={() => { dismiss('levelUp'); levelUp.setShowLevelUpCelebration(false); levelUp.setLevelUpData?.(null); }}
          autoDismissAfter={5000}
          rewards={{
            unlocks: levelUp.levelUpData.newTitles,
          }}
        />
      )}

      {/* Sign Up Prompt for Guests (non-winners) - Hidden on CrazyGames */}
      {!hideExternal && (
        <AuthModal
          isOpen={activeModalId === 'auth'}
          onClose={() => { trackModalDismissed({ modalId: 'auth_prompt', method: 'close_button' }); dismiss('auth'); authModal.setShowAuthModal(false); }}
          showGuestStats={true}
        />
      )}

      {/* Celebratory First Win Signup Prompt - Hidden on CrazyGames */}
      {/* TODO: Integrate EmailCaptureModal into this queue (it currently self-manages via localStorage) */}
      {!hideExternal && (
        <FirstWinSignupModal
          isOpen={activeModalId === 'firstWin'}
          onClose={() => { trackModalDismissed({ modalId: 'first_win_signup', method: 'close_button' }); dismiss('firstWin'); firstWinModal.setShowFirstWinModal(false); }}
        />
      )}
    </>
  );
}
