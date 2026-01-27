'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { WordToVote, LevelUpData } from '@/types/components';
import type { MysteryReward } from '@/components/engagement/MysteryRewardPopup';
import type { ReferralMilestone } from '@/shared/types/socket';

// Dynamic imports for modal components
const WordFeedbackModal = dynamic(() => import('@/components/voting/WordFeedbackModal'), { ssr: false });
const MysteryRewardPopup = dynamic(() => import('@/components/engagement/MysteryRewardPopup'), { ssr: false });
const ReferralMilestonePopup = dynamic(() => import('@/components/engagement/ReferralMilestonePopup'), { ssr: false });
const LevelUpCelebration = dynamic(() => import('@/components/animations/LevelUpCelebration'), { ssr: false });
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });
const FirstWinSignupModal = dynamic(() => import('@/components/auth/FirstWinSignupModal'), { ssr: false });

import { shouldHideExternalLogin } from '@/components/CrazyGamesSDK';

// Re-export types for convenience
export type { WordToVote, LevelUpData, MysteryReward, ReferralMilestone };

export interface ResultsOverlayModalsProps {
  // Word Feedback
  showWordFeedback: boolean;
  wordToVote: WordToVote | null;
  wordQueue: WordToVote[];
  onVote: (voteType: 'like' | 'dislike', word?: string) => void;
  onFeedbackSkip: () => void;

  // Mystery Reward
  mysteryReward: MysteryReward | null;
  showMysteryReward: boolean;
  onMysteryRewardClose: () => void;

  // Referral Milestone
  referralMilestone: ReferralMilestone | null;
  showReferralMilestone: boolean;
  onReferralMilestoneClose: () => void;

  // Level Up
  levelUpData: LevelUpData | null;
  showLevelUpCelebration: boolean;
  onLevelUpDismiss: () => void;

  // Auth Modals
  showAuthModal: boolean;
  onAuthModalClose: () => void;
  showFirstWinModal: boolean;
  onFirstWinModalClose: () => void;

  // Translation
  t: (key: string) => string;
}

/**
 * Overlay modals for ResultsPage
 * Extracted to reduce main component complexity
 */
export function ResultsOverlayModals({
  showWordFeedback,
  wordToVote,
  wordQueue,
  onVote,
  onFeedbackSkip,
  mysteryReward,
  showMysteryReward,
  onMysteryRewardClose,
  referralMilestone,
  showReferralMilestone,
  onReferralMilestoneClose,
  levelUpData,
  showLevelUpCelebration,
  onLevelUpDismiss,
  showAuthModal,
  onAuthModalClose,
  showFirstWinModal,
  onFirstWinModalClose,
  t,
}: ResultsOverlayModalsProps) {
  return (
    <>
      {/* Word Feedback Modal - Self-healing dictionary validation */}
      <WordFeedbackModal
        isOpen={showWordFeedback && wordToVote !== null}
        word={wordToVote?.word || ''}
        submittedBy={wordToVote?.submittedBy || ''}
        submitterAvatar={wordToVote?.submitterAvatar ?? undefined}
        voteInfo={wordToVote?.voteInfo}
        wordQueue={wordQueue.map(w => ({
          ...w,
          submitterAvatar: w.submitterAvatar ?? undefined
        }))}
        timeoutSeconds={wordToVote?.timeoutSeconds || 15}
        onVote={onVote}
        onSkip={onFeedbackSkip}
        onTimeout={onFeedbackSkip}
      />

      {/* Mystery Reward Popup - Variable ratio reward system */}
      <MysteryRewardPopup
        reward={mysteryReward}
        isOpen={showMysteryReward}
        onClose={onMysteryRewardClose}
        t={t}
      />

      {/* Referral Milestone Popup - Notify when friend hits milestone */}
      <ReferralMilestonePopup
        milestone={referralMilestone}
        isOpen={showReferralMilestone}
        onClose={onReferralMilestoneClose}
      />

      {/* Epic Level Up Celebration - Full-screen GSAP animation */}
      {levelUpData && (
        <LevelUpCelebration
          level={levelUpData.newLevel}
          show={showLevelUpCelebration}
          onDismiss={onLevelUpDismiss}
          autoDismissAfter={5000}
          rewards={{
            unlocks: levelUpData.newTitles,
          }}
        />
      )}

      {/* Sign Up Prompt for Guests (non-winners) - Hidden on CrazyGames */}
      {!shouldHideExternalLogin() && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={onAuthModalClose}
          showGuestStats={true}
        />
      )}

      {/* Celebratory First Win Signup Prompt - Hidden on CrazyGames */}
      {!shouldHideExternalLogin() && (
        <FirstWinSignupModal
          isOpen={showFirstWinModal}
          onClose={onFirstWinModalClose}
        />
      )}
    </>
  );
}

export default ResultsOverlayModals;
