'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { m } from 'framer-motion';
import dynamic from 'next/dynamic';
import { RotateCw, Home, Share2, TrendingUp, TrendingDown, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NeoPanel } from '@/components/ui/panel';
import { fireConfetti } from '@/utils/confettiUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { cn } from '@/lib/utils';
import { getChallengeUrl, generateChallengeShareMessage, type ScoreChallenge } from '@/utils/challenges';
import ResultsWinnerBanner from '@/components/results/ResultsWinnerBanner';
import type { SinglePlayerResultsData } from '@/components/singleplayer/SinglePlayerView';

const CrazyGamesBanner = dynamic(() => import('@/components/CrazyGamesBanner'), { ssr: false });
import ResultsBannerSlot from '@/components/ads/ResultsBannerSlot';

interface ChallengeResultsProps {
  results: SinglePlayerResultsData;
  challenge: ScoreChallenge;
  attemptResult: { beatCreator: boolean; scoreDifference: number } | null;
  onPlayAgain: () => void;
  onBackToHome: () => void;
}

/**
 * ChallengeResults - Shows results after completing a challenge
 * Compares player's score against the challenge creator
 */
const ChallengeResults: React.FC<ChallengeResultsProps> = ({
  results,
  challenge,
  attemptResult,
  onPlayAgain,
  onBackToHome,
}) => {
  const { language, t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const { showInterstitial } = useInterstitialAd();
  const { submitLeaderboardScore } = useCrazyGames();

  // Ads + leaderboard on mount
  useEffect(() => {
    showInterstitial('challenge-complete');
    if (results.playerScore > 0) {
      submitLeaderboardScore(results.playerScore);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const beatCreator = attemptResult?.beatCreator ?? results.playerScore > challenge.creatorScore;
  const scoreDiff = attemptResult?.scoreDifference ?? (results.playerScore - challenge.creatorScore);

  const [displayDiff, setDisplayDiff] = useState(0);
  useEffect(() => {
    const absDiff = Math.abs(scoreDiff);
    const duration = 1200;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setDisplayDiff(Math.round(absDiff * Math.sqrt(progress)));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [scoreDiff]);

  // Celebration effect
  useEffect(() => {
    if (beatCreator) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        fireConfetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4'],
        });
        fireConfetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [beatCreator]);

  // Copy challenge link
  const handleCopyLink = useCallback(async () => {
    const url = getChallengeUrl(challenge.challengeCode, 'results-share');
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
    }
  }, [challenge.challengeCode]);

  // Share challenge
  const handleShare = useCallback(async () => {
    const message = generateChallengeShareMessage(challenge, language);
    const url = getChallengeUrl(challenge.challengeCode, 'results-share');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LexiClash Challenge',
          text: message,
          url,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      handleCopyLink();
    }
  }, [challenge, language, handleCopyLink]);

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center bg-neo-navy p-4 overflow-y-auto scrollable-area">
      <m.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="max-w-md lg:max-w-3xl xl:max-w-4xl w-full space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start"
      >
        {/* Hero + Score Comparison */}
        <div>
          <ResultsWinnerBanner
            winner={{ username: t('common.you'), score: results.playerScore }}
            isCurrentUserWinner={beatCreator}
            variant={beatCreator ? 'ranking' : 'completion'}
            rank={beatCreator ? 1 : 2}
            totalPlayers={2}
            customMessage={beatCreator ? t('challengeResults.youWon') : t('challengeResults.soClose')}
            customAnnouncement={beatCreator
              ? t('challengeResults.youBeat', { name: challenge.creatorUsername })
              : t('challengeResults.tryAgainMsg')}
          />

          {/* Score Comparison */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <NeoPanel tone="navy" className="text-center p-4">
              <p className="text-[10px] font-black uppercase text-neo-white mb-1">{t('challengeResults.you')}</p>
              <p className="text-3xl font-black text-neo-cyan">{results.playerScore}</p>
            </NeoPanel>
            <div className="flex items-center justify-center">
              <span className="bg-neo-yellow text-neo-black border-2 border-neo-black rounded-neo font-black px-3 py-1 shadow-hard-sm text-xs uppercase">VS</span>
            </div>
            <NeoPanel tone="navy" className="text-center p-4">
              <p className="text-[10px] font-black uppercase text-neo-white mb-1">{challenge.creatorUsername}</p>
              <p className="text-3xl font-black text-neo-yellow">{challenge.creatorScore}</p>
            </NeoPanel>
          </div>

          {/* Score Difference */}
          <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className={cn(
              'flex items-center justify-center gap-2 p-3 border-3 border-neo-black rounded-neo shadow-hard mt-3',
              beatCreator ? 'bg-neo-lime text-neo-black' : 'bg-neo-pink text-white'
            )}
          >
            {beatCreator ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
            <span className="text-lg font-black">
              {scoreDiff > 0 ? '+' : '-'}{displayDiff} {t('challengeResults.pts')}
            </span>
          </m.div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <NeoPanel tone="navy" className="text-center p-3">
              <p className="text-2xl font-black text-white">{results.playerWords.length}</p>
              <p className="text-[10px] font-black uppercase text-neo-white">{t('challengeResults.words')}</p>
            </NeoPanel>
            <NeoPanel tone="navy" className="text-center p-3">
              <p className="text-2xl font-black text-white">{Math.max(...results.playerWords.map(w => w.length), 0)}</p>
              <p className="text-[10px] font-black uppercase text-neo-white">{t('challengeResults.longest')}</p>
            </NeoPanel>
          </div>
        </div>

        {/* Action Buttons */}
        <m.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="space-y-3 lg:self-center"
        >
          <Button
            onClick={onPlayAgain}
            className="w-full flex items-center justify-center gap-2 p-4 font-black text-lg uppercase rounded-neo border-4 border-neo-black shadow-hard-lg hover:shadow-hard-xl hover:-translate-y-1 transition-all bg-neo-lime text-neo-black"
          >
            <RotateCw className="w-5 h-5" />
            {t('common.playAgain')}
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 p-3 font-bold uppercase rounded-neo border-2 border-neo-black shadow-hard-sm hover:shadow-hard hover:-translate-y-0.5 transition-all bg-neo-cyan text-neo-black"
            >
              <Share2 className="w-4 h-4" />
              {t('common.share')}
            </Button>
            <Button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 p-3 font-bold uppercase rounded-neo border-2 border-neo-black shadow-hard-sm hover:shadow-hard hover:-translate-y-0.5 transition-all bg-neo-yellow text-neo-black"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? t('common.copied') : t('common.copy')}
            </Button>
          </div>

          <Button
            onClick={onBackToHome}
            variant="ghost"
            className="w-full flex items-center justify-center gap-2 p-3 font-bold uppercase rounded-neo text-neo-white hover:text-white hover:bg-neo-white/10"
          >
            <Home className="w-4 h-4" />
            {t('common.backToHome')}
          </Button>

          {/* Banner Ads — CrazyGamesBanner covers web iframe; ResultsBannerSlot covers native AdMob. */}
          <div className="hidden md:block">
            <CrazyGamesBanner size="728x90" />
          </div>
          <div className="md:hidden">
            <CrazyGamesBanner size="320x50" />
          </div>
          <ResultsBannerSlot placement="challenge-complete" className="my-3" />
        </m.div>
      </m.div>
    </div>
  );
};

export default ChallengeResults;
