'use client';

/**
 * Caption Clash — TV View
 * Shows meme image, typewriter caption reveals, laugh meter, vote results, winner crown.
 */

import { memo, useEffect, useState, useCallback } from 'react';
import { setInterval, clearInterval } from 'worker-timers';
import type { Socket } from 'socket.io-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { usePartySounds } from '@/hooks/usePartySounds';

// ==================== Types ====================

interface CaptionSubmission {
  id: string;
  username: string;
  text: string;
  submittedAt: number;
}

interface VoteResult {
  submission: CaptionSubmission;
  votes: number;
  percentage: number;
  isWinner: boolean;
  points: number;
}

interface ImageReadyData {
  imageUrl: string;
  imageId: string;
  round: number;
  totalRounds: number;
  isSpeedRound: boolean;
  isRoastRound: boolean;
  roastTarget?: string;
  writeTimeSeconds: number;
}

type CaptionPhase = 'waiting' | 'writing' | 'lineup' | 'voting' | 'crown';

// ==================== Props ====================

interface CaptionClashTvProps {
  socket: Socket | null;
  roomCode: string;
}

// ==================== Component ====================

function CaptionClashTvInner({ socket, roomCode }: CaptionClashTvProps) {
  const { t } = useLanguage();
  const partySounds = usePartySounds();
  const [phase, setPhase] = useState<CaptionPhase>('waiting');
  const [imageData, setImageData] = useState<ImageReadyData | null>(null);
  const [submissionCount, setSubmissionCount] = useState({ count: 0, total: 0 });
  const [wordCloud, setWordCloud] = useState<Array<{ word: string; count: number }>>([]);
  const [revealedCaption, setRevealedCaption] = useState<{ submission: CaptionSubmission; index: number; total: number } | null>(null);
  const [laughCounts, setLaughCounts] = useState<Record<string, number>>({});
  const [voteResults, setVoteResults] = useState<VoteResult[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) return;
    if (timeRemaining <= 5) partySounds.onCountdown(timeRemaining);
    const interval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining, partySounds]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onImageReady = (data: ImageReadyData) => {
      setImageData(data);
      setPhase('writing');
      setSubmissionCount({ count: 0, total: 0 });
      setWordCloud([]);
      setRevealedCaption(null);
      setVoteResults([]);
      setLaughCounts({});
      setTimeRemaining(data.writeTimeSeconds);
      partySounds.onPhaseStart();
    };

    const onSubmissionCount = (data: { count: number; total: number }) => {
      setSubmissionCount(data);
    };

    const onWordCloud = (data: { words: Array<{ word: string; count: number }> }) => {
      setWordCloud(data.words);
    };

    const onRevealCaption = (data: { submission: CaptionSubmission; index: number; total: number }) => {
      setPhase('lineup');
      setRevealedCaption(data);
      partySounds.onReveal();
    };

    const onLaughUpdate = (data: { submissionId: string; count: number }) => {
      setLaughCounts(prev => ({ ...prev, [data.submissionId]: data.count }));
    };

    const onVoteResults = (data: { results: VoteResult[] }) => {
      setPhase('crown');
      setVoteResults(data.results);
      partySounds.onCrowned();
    };

    const onPhaseChange = (data: { phase: string; gameState: Record<string, unknown> | null }) => {
      if (data.gameState && (data.gameState as Record<string, unknown>).phase === 'voting') {
        setPhase('voting');
        setTimeRemaining(20);
        partySounds.onPhaseTransition();
      }
    };

    socket.on('party:caption:imageReady', onImageReady);
    socket.on('party:caption:submissionCount', onSubmissionCount);
    socket.on('party:caption:wordCloud', onWordCloud);
    socket.on('party:caption:revealCaption', onRevealCaption);
    socket.on('party:caption:laughUpdate', onLaughUpdate);
    socket.on('party:caption:voteResults', onVoteResults);
    socket.on('party:phaseChange', onPhaseChange);

    return () => {
      socket.off('party:caption:imageReady', onImageReady);
      socket.off('party:caption:submissionCount', onSubmissionCount);
      socket.off('party:caption:wordCloud', onWordCloud);
      socket.off('party:caption:revealCaption', onRevealCaption);
      socket.off('party:caption:laughUpdate', onLaughUpdate);
      socket.off('party:caption:voteResults', onVoteResults);
      socket.off('party:phaseChange', onPhaseChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- partySounds is stable, adding it would cause socket re-registration
  }, [socket]);

  // ==================== Render Phases ====================

  // Writing phase — show image + submission counter + word cloud
  if (phase === 'writing' && imageData) {
    return (
      <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8">
        {/* Round info */}
        <div className="mb-4 flex items-center gap-4">
          <span className="font-neo-body text-neo-white text-sm uppercase">
            {t('party.round') || 'Round'} {imageData.round}/{imageData.totalRounds}
          </span>
          {imageData.isSpeedRound && (
            <span className="bg-neo-red border-2 border-neo-black rounded-neo px-2 py-0.5 text-neo-black text-xs font-bold uppercase animate-neo-wobble">
              Speed Round!
            </span>
          )}
          {imageData.isRoastRound && (
            <span className="bg-neo-pink border-2 border-neo-black rounded-neo px-2 py-0.5 text-neo-black text-xs font-bold uppercase">
              Roast: {imageData.roastTarget}
            </span>
          )}
        </div>

        {/* Meme Image */}
        <AdaptiveMotion.div
          initial={{ scale: 0.8, opacity: 0, rotate: -3 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12 }}
          className="border-4 border-neo-black rounded-neo-lg shadow-hard-xl overflow-hidden mb-6 max-w-lg"
        >
          <div className="bg-neo-gray aspect-video flex items-center justify-center text-6xl">
            {/* Placeholder until actual images are added */}
            {imageData.imageId === 'confused-cat' ? '🐱❓' :
             imageData.imageId === 'disaster-girl' ? '👧🔥' :
             imageData.imageId === 'this-is-fine' ? '🐶☕🔥' :
             imageData.imageId === 'distracted-bf' ? '👫👀👩' :
             imageData.imageId === 'success-kid' ? '👶✊' :
             '🖼️'}
          </div>
        </AdaptiveMotion.div>

        {/* Timer */}
        <div className={`font-neo-display text-4xl mb-4 ${timeRemaining <= 5 ? 'text-neo-red animate-neo-wobble' : 'text-neo-white'}`}>
          {timeRemaining}s
        </div>

        {/* Submission counter */}
        <div className="font-neo-body text-neo-white mb-4">
          {submissionCount.count}/{submissionCount.total} {t('party.submitted') || 'submitted'}
        </div>

        {/* Word Cloud */}
        {wordCloud.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 max-w-xl">
            {wordCloud.map(({ word, count }) => (
              <span
                key={word}
                className="bg-neo-navy-elevated border-2 border-neo-pink/30 rounded-neo px-2 py-1 text-neo-pink font-neo-body"
                style={{ fontSize: `${Math.min(1.5, 0.7 + count * 0.15)}rem` }}
              >
                {word}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Lineup phase — reveal captions one by one
  if (phase === 'lineup' && revealedCaption && imageData) {
    const laughCount = laughCounts[revealedCaption.submission.id] || 0;
    return (
      <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8">
        {/* Image (smaller) */}
        <div className="border-3 border-neo-black rounded-neo shadow-hard overflow-hidden mb-6 w-64">
          <div className="bg-neo-gray aspect-video flex items-center justify-center text-4xl">
            🖼️
          </div>
        </div>

        {/* Caption reveal with typewriter effect */}
        <AdaptiveMotion.div
          key={revealedCaption.submission.id}
          initial={{ opacity: 0, y: 30, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          className="bg-neo-navy-elevated border-4 border-neo-pink rounded-neo-lg shadow-hard-pink p-6 max-w-2xl"
        >
          <p className="font-neo-display text-neo-white text-2xl text-center leading-relaxed">
            &ldquo;{revealedCaption.submission.text}&rdquo;
          </p>
        </AdaptiveMotion.div>

        {/* Laugh meter */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-2xl">😂</span>
          <div className="w-48 bg-neo-navy-elevated border-3 border-neo-cream/20 rounded-neo h-6 overflow-hidden">
            <AdaptiveMotion.div
              animate={{ width: `${Math.min(100, laughCount * 5)}%` }}
              className="h-full bg-neo-pink rounded-neo"
              transition={{ type: 'spring', damping: 20 }}
            />
          </div>
          <span className="font-neo-display text-neo-white text-lg">{laughCount}</span>
        </div>

        {/* Caption index */}
        <p className="mt-4 text-neo-white font-neo-body text-sm">
          {revealedCaption.index + 1}/{revealedCaption.total}
        </p>
      </div>
    );
  }

  // Voting phase — show all captions
  if (phase === 'voting' && imageData) {
    return (
      <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8">
        <h2 className="font-neo-display text-neo-pink text-3xl uppercase mb-4">
          {t('party.vote') || 'Vote!'}
        </h2>
        <div className={`font-neo-display text-2xl mb-6 ${timeRemaining <= 5 ? 'text-neo-red animate-neo-wobble' : 'text-neo-white'}`}>
          {timeRemaining}s
        </div>
        <p className="text-neo-white font-neo-body">
          {t('party.voteOnPhone') || 'Vote on your phone!'}
        </p>
      </div>
    );
  }

  // Crown phase — show vote results
  if (phase === 'crown' && voteResults.length > 0) {
    const winner = voteResults.find(r => r.isWinner);
    return (
      <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8">
        {/* Results bar chart */}
        <div className="w-full max-w-3xl space-y-3 mb-8">
          {voteResults.map((result, index) => (
            <AdaptiveMotion.div
              key={result.submission.id}
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.2, type: 'spring', stiffness: 300, damping: 25 }}
              className="flex items-center gap-4"
            >
              <div className="w-1/3 text-right">
                <p className={`font-neo-body text-sm truncate ${result.isWinner ? 'text-neo-pink font-bold' : 'text-neo-white'}`}>
                  &ldquo;{result.submission.text}&rdquo;
                </p>
                <p className="text-neo-white text-xs">{result.submission.username}</p>
              </div>
              <div className="flex-1 bg-neo-navy-elevated border-3 border-neo-cream/20 rounded-neo h-8 overflow-hidden">
                <AdaptiveMotion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.percentage}%` }}
                  transition={{ delay: index * 0.2 + 0.3, type: 'spring', stiffness: 200, damping: 20 }}
                  className={`h-full rounded-neo ${result.isWinner ? 'bg-neo-pink' : 'bg-neo-cream/20'}`}
                />
              </div>
              <span className="w-16 font-neo-display text-neo-white text-sm text-center">
                {result.percentage}%
              </span>
            </AdaptiveMotion.div>
          ))}
        </div>

        {/* Winner crown */}
        {winner && (
          <AdaptiveMotion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: voteResults.length * 0.2 + 0.5, type: 'spring', damping: 8 }}
            className="text-center"
          >
            <div className="text-5xl mb-2">👑</div>
            <p className="font-neo-display text-neo-pink text-xl uppercase">
              {winner.submission.username}
            </p>
            <p className="font-neo-body text-neo-white text-sm mt-1">
              +{winner.points} pts
            </p>
          </AdaptiveMotion.div>
        )}
      </div>
    );
  }

  // Default waiting state
  return (
    <div className="min-h-screen bg-neo-abyss flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🖼️</div>
        <h1 className="font-neo-display text-neo-pink text-3xl uppercase">Caption Clash</h1>
        <p className="text-neo-white font-neo-body mt-2 animate-pulse">
          {t('party.starting') || 'Starting...'}
        </p>
      </div>
    </div>
  );
}

const CaptionClashTv = memo(CaptionClashTvInner);
CaptionClashTv.displayName = 'CaptionClashTv';
export default CaptionClashTv;
