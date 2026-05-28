'use client';

/**
 * Pixel Clash — TV View (Scribble Mode)
 * Displays freehand drawings: live artist feed, gallery chains,
 * showdown grids, merge reveal with similarity scores.
 */

import { memo, useEffect, useState } from 'react';
import { setInterval, clearInterval } from 'worker-timers';
import type { Socket } from 'socket.io-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { DrawingDisplay, type DrawingData } from './DrawingCanvas';
import { usePartySounds } from '@/hooks/usePartySounds';

// ==================== Types ====================

interface PhaseUpdateData {
  mode: string;
  phase: string;
  round: number;
  totalRounds: number;
  timeSeconds: number;
  prompt?: string;
  artistUsername?: string;
}

interface MergeRevealData {
  merged: DrawingData;
  original: DrawingData;
  prompt: string;
  score: number;
  artistUsername: string;
  bands: Array<{ builderUsername: string }>;
}

interface ChainRevealData {
  chain: {
    id: string;
    originPlayer: string;
    steps: Array<{ username: string; type: string; content: string | DrawingData }>;
  };
  index: number;
  total: number;
}

interface ShowdownResultsData {
  bestWinner: { id: string; username: string; votes: number };
  funniestWinner: { id: string; username: string; votes: number };
  canvases: Array<{ id: string; username: string; strokes: DrawingData }>;
  prompt: string;
}

type TvPhase =
  | 'waiting'
  | 'relay-artist'
  | 'relay-build'
  | 'relay-merge'
  | 'write-prompt'
  | 'drawing'
  | 'guessing'
  | 'gallery-reveal'
  | 'showdown-draw'
  | 'showdown-vote'
  | 'crown';

// ==================== Component ====================

function PixelClashTvInner({ socket }: { socket: Socket | null }) {
  const { t } = useLanguage();
  const partySounds = usePartySounds();
  const [phase, setPhase] = useState<TvPhase>('waiting');
  const [phaseData, setPhaseData] = useState<PhaseUpdateData | null>(null);
  const [artistStrokes, setArtistStrokes] = useState<DrawingData>([]);
  const [builderStrokes, setBuilderStrokes] = useState<Record<string, DrawingData>>({});
  const [mergeData, setMergeData] = useState<MergeRevealData | null>(null);
  const [chainData, setChainData] = useState<ChainRevealData | null>(null);
  const [showdownResults, setShowdownResults] = useState<ShowdownResultsData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Timer
  useEffect(() => {
    if (timeRemaining <= 0) return;
    if (timeRemaining <= 5) partySounds.onCountdown(timeRemaining);
    const interval = setInterval(() => setTimeRemaining(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [timeRemaining, partySounds]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onPhaseUpdate = (data: PhaseUpdateData) => {
      setPhaseData(data);
      setPhase(data.phase as TvPhase);
      setTimeRemaining(data.timeSeconds);
      partySounds.onPhaseTransition();
      setBuilderStrokes({});
      setMergeData(null);
      setChainData(null);
      setShowdownResults(null);
      if (data.phase === 'relay-artist') {
        setArtistStrokes([]);
      }
    };

    // Live stroke from relay artist
    const onLiveStroke = (data: { paths: DrawingData }) => {
      setArtistStrokes(data.paths);
    };

    // Full artist strokes update
    const onArtistStrokes = (data: { strokes: DrawingData }) => {
      setArtistStrokes(data.strokes);
    };

    // Builder canvas update
    const onCanvasUpdate = (data: { playerId: string; strokes: DrawingData }) => {
      setBuilderStrokes(prev => ({ ...prev, [data.playerId]: data.strokes }));
    };

    const onRelayBands = (data: { bands: Array<Record<string, unknown>>; timeSeconds: number }) => {
      setPhase('relay-build');
      setTimeRemaining(data.timeSeconds);
    };

    const onMergeReveal = (data: MergeRevealData) => {
      setPhase('relay-merge');
      setMergeData(data);
      partySounds.onReveal();
    };

    const onChainReveal = (data: ChainRevealData) => {
      setPhase('gallery-reveal');
      setChainData(data);
      partySounds.onReveal();
    };

    const onShowdownResults = (data: ShowdownResultsData) => {
      setPhase('crown');
      setShowdownResults(data);
      partySounds.onCrowned();
    };

    socket.on('party:pixel:phaseUpdate', onPhaseUpdate);
    socket.on('party:pixel:liveStroke', onLiveStroke);
    socket.on('party:pixel:artistStrokes', onArtistStrokes);
    socket.on('party:pixel:canvasUpdate', onCanvasUpdate);
    socket.on('party:pixel:relayBands', onRelayBands);
    socket.on('party:pixel:mergeReveal', onMergeReveal);
    socket.on('party:pixel:chainReveal', onChainReveal);
    socket.on('party:pixel:showdownResults', onShowdownResults);

    return () => {
      socket.off('party:pixel:phaseUpdate', onPhaseUpdate);
      socket.off('party:pixel:liveStroke', onLiveStroke);
      socket.off('party:pixel:artistStrokes', onArtistStrokes);
      socket.off('party:pixel:canvasUpdate', onCanvasUpdate);
      socket.off('party:pixel:relayBands', onRelayBands);
      socket.off('party:pixel:mergeReveal', onMergeReveal);
      socket.off('party:pixel:chainReveal', onChainReveal);
      socket.off('party:pixel:showdownResults', onShowdownResults);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- partySounds is stable, adding it would cause socket re-registration
  }, [socket]);

  // ==================== Relay: Artist Drawing Live ====================
  if (phase === 'relay-artist' && phaseData) {
    return (
      <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8">
        <div className="mb-4 flex items-center gap-4">
          <span className="text-neo-white font-neo-body text-sm uppercase">
            {t('party.round')} {phaseData.round}/{phaseData.totalRounds}
          </span>
        </div>

        <h2 className="font-neo-display text-neo-cyan text-2xl uppercase mb-2">
          {phaseData.artistUsername} {t('party.isDrawing')}
        </h2>

        <AdaptiveMotion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="my-6"
        >
          {artistStrokes.length > 0 ? (
            <DrawingDisplay paths={artistStrokes} size={400} />
          ) : (
            <div className="w-[400px] h-[400px] border-3 border-neo-cyan/30 border-dashed rounded-neo-lg flex items-center justify-center">
              <span className="text-neo-white font-neo-body animate-pulse">
                {t('party.drawingInProgress')}
              </span>
            </div>
          )}
        </AdaptiveMotion.div>

        <div className={`font-neo-display text-4xl ${timeRemaining <= 5 ? 'text-neo-red animate-neo-wobble' : 'text-neo-white'}`}>
          {timeRemaining}s
        </div>

        {timeRemaining <= 3 && timeRemaining > 0 && (
          <p className="text-neo-cyan font-neo-display uppercase animate-neo-pop mt-2">
            {t('party.lookCarefully')}
          </p>
        )}
      </div>
    );
  }

  // ==================== Relay: Build Phase ====================
  if (phase === 'relay-build') {
    const entries = Object.entries(builderStrokes);
    return (
      <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8">
        <h2 className="font-neo-display text-neo-cyan text-2xl uppercase mb-6">
          {t('party.rebuilding')}
        </h2>

        <div className="flex gap-6 flex-wrap justify-center mb-6">
          {entries.length > 0 ? (
            entries.map(([playerId, strokes]) => (
              <AdaptiveMotion.div
                key={playerId}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <DrawingDisplay paths={strokes} size={250} />
              </AdaptiveMotion.div>
            ))
          ) : (
            <div className="flex gap-6">
              {[1, 2, 3].map(i => (
                <div key={`skel-${i}`} className="w-[250px] h-[250px] border-3 border-neo-cyan/20 border-dashed rounded-neo animate-pulse" />
              ))}
            </div>
          )}
        </div>

        <div className={`font-neo-display text-3xl ${timeRemaining <= 5 ? 'text-neo-red animate-neo-wobble' : 'text-neo-white'}`}>
          {timeRemaining}s
        </div>
      </div>
    );
  }

  // ==================== Relay: Merge Reveal ====================
  if (phase === 'relay-merge' && mergeData) {
    return (
      <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8">
        <div className="flex gap-8 items-center mb-6">
          <div className="text-center">
            <p className="font-neo-display text-neo-white text-sm uppercase mb-2">
              {t('party.rebuilt')}
            </p>
            <AdaptiveMotion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <DrawingDisplay paths={mergeData.merged} size={300} />
            </AdaptiveMotion.div>
          </div>

          <div className="font-neo-display text-neo-white text-3xl">vs</div>

          <div className="text-center">
            <p className="font-neo-display text-neo-white text-sm uppercase mb-2">
              {t('party.original')}
            </p>
            <AdaptiveMotion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <DrawingDisplay paths={mergeData.original} size={300} />
            </AdaptiveMotion.div>
          </div>
        </div>

        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          className="text-center"
        >
          <p className="font-neo-display text-neo-cyan text-3xl uppercase">
            &ldquo;{mergeData.prompt}&rdquo;
          </p>
          <p className="text-neo-white font-neo-body text-sm mt-1">
            {t('party.drawnBy')} {mergeData.artistUsername}
          </p>
        </AdaptiveMotion.div>

        <AdaptiveMotion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 3, type: 'spring', damping: 8 }}
          className="mt-6"
        >
          <div className="bg-neo-navy-elevated border-4 border-neo-cyan rounded-neo-lg shadow-hard-cyan px-8 py-4 text-center">
            <span className="font-neo-display text-5xl text-neo-cyan">
              {mergeData.score}%
            </span>
            <p className="font-neo-body text-neo-white text-sm mt-1">
              {t('party.similarity')}
            </p>
          </div>
        </AdaptiveMotion.div>
      </div>
    );
  }

  // ==================== Telephone: Gallery Reveal ====================
  if (phase === 'gallery-reveal' && chainData) {
    return (
      <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8">
        <p className="text-neo-white font-neo-body text-sm mb-4">
          Chain {chainData.index + 1}/{chainData.total}
        </p>

        <div className="flex flex-wrap gap-4 justify-center max-w-5xl">
          {chainData.chain.steps.map((step, i) => (
            <AdaptiveMotion.div
              key={`${step.username}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 1.5 }}
              className="text-center"
            >
              {step.type === 'write' ? (
                <div className="bg-neo-navy-elevated border-3 border-neo-cyan/40 rounded-neo p-4 min-w-[150px]">
                  <p className="font-neo-body text-neo-white text-sm">&ldquo;{step.content as string}&rdquo;</p>
                  <p className="font-neo-body text-neo-white text-xs mt-1">{step.username}</p>
                </div>
              ) : (
                <div>
                  <DrawingDisplay paths={step.content as DrawingData} size={200} />
                  <p className="font-neo-body text-neo-white text-xs mt-1">{step.username}</p>
                </div>
              )}
              {i < chainData.chain.steps.length - 1 && (
                <div className="text-neo-white mt-2 text-lg">→</div>
              )}
            </AdaptiveMotion.div>
          ))}
        </div>
      </div>
    );
  }

  // ==================== Showdown: Crown ====================
  if (phase === 'crown' && showdownResults) {
    return (
      <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8">
        <h2 className="font-neo-display text-neo-white text-2xl uppercase mb-2">
          &ldquo;{showdownResults.prompt}&rdquo;
        </h2>

        {/* All canvases */}
        <div className="flex gap-4 flex-wrap justify-center mb-8">
          {showdownResults.canvases.map((entry) => {
            const isBest = entry.id === showdownResults.bestWinner.id;
            const isFunniest = entry.id === showdownResults.funniestWinner.id;
            return (
              <AdaptiveMotion.div
                key={entry.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className={`p-2 rounded-neo-lg border-3 ${isBest ? 'border-neo-lime shadow-hard-lime' : isFunniest ? 'border-neo-pink shadow-hard-pink' : 'border-neo-cream/20'}`}>
                  <DrawingDisplay paths={entry.strokes} size={200} />
                </div>
                <p className="font-neo-body text-neo-white text-sm mt-1">{entry.username}</p>
                {isBest && <span className="text-neo-lime font-neo-display text-xs uppercase">Best</span>}
                {isFunniest && <span className="text-neo-pink font-neo-display text-xs uppercase ms-2">Funniest</span>}
              </AdaptiveMotion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // ==================== Generic Waiting States ====================
  if (phase === 'write-prompt' || phase === 'drawing' || phase === 'guessing' || phase === 'showdown-draw' || phase === 'showdown-vote') {
    return (
      <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8">
        <div className="text-6xl mb-4">🎨</div>
        <h2 className="font-neo-display text-neo-cyan text-2xl uppercase">
          {phase === 'write-prompt' ? t('party.everyoneWriting') :
           phase === 'showdown-vote' ? t('party.everyoneVoting') :
           phase === 'drawing' || phase === 'showdown-draw' ? t('party.everyoneDrawing') :
           t('party.everyoneGuessing')}
        </h2>
        <div className={`mt-4 font-neo-display text-3xl ${timeRemaining <= 5 ? 'text-neo-red animate-neo-wobble' : 'text-neo-white'}`}>
          {timeRemaining}s
        </div>
      </div>
    );
  }

  // Default
  return (
    <div className="min-h-screen bg-neo-abyss flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🎨</div>
        <h1 className="font-neo-display text-neo-cyan text-3xl uppercase">Pixel Clash</h1>
        <p className="text-neo-white font-neo-body mt-2 animate-pulse">
          {t('party.starting')}
        </p>
      </div>
    </div>
  );
}

const PixelClashTv = memo(PixelClashTvInner);
PixelClashTv.displayName = 'PixelClashTv';
export default PixelClashTv;
