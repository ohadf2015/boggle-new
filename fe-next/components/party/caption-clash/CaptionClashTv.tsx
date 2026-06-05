'use client';

/**
 * Caption Clash — TV View
 * Shows meme image, typewriter caption reveals, laugh meter, vote results, winner crown.
 */

import { memo, useEffect, useState } from 'react';
import { setInterval, clearInterval } from 'worker-timers';
import type { Socket } from 'socket.io-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
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

function CaptionClashTvInner({ socket }: CaptionClashTvProps) {
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

  // Voting phase — dramatic fullscreen countdown
  if (phase === 'voting' && imageData) {
    const isUrgent = timeRemaining <= 5;
    const pctLeft = Math.max(0, timeRemaining / 20) * 100;
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden transition-colors duration-500 ${isUrgent ? 'bg-neo-black' : 'bg-neo-abyss'}`}>
        {/* Pulse ring behind timer */}
        <div className={`absolute rounded-full border-4 opacity-20 transition-all duration-1000 ${isUrgent ? 'w-[600px] h-[600px] border-neo-red animate-ping' : 'w-[500px] h-[500px] border-neo-pink'}`} />

        {/* Vote Now heading */}
        <AdaptiveMotion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 10 }}
          className="text-center mb-8 relative z-10"
        >
          <div className={`font-neo-display text-6xl sm:text-8xl uppercase tracking-tight leading-none transition-colors duration-300 ${isUrgent ? 'text-neo-red' : 'text-neo-pink'} ${isUrgent ? 'animate-neo-wobble' : ''}`}>
            {t('party.vote') || 'Vote!'}
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-2xl">📱</span>
            <span className="font-neo-body text-neo-white/70 text-lg">
              {t('party.voteOnPhone') || 'Vote on your phone!'}
            </span>
            <span className="text-2xl">📱</span>
          </div>
        </AdaptiveMotion.div>

        {/* Big countdown */}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className={`font-neo-display text-[10rem] leading-none transition-colors duration-300 ${isUrgent ? 'text-neo-red' : 'text-neo-white'} ${timeRemaining <= 3 ? 'animate-neo-pop' : ''}`}>
            {timeRemaining}
          </div>

          {/* Progress bar */}
          <div className="w-64 h-3 bg-neo-navy-elevated border-3 border-neo-cream/20 rounded-neo overflow-hidden">
            <AdaptiveMotion.div
              animate={{ width: `${pctLeft}%` }}
              transition={{ duration: 0.5 }}
              className={`h-full rounded-neo transition-colors duration-500 ${isUrgent ? 'bg-neo-red' : 'bg-neo-pink'}`}
            />
          </div>
        </div>
      </div>
    );
  }

  // Crown phase — dramatic winner reveal + results
  if (phase === 'crown' && voteResults.length > 0) {
    const winner = voteResults.find(r => r.isWinner);
    const revealDelay = voteResults.length * 0.18 + 0.4;
    return (
      <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Decorative corner confetti blobs */}
        <div className="absolute top-0 left-0 text-7xl opacity-60 -translate-x-4 -translate-y-4 rotate-[-20deg] pointer-events-none">🎉</div>
        <div className="absolute top-0 right-0 text-7xl opacity-60 translate-x-4 -translate-y-4 rotate-[20deg] pointer-events-none">🎊</div>
        <div className="absolute bottom-0 left-0 text-5xl opacity-40 -translate-x-2 translate-y-2 rotate-[15deg] pointer-events-none">✨</div>
        <div className="absolute bottom-0 right-0 text-5xl opacity-40 translate-x-2 translate-y-2 rotate-[-15deg] pointer-events-none">⭐</div>

        <div className="relative z-10 w-full max-w-3xl">
          {/* Results bar chart */}
          <div className="space-y-3 mb-10">
            {voteResults.map((result, index) => (
              <AdaptiveMotion.div
                key={result.submission.id}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.18, type: 'spring', stiffness: 280, damping: 24 }}
                className="flex items-center gap-4"
              >
                {/* Caption + author */}
                <div className="w-2/5 text-right shrink-0">
                  <p className={`font-neo-body text-sm leading-snug ${result.isWinner ? 'text-neo-pink font-bold' : 'text-neo-white/80'}`}>
                    &ldquo;{result.submission.text}&rdquo;
                  </p>
                  <p className={`text-[11px] mt-0.5 ${result.isWinner ? 'text-neo-pink/70' : 'text-neo-white/40'}`}>
                    {result.submission.username}
                  </p>
                </div>

                {/* Bar */}
                <div className="flex-1 relative">
                  <div className={`h-9 rounded-neo border-3 overflow-hidden ${result.isWinner ? 'border-neo-pink bg-neo-pink/10' : 'border-neo-cream/15 bg-neo-navy-elevated'}`}>
                    <AdaptiveMotion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${result.percentage}%` }}
                      transition={{ delay: index * 0.18 + 0.25, type: 'spring', stiffness: 180, damping: 22 }}
                      className={`h-full rounded-neo ${result.isWinner ? 'bg-neo-pink' : 'bg-neo-cream/25'}`}
                    />
                  </div>
                  {result.isWinner && (
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-lg leading-none">👑</span>
                  )}
                </div>

                {/* Pct */}
                <span className={`w-12 shrink-0 font-neo-display text-base text-center ${result.isWinner ? 'text-neo-pink' : 'text-neo-white/60'}`}>
                  {result.percentage}%
                </span>
              </AdaptiveMotion.div>
            ))}
          </div>

          {/* Winner spotlight */}
          {winner && (
            <AdaptiveMotion.div
              initial={{ scale: 0, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: revealDelay, type: 'spring', damping: 7, stiffness: 200 }}
              className="text-center border-4 border-neo-pink rounded-neo-lg bg-neo-pink/10 shadow-[0_0_40px_rgba(255,20,147,0.3)] px-8 py-5"
            >
              <div className="text-5xl mb-1">👑</div>
              <p className="font-neo-display text-neo-pink text-3xl uppercase tracking-wide">
                {winner.submission.username}
              </p>
              <p className="font-neo-body text-neo-white/80 text-base mt-1 italic">
                &ldquo;{winner.submission.text}&rdquo;
              </p>
              <p className="font-neo-display text-neo-yellow text-lg mt-2">
                +{winner.points} pts
              </p>
            </AdaptiveMotion.div>
          )}
        </div>
      </div>
    );
  }

  // Default waiting state
  return (
    <div className="min-h-screen bg-neo-abyss flex items-center justify-center relative overflow-hidden">
      {/* Faint grid */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,20,147,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,20,147,0.3) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />
      <AdaptiveMotion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 14 }}
        className="text-center relative z-10"
      >
        <div className="text-8xl mb-5">🖼️</div>
        <h1 className="font-neo-display text-neo-pink text-5xl uppercase tracking-tight leading-none mb-2">
          Caption Clash
        </h1>
        <p className="font-neo-body text-neo-white/60 text-lg mb-6">
          {t('party.captionGame') || 'Write the funniest caption to win!'}
        </p>
        <div className="inline-flex items-center gap-2 border-3 border-neo-pink/40 rounded-neo px-5 py-2 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-neo-pink" />
          <span className="font-neo-body text-neo-pink text-sm uppercase tracking-widest">
            {t('party.starting') || 'Starting...'}
          </span>
        </div>
      </AdaptiveMotion.div>
    </div>
  );
}

const CaptionClashTv = memo(CaptionClashTvInner);
CaptionClashTv.displayName = 'CaptionClashTv';
export default CaptionClashTv;
