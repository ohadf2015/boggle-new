/**
 * Results Modals Component
 *
 * Centralizes all overlay modals shown on the results page.
 * Extracted from ResultsPage.tsx to reduce complexity and improve maintainability.
 *
 * Modals included:
 * - WordFeedbackModal: Self-healing dictionary validation
 * - ReferralMilestonePopup: Friend milestone notifications
 * - Avatar unlock reveal: fullscreen "you unlocked X" when the level-up granted
 *   avatar parts (takes the levelUp slot; the old GSAP LevelUpCelebration stays retired)
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
import type { GameResultForShare } from '@/utils/share';
import { buildUnlockReveal } from '@/lib/avatar/revealTrigger';

// Dynamic imports for modals (loaded after initial render)
const WordFeedbackModal = dynamic(() => import('@/components/voting/WordFeedbackModal'), { ssr: false });
const ReferralMilestonePopup = dynamic(() => import('@/components/engagement/ReferralMilestonePopup'), { ssr: false });
const UnlockReveal = dynamic(() => import('@/components/avatar/reveal/ConnectedUnlockReveal'), { ssr: false });
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });
const FirstWinSignupModal = dynamic(() => import('@/components/auth/FirstWinSignupModal'), { ssr: false });
const GameFeedbackCard = dynamic(() => import('@/components/results/GameFeedbackCard'), { ssr: false });
const UnifiedShareModal = dynamic(() => import('@/components/modals/UnifiedShareModal'), { ssr: false });

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

/** Game feedback (rating survey) modal state */
interface GameFeedbackState {
  /** Whether game feedback modal is visible */
  showGameFeedback: boolean;
  /** Close handler callback */
  setShowGameFeedback: (show: boolean) => void;
  /** Game surface (e.g., 'singleplayer', 'mp_round', 'daily') */
  surface: 'singleplayer' | 'mp_round' | 'daily' | 'word_hunt';
  /** Game mode (e.g., 'classic', 'blast') */
  gameMode?: string;
  /** MP session game counter or similar */
  throttleKey?: string;
  /** Whether this feedback modal is eligible to show */
  eligible: boolean;
}

/** Share modal state */
interface ShareModalState {
  /** Whether share modal is visible */
  showShareModal: boolean;
  /** Close handler callback */
  setShowShareModal: (show: boolean) => void;
  /** Game code for share URL */
  gameCode?: string;
  /** Game result data for "Beat My Score" challenges */
  gameResult?: GameResultForShare;
  /** Room name for pre-game share context */
  roomName?: string;
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
  /** Game feedback (rating survey) modal state and handlers */
  gameFeedback?: GameFeedbackState;
  /** Share modal state and handlers */
  shareModal?: ShareModalState;
  /** Translation function */
  t?: (key: string) => string;
  /** User's language code */
  language?: string;
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
  gameFeedback,
  shareModal,
  t = (key) => key,
  language = 'en',
}: ResultsModalsProps) {
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const hideExternal = isOnCrazyGamesPlatform;

  // Avatar parts this level-up granted (null = nothing to reveal). In memory
  // only: the payload IS the trigger, there is no stored seen-marker.
  const unlockReveal = useMemo(() => buildUnlockReveal(levelUp.levelUpData), [levelUp.levelUpData]);

  const modals = useMemo(() => {
    // Modal priority order (lower number = higher priority, shows first):
    // 1. levelUp: avatar unlock reveal, only when the level-up granted parts
    // 2. referralMilestone: Friend milestone notifications (quick, non-intrusive)
    // 3. firstWin: Guest signup after first win (high-priority conversion moment)
    // 4. share: Post-win share prompt (auto-opens exactly once)
    // 5. auth: Guest signup for non-winners (secondary conversion opportunity)
    // 6. wordFeedback: Dictionary word voting (let players resolve word disputes before leaving)
    // 7. gameFeedback: Post-game sentiment rating ("How was that round?") — ONLY after rematch CTA visible.
    //    POLICY: useGameFeedback gates on eligible flag + min-games + cooldown.
    //    Eligible should be true ONLY AFTER rematch CTA is visible and accessible.
    //    For SP: eligible after first game. For MP: eligible after 3rd game in session.

    const baseModals: Array<{ id: string; priority: number; isReady: boolean }> = [
      // Readiness must drop once closed, or the queue's reset never fires.
      { id: 'levelUp', priority: 1, isReady: unlockReveal !== null && levelUp.showLevelUpCelebration },
      { id: 'referralMilestone', priority: 2, isReady: referralMilestone.showReferralMilestone },
      { id: 'firstWin', priority: 3, isReady: !hideExternal && firstWinModal.showFirstWinModal },
      { id: 'share', priority: 4, isReady: shareModal?.showShareModal ?? false },
      { id: 'auth', priority: 5, isReady: !hideExternal && authModal.showAuthModal },
      { id: 'wordFeedback', priority: 6, isReady: wordFeedback.showWordFeedback && wordFeedback.wordToVote !== null },
    ];

    if (gameFeedback) {
      baseModals.push({
        id: 'gameFeedback',
        priority: 7,
        isReady: !hideExternal && gameFeedback.showGameFeedback,
      });
    }

    return baseModals;
  }, [
    unlockReveal,
    levelUp.showLevelUpCelebration,
    referralMilestone.showReferralMilestone,
    firstWinModal.showFirstWinModal,
    authModal.showAuthModal,
    wordFeedback.showWordFeedback, wordFeedback.wordToVote,
    shareModal?.showShareModal,
    gameFeedback,
    hideExternal,
  ]);

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

      {/* Avatar unlock reveal. Dismiss keeps levelUpData: ImprovementPanel's
          level-up flourish and "New unlock!" chip still read it. */}
      {unlockReveal && activeModalId === 'levelUp' && (
        <UnlockReveal
          reveal={unlockReveal}
          onClose={() => { dismiss('levelUp'); levelUp.setShowLevelUpCelebration(false); }}
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

      {/* Post-win Share Prompt - Auto-opens exactly once via useShareOpenGuard */}
      {shareModal && !hideExternal && (
        <UnifiedShareModal
          isOpen={activeModalId === 'share'}
          onClose={() => { trackModalDismissed({ modalId: 'post_win_share', method: 'close_button' }); dismiss('share'); shareModal.setShowShareModal(false); }}
          gameCode={shareModal.gameCode || ''}
          roomName={shareModal.roomName}
          context="post-game"
          gameResult={shareModal.gameResult}
          language={language}
          t={t}
        />
      )}

      {/* Post-game Sentiment Rating Survey - Hidden on CrazyGames */}
      {gameFeedback && !hideExternal && (
        <GameFeedbackCard
          isOpen={activeModalId === 'gameFeedback'}
          onClose={() => { trackModalDismissed({ modalId: 'game_feedback', method: 'close_button' }); dismiss('gameFeedback'); gameFeedback.setShowGameFeedback(false); }}
          surface={gameFeedback.surface}
          gameMode={gameFeedback.gameMode}
          eligible={gameFeedback.eligible}
          throttleKey={gameFeedback.throttleKey}
        />
      )}
    </>
  );
}
