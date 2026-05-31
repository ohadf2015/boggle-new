'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import GameFeedback from '@/components/feedback/GameFeedback';
import { m, AnimatePresence } from 'framer-motion';
import WatchAdButton from './WatchAdButton';
import DoubleGoldAdButton from '@/components/ads/DoubleGoldAdButton';
import ResultsBannerSlot from '@/components/ads/ResultsBannerSlot';
import CrazyGamesBanner from '@/components/CrazyGamesBanner';
import { Share2, Flame, BookOpen, ArrowLeft, Copy, Check, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { useDailyConfetti } from './results/useDailyConfetti';
import { Loader } from '@/components/ui/Loader';
import { SharePanelModal, XTwitterIcon, WhatsAppIcon } from './results/SharePanelModal';
import { ImagePreviewModal } from './results/ImagePreviewModal';
import { Button } from '@/components/ui/button';
import NextStepPrompt from '@/components/results/NextStepPrompt';
import { ResultsHero } from '@/components/results/shared';
import { displayScore } from '@/utils/scoreDisplay';
import {
  generateShareableResult,
  type DailyChallengeResult,
  type DailyStreak,
} from '@/utils/dailyChallenge';
import DailyLeaderboard from './DailyLeaderboard';
import { DailyRewardClaim } from './DailyRewardClaim';
import { getRewardCoins } from '@/lib/dailyRewards';
import { useAuth } from '@/contexts/AuthContext';
import { GameEmojiShareCard } from '@/components/shared/GameEmojiShareCard';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useDailyResultSubmission } from './results/useDailyResultSubmission';
import {
  shareImageWithNativeShare,
  type ShareImageResult,
} from '@/utils/shareImageGenerator';
// dailyShareImage (620 LOC + canvas rendering) is dynamically imported inside the
// image handlers so it stays out of the results-screen chunk — it only runs on share/download tap.
import { maybeRequestReview, trackPositiveMoment } from '@/lib/reviews/requestReview';

interface DailyChallengeResultsProps {
  result: DailyChallengeResult;
  streak: DailyStreak | null;
  streakMilestone: number | null;
  words: string[];
  longestWord: string;
  countdown: string;
  isNewCompletion: boolean;
  onBack: () => void;
  t: (key: string) => string;
}

/**
 * DailyChallengeResults - Results screen with shareable emoji grid
 */
const DailyChallengeResults: React.FC<DailyChallengeResultsProps> = ({
  result,
  streak,
  streakMilestone,
  words,
  longestWord,
  countdown,
  isNewCompletion,
  onBack,
  t,
}) => {
  const [copied, setCopied] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const { guestFingerprint, guestPlayer, leaderboardKey } = useDailyResultSubmission(result, longestWord, isNewCompletion);
  const [shareImage, setShareImage] = useState<ShareImageResult | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showWords, setShowWords] = useState(false);
  const { profile, isAuthenticated } = useAuth();
  const { showInterstitial } = useInterstitialAd();
  const { submitLeaderboardScore } = useCrazyGames();

  const hasMarkedQuestRef = useRef(false);
  const hasRequestedReviewRef = useRef(false);
  useEffect(() => {
    showInterstitial('daily-complete');
    if (result.score > 0) {
      submitLeaderboardScore(result.score);
    }
    if (!hasMarkedQuestRef.current) {
      // Daily Challenge is no longer tracked in the daily quest system
      // The quest now focuses on Blast, Classic MP, and Word Hunt MP
      hasMarkedQuestRef.current = true;
    }
    // Track positive moment + maybe request review — only on a real result (score > 0),
    // so abandoned/zero attempts don't count toward the review-prompt engagement gate.
    if (result.score > 0 && !hasRequestedReviewRef.current) {
      trackPositiveMoment();
      maybeRequestReview('dailyStreak');
      hasRequestedReviewRef.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    currentUserRank,
    totalPlayers,
    handleCurrentUserRankChange,
    setTotalPlayers,
    fireRankConfettiLocal,
  } = useDailyConfetti(isNewCompletion, result.score, streakMilestone);

  // Generate shareable text with translations
  const shareText = generateShareableResult(result, undefined, t);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') return;
      console.error('Failed to copy:', err);
    }
  }, [shareText]);

  // Handle share to WhatsApp
  const handleWhatsApp = useCallback(() => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText + '\n\n' + t('daily.canYouBeatMyScore'))}`;
    window.open(url, '_blank');
  }, [shareText, t]);

  // Handle share to Twitter/X
  const handleTwitter = useCallback(() => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  }, [shareText]);

  // Handle native share
  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText + '\n\n' + t('daily.canYouBeatMyScore'),
        });
      } catch (err) {
        // User cancelled or error
        console.error('Share failed:', err);
      }
    } else {
      setShowSharePanel(true);
    }
  }, [shareText, t]);

  // Generate personalized share image with funny sentences
  const handleGenerateImage = useCallback(async () => {
    if (isGeneratingImage) return;

    setIsGeneratingImage(true);
    try {
      const { generateDailyShareImage } = await import('@/utils/dailyShareImage');
      const imageResult = await generateDailyShareImage({
        gameType: 'puzzle',
        rank: currentUserRank,
        totalPlayers,
        puzzleNumber: result.puzzleNumber,
        language: result.language,
        score: displayScore(Math.round(result.score)),
        wordCount: result.wordCount,
        displayName: isAuthenticated && profile
          ? profile.display_name || profile.username
          : guestPlayer?.displayName,
        avatarEmoji: isAuthenticated && profile
          ? profile.avatar_emoji
          : guestPlayer?.avatarEmoji,
        avatarImage: isAuthenticated && profile
          ? profile.avatar_image
          : undefined,
      });
      setShareImage(imageResult);
      setShowImagePreview(true);
    } catch (err) {
      console.error('Failed to generate share image:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  }, [result, currentUserRank, totalPlayers, isAuthenticated, profile, guestPlayer, isGeneratingImage]);

  // Share image via native share
  const handleShareImage = useCallback(async () => {
    if (!shareImage) {
      await handleGenerateImage();
      return;
    }

    const success = await shareImageWithNativeShare(
      shareImage,
      shareText + '\n\n' + t('daily.canYouBeatMyScore')
    );

    if (!success) {
      // Fallback: show image preview for manual download/share
      setShowImagePreview(true);
    }
  }, [shareImage, shareText, handleGenerateImage, t]);

  // Download share image
  const handleDownloadImage = useCallback(async () => {
    if (shareImage) {
      const { downloadDailyShareImage } = await import('@/utils/dailyShareImage');
      downloadDailyShareImage(shareImage, 'puzzle', result.puzzleNumber);
    }
  }, [shareImage, result.puzzleNumber]);

  return (
    <m.div
      key="results"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 min-h-0 flex flex-col items-center justify-start p-4 page-content-safe overflow-y-auto overscroll-contain scrollable-area"
    >
      {/* Back button */}
      <m.div className="absolute top-24 sm:top-28 inset-s-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 me-2 rtl:rotate-180" />
          {t('daily.home')}
        </Button>
      </m.div>

      {/* Main content - Cleaner design */}
      {/* On desktop: 2-column grid with score/share left, leaderboard right */}
      <div className="w-full max-w-md lg:max-w-5xl xl:max-w-6xl py-6">
      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">

      {/* LEFT COLUMN on desktop: score, stats, share, words (all existing stacked content) */}
      <div className="text-center space-y-5">

        {/* Hero Zone — unified score + stats */}
        <ResultsHero
          outcomeLabel={isNewCompletion ? t('daily.completed') : t('daily.alreadyPlayed')}
          score={displayScore(Math.round(result.score))}
          subtitle={t('daily.puzzleNumber').replace('{number}', String(result.puzzleNumber))}
          pointsLabel={t('common.points')}
          variant={isNewCompletion ? 'win' : 'neutral'}
          badge={streakMilestone && isNewCompletion ? {
            text: `${t('daily.streakDays').replace('{count}', String(streakMilestone))}`,
            variant: 'milestone',
          } : undefined}
          onScoreClick={() => result.score > 0 && fireRankConfettiLocal(currentUserRank && currentUserRank <= 3 ? currentUserRank : 1)}
          inlineStats
          stats={[
            { label: t('common.words'), value: result.wordCount },
            { label: t('daily.streak'), value: streak?.currentStreak ?? 0, icon: <Flame className="w-4 h-4 text-amber-400" /> },
            { label: t('results.time'), value: `${Math.floor((result.timeSeconds ?? 0) / 60)}:${((result.timeSeconds ?? 0) % 60).toString().padStart(2, '0')}` },
          ]}
        />

        {/* Daily Reward Claim */}
        {isNewCompletion && streak && (
          <>
            <DailyRewardClaim
              coinsEarned={getRewardCoins(streak.currentStreak)}
              currentStreakDay={streak.currentStreak}
              t={t}
            />
            {/* Endowment anchoring: double the daily reward they just saw */}
            <DoubleGoldAdButton
              earnedAmount={getRewardCoins(streak.currentStreak)}
              surface="daily_results_double"
            />
            <WatchAdButton onCoinsEarned={() => {}} t={t} surface="daily_challenge_results" />
          </>
        )}

        {/* Share Section - Streamlined */}
        <m.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          {/* Primary CTA */}
          <Button
            onClick={handleNativeShare}
            className="w-full max-w-btn py-4 text-base font-black uppercase bg-neo-cyan text-neo-black border-3 border-neo-black rounded-xl shadow-hard hover:shadow-hard-lg hover:-translate-y-1 transition-all duration-150"
          >
            <Share2 className="me-2 w-5 h-5" />
            {t('daily.shareScore')}
          </Button>

          {/* Secondary share options — neo-brutalist row */}
          <div className="flex items-center justify-center gap-2">
            <Button
              onClick={handleWhatsApp}
              aria-label="Share on WhatsApp"
              size="sm"
              className="flex-1 py-3 bg-brand-whatsapp hover:bg-brand-whatsapp-hover text-white border-2 border-neo-black rounded-neo shadow-hard-sm transition-all"
            >
              <WhatsAppIcon className="w-4 h-4" />
            </Button>

            <Button
              onClick={handleTwitter}
              aria-label="Share on X"
              size="sm"
              className="flex-1 py-3 bg-neo-navy text-white border-2 border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard transition-all"
            >
              <XTwitterIcon className="w-4 h-4" />
            </Button>

            <Button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              aria-label={t('daily.shareImage')}
              size="sm"
              className="flex-1 py-3 bg-neo-navy text-white border-2 border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard transition-all disabled:opacity-50"
            >
              {isGeneratingImage ? (
                <Loader size="sm" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
            </Button>

            <Button
              onClick={handleCopy}
              aria-label={copied ? t('common.copied') : t('daily.copyToClipboard')}
              size="sm"
              className="flex-1 py-3 bg-neo-navy text-white border-2 border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard transition-all"
            >
              {copied ? (
                <Check className="w-4 h-4 text-neo-cyan" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          {copied && (
            <m.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-neo-cyan font-medium"
            >
              {t('daily.copiedToClipboard')}
            </m.p>
          )}

        </m.div>

        {/* Emoji Share Card */}
        <m.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.52 }}
        >
          <GameEmojiShareCard
            data={{
              mode: 'classic',
              puzzleNumber: result.puzzleNumber,
              score: Math.round(result.score),
              words,
            }}
            t={t}
            language={result.language}
          />
        </m.div>

        {/* Next Step - Suggest Multiplayer (unlimited games!) */}
        <m.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          <NextStepPrompt
            currentMode="daily"
            onBackToLobby={onBack}
            variant="mobile"
          />
        </m.div>

        {/* Next puzzle countdown */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="py-3"
        >
          <p className="text-xs text-neo-white font-bold uppercase tracking-wider">
            {t('daily.nextPuzzleIn')} <span className="font-bold text-neo-cyan">{countdown}</span>
          </p>
        </m.div>

        {/* Words found - Collapsible (left column on desktop) */}
        {words.length > 0 && (
          <m.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <button
              onClick={() => setShowWords(!showWords)}
              className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors mx-auto py-2"
            >
              <BookOpen className="w-4 h-4" />
              <span className="font-medium">{t('common.wordsFound')} ({words.length})</span>
              {showWords ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showWords && (
                <m.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1 justify-center pt-2">
                    {words.map((word, i) => (
                      <span
                        key={`word-${i}-${word}`}
                        className={`px-2 py-1 text-xs font-medium rounded-md ${
                          word === longestWord
                            ? 'bg-neo-yellow text-neo-black border-2 border-neo-black shadow-hard-sm font-black'
                            : 'bg-neo-navy text-neo-white border border-neo-black/30 rounded-neo'
                        }`}
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </m.div>
        )}
      </div>{/* end left column */}

      {/* Native-banner slot (mobile column on stack; web shows nothing — CrazyGamesBanner covers web) */}
      <ResultsBannerSlot placement="daily-complete" className="lg:hidden my-3" />

      {/* RIGHT COLUMN on desktop: leaderboard (on mobile rendered below via normal flow) */}
      <div>
        {/* Today's Players Leaderboard */}
        <m.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <DailyLeaderboard
            key={leaderboardKey}
            puzzleDate={result.puzzleDate}
            language={result.language}
            currentPlayerId={isAuthenticated && profile ? profile.id : null}
            currentGuestFingerprint={!isAuthenticated ? guestFingerprint : null}
            onCurrentUserRankChange={handleCurrentUserRankChange}
            onParticipantCountChange={setTotalPlayers}
            maxVisible={10}
            t={t}
            gameType="puzzle"
          />
        </m.div>
      </div>{/* end right column */}

      </div>{/* end lg:grid */}

      {/* CrazyGames banner — 728x90 desktop, 320x50 mobile */}
      <div className="hidden md:flex justify-center py-2">
        <CrazyGamesBanner size="728x90" />
      </div>
      <div className="flex justify-center py-2 md:hidden">
        <CrazyGamesBanner size="320x50" />
      </div>
      {/* End-of-game sentiment (game_feedback, surface=daily) — only on a fresh
          completion; the shared throttle keeps it rare across all surfaces. */}
      <div className="mt-2 mb-4 max-w-md mx-auto">
        <GameFeedback
          surface="daily"
          eligible={isNewCompletion}
          gameMode="daily"
          throttleKey={String(result.puzzleNumber)}
        />
      </div>
      </div>{/* end outer width wrapper */}

      {/* Share panel for browsers without native share */}
      <AnimatePresence>
        {showSharePanel && (
          <SharePanelModal
            onClose={() => setShowSharePanel(false)}
            onWhatsApp={handleWhatsApp}
            onTwitter={handleTwitter}
            onCopy={handleCopy}
            copied={copied}
            t={t}
          />
        )}
      </AnimatePresence>

      {/* Image preview modal */}
      <AnimatePresence>
        {showImagePreview && shareImage && (
          <ImagePreviewModal
            shareImage={shareImage}
            puzzleNumber={result.puzzleNumber}
            score={result.score}
            onClose={() => setShowImagePreview(false)}
            onShare={handleShareImage}
            onDownload={handleDownloadImage}
            t={t}
          />
        )}
      </AnimatePresence>
    </m.div>
  );
};

export default DailyChallengeResults;
