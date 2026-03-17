'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Trophy, Flame, Target, BookOpen, ArrowLeft, Copy, Check, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { useDailyConfetti } from './results/useDailyConfetti';
import { Loader } from '@/components/ui/Loader';
import { CelebrationMascotWithEntrance } from '@/components/ui/CelebrationMascot';
import { SharePanelModal, XTwitterIcon, WhatsAppIcon } from './results/SharePanelModal';
import { ImagePreviewModal } from './results/ImagePreviewModal';
import { Button } from '@/components/ui/button';
import NextStepPrompt from '@/components/results/NextStepPrompt';
import { hasPlayedToday } from '@/utils/dailyChallenge/storage';
import { LANGUAGE_OPTIONS } from './results/constants';
import type { Language } from '@/types';
import {
  generateShareableResult,
  type DailyChallengeResult,
  type DailyStreak,
} from '@/utils/dailyChallenge';
import DailyLeaderboard from './DailyLeaderboard';
import { useAuth } from '@/contexts/AuthContext';
import { useAdPlacement } from '@/hooks/useAdPlacement';
import { RewardedAdButton } from '@/components/ads/RewardedAdButton';
import { useDailyResultSubmission } from './results/useDailyResultSubmission';
import {
  shareImageWithNativeShare,
  type ShareImageResult,
} from '@/utils/shareImageGenerator';
import {
  generateDailyShareImage,
  downloadDailyShareImage,
} from '@/utils/dailyShareImage';

interface DailyChallengeResultsProps {
  result: DailyChallengeResult;
  streak: DailyStreak | null;
  streakMilestone: number | null;
  words: string[];
  longestWord: string;
  countdown: string;
  isNewCompletion: boolean;
  onBack: () => void;
  onGameLanguageChange?: (lang: Language) => void;
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
  onGameLanguageChange,
  t,
}) => {
  const [copied, setCopied] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const { guestFingerprint, guestPlayer, leaderboardKey } = useDailyResultSubmission(result, longestWord, isNewCompletion);
  const [shareImage, setShareImage] = useState<ShareImageResult | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showSharePreview, setShowSharePreview] = useState(false);
  const [showWords, setShowWords] = useState(false);
  const { profile, isAuthenticated } = useAuth();
  const { showInterstitial } = useAdPlacement();

  useEffect(() => {
    showInterstitial('daily-complete');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    currentUserRank,
    totalPlayers,
    handleCurrentUserRankChange,
    setTotalPlayers,
    fireRankConfettiLocal,
  } = useDailyConfetti(isNewCompletion, result.score, streakMilestone);

  // Get languages that haven't been played today
  const availableLanguages = useMemo(() =>
    LANGUAGE_OPTIONS.filter(
      (option) => option.code !== result.language && !hasPlayedToday(option.code as Language)
    ),
    [result.language]
  );


  // Generate shareable text with translations
  const shareText = generateShareableResult(result, undefined, t);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
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
      const imageResult = await generateDailyShareImage({
        gameType: 'puzzle',
        rank: currentUserRank,
        totalPlayers,
        puzzleNumber: result.puzzleNumber,
        language: result.language,
        score: Math.round(result.score),
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
  const handleDownloadImage = useCallback(() => {
    if (shareImage) {
      downloadDailyShareImage(shareImage, 'puzzle', result.puzzleNumber);
    }
  }, [shareImage, result.puzzleNumber]);

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 min-h-0 flex flex-col items-center justify-start p-4 page-content-safe overflow-y-auto overscroll-contain scrollable-area"
    >
      {/* Back button */}
      <motion.div className="absolute top-24 sm:top-28 start-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 me-2 rtl:rotate-180" />
          {t('daily.home')}
        </Button>
      </motion.div>

      {/* Main content - Cleaner design */}
      {/* On desktop: 2-column grid with score/share left, leaderboard right */}
      <div className="w-full max-w-md lg:max-w-5xl xl:max-w-6xl py-6">
      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">

      {/* LEFT COLUMN on desktop: score, stats, share, words (all existing stacked content) */}
      <div className="text-center space-y-5">

        {/* Completion badge - Simplified */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
        >
          {isNewCompletion ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-neo-cyan/20 rounded-full border border-neo-cyan/40">
              <Trophy className="w-4 h-4 text-neo-cyan" />
              <span className="font-bold text-neo-cyan text-sm uppercase tracking-wide">
                {t('daily.completed')}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-700/50 rounded-full border border-slate-600">
              <Target className="w-4 h-4 text-slate-400" />
              <span className="font-bold text-slate-400 text-sm uppercase tracking-wide">
                {t('daily.alreadyPlayed')}
              </span>
            </div>
          )}
        </motion.div>

        {/* Score - Clear focal point */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          onClick={() => result.score > 0 && fireRankConfettiLocal(currentUserRank && currentUserRank <= 3 ? currentUserRank : 1)}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] py-2 relative"
        >
          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">
            {t('daily.puzzleNumber').replace('{number}', String(result.puzzleNumber))}
          </div>
          <div className="text-7xl md:text-8xl font-black text-neo-lime drop-shadow-[0_0_20px_rgba(255,225,53,0.3)] my-1">
            {Math.round(result.score)}
          </div>
          <div className="text-slate-400 text-sm font-medium">
            {t('common.points')}
          </div>

          {/* Trophy mascot for top 3 finishers */}
          {currentUserRank !== null && currentUserRank <= 3 && isNewCompletion && (
            <div className="absolute -right-2 sm:right-0 top-1/2 -translate-y-1/2 pointer-events-none">
              <CelebrationMascotWithEntrance
                variant="trophy"
                size="sm"
                delay={0.5}
                className="drop-shadow-lg"
              />
            </div>
          )}
        </motion.div>

        {/* Streak milestone - Simplified */}
        {streakMilestone && isNewCompletion && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.3 }}
            className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full border border-amber-500/40"
          >
            <Flame className="w-5 h-5 text-amber-400" />
            <span className="font-black text-amber-400">
              {t('daily.streakDays').replace('{count}', String(streakMilestone))}
            </span>
          </motion.div>
        )}

        {/* Stats - Unified row design */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-3"
        >
          <div className="flex items-center justify-around">
            <div className="text-center px-3">
              <div className="text-2xl font-black text-white">{result.wordCount}</div>
              <div className="text-xs text-slate-400 font-medium">{t('common.words')}</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center px-3">
              <div className="flex items-center justify-center gap-1">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-2xl font-black text-white">{streak?.currentStreak ?? 0}</span>
              </div>
              <div className="text-xs text-slate-400 font-medium">{t('daily.streak')}</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center px-3">
              <div className="text-2xl font-black text-white">
                {Math.floor((result.timeSeconds ?? 0) / 60)}:{((result.timeSeconds ?? 0) % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-slate-400 font-medium">{t('results.time')}</div>
            </div>
          </div>
        </motion.div>

        {/* Share Section - Streamlined */}
        <motion.div
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

          {/* Secondary share options - Cleaner row */}
          <div className="flex items-center justify-center gap-2">
            <Button
              onClick={handleWhatsApp}
              aria-label="Share on WhatsApp"
              size="sm"
              className="flex-1 py-3 bg-brand-whatsapp hover:bg-brand-whatsapp-hover text-white border-2 border-slate-600 rounded-lg transition-all"
            >
              <WhatsAppIcon className="w-4 h-4" />
            </Button>

            <Button
              onClick={handleTwitter}
              aria-label="Share on X"
              size="sm"
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white border-2 border-slate-600 rounded-lg transition-all"
            >
              <XTwitterIcon className="w-4 h-4" />
            </Button>

            <Button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              aria-label={t('daily.shareImage')}
              size="sm"
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white border-2 border-slate-600 rounded-lg transition-all disabled:opacity-50"
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
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white border-2 border-slate-600 rounded-lg transition-all"
            >
              {copied ? (
                <Check className="w-4 h-4 text-neo-cyan" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          {copied && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-neo-cyan font-medium"
            >
              {t('daily.copiedToClipboard')}
            </motion.p>
          )}

          {/* Collapsible share preview */}
          <button
            onClick={() => setShowSharePreview(!showSharePreview)}
            className="flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-400 transition-colors mx-auto"
          >
            {showSharePreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showSharePreview ? t('common.hidePreview') : t('common.showPreview')}
          </button>

          <AnimatePresence>
            {showSharePreview && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-slate-900 rounded-lg border border-slate-700 p-3 text-left">
                  <pre className="text-white text-xs font-mono whitespace-pre-wrap leading-relaxed">
                    {shareText}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Rewarded Ad: Retry Daily Challenge */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.52 }}
          className="pt-2"
        >
          <RewardedAdButton
            name="daily-retry"
            onReward={() => {
              // Return to daily hub to retry the challenge
              onBack();
            }}
            className="w-full max-w-btn"
          >
            {t('daily.watchAdRetry') || 'Watch Ad to Retry'}
          </RewardedAdButton>
        </motion.div>

        {/* Next Step - Suggest Multiplayer */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="pt-4"
        >
          <NextStepPrompt
            currentMode="daily"
            onBackToLobby={onBack}
            variant="mobile"
          />
        </motion.div>

        {/* Try Another Language */}
        {availableLanguages.length > 0 && onGameLanguageChange && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="pt-4 border-t border-slate-700/50"
          >
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">
              {t('wordHunt.results.tryAnotherLanguage')}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {availableLanguages.map((option) => (
                <Button
                  key={option.code}
                  onClick={() => onGameLanguageChange(option.code as Language)}
                  size="sm"
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 rounded-lg transition-all flex items-center gap-1.5"
                >
                  <span className="text-base">{option.flag}</span>
                  <span className="font-medium text-xs">{option.name}</span>
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Next puzzle countdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="py-3"
        >
          <p className="text-xs text-slate-500">
            {t('daily.nextPuzzleIn')} <span className="font-bold text-neo-cyan">{countdown}</span>
          </p>
        </motion.div>

        {/* Words found - Collapsible (left column on desktop) */}
        {words.length > 0 && (
          <motion.div
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
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1 justify-center pt-2">
                    {words.map((word, i) => (
                      <span
                        key={i}
                        className={`px-2 py-1 text-xs font-medium rounded-md ${
                          word === longestWord
                            ? 'bg-neo-lime/20 text-neo-lime border border-neo-lime/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>{/* end left column */}

      {/* RIGHT COLUMN on desktop: leaderboard (on mobile rendered below via normal flow) */}
      <div>
        {/* Today's Players Leaderboard */}
        <motion.div
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
        </motion.div>
      </div>{/* end right column */}

      </div>{/* end lg:grid */}
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
    </motion.div>
  );
};

export default DailyChallengeResults;
