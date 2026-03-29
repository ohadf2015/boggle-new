'use client';

/**
 * Pixel Clash — TV View
 * Shows pixelated artist feed, split animation, live builder canvases,
 * merge reveal, gallery chains, showdown grids.
 */

import { memo, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { PixelGridDisplay, type PixelGrid } from './PixelCanvas';

// ==================== Types ====================

interface PhaseUpdateData {
  mode: string;
  phase: string;
  round: number;
  totalRounds: number;
  timeSeconds: number;
  prompt?: string;
  artistUsername?: string;
  gridSize?: number;
}

interface MergeRevealData {
  merged: PixelGrid;
  original: PixelGrid;
  prompt: string;
  score: number;
  artistUsername: string;
  bands: Array<{ builderUsername: string; startRow: number; endRow: number }>;
}

interface ChainRevealData {
  chain: {
    id: string;
    originPlayer: string;
    steps: Array<{ username: string; type: string; content: string | PixelGrid }>;
  };
  index: number;
  total: number;
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
  const [phase, setPhase] = useState<TvPhase>('waiting');
  const [phaseData, setPhaseData] = useState<PhaseUpdateData | null>(null);
  const [pixelatedCanvas, setPixelatedCanvas] = useState<PixelGrid | null>(null);
  const [pixelationLevel, setPixelationLevel] = useState(0);
  const [builderCanvases, setBuilderCanvases] = useState<Record<string, PixelGrid>>({});
  const [mergeData, setMergeData] = useState<MergeRevealData | null>(null);
  const [chainData, setChainData] = useState<ChainRevealData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Timer
  useEffect(() => {
    if (timeRemaining <= 0) return;
    const interval = setInterval(() => setTimeRemaining(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [timeRemaining]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onPhaseUpdate = (data: PhaseUpdateData) => {
      setPhaseData(data);
      setPhase(data.phase as TvPhase);
      setTimeRemaining(data.timeSeconds);
      setBuilderCanvases({});
      setMergeData(null);
      setChainData(null);
      if (data.phase === 'relay-artist') {
        setPixelatedCanvas(null);
        setPixelationLevel(0);
      }
    };

    const onPixelation = (data: { level: number; canvas?: PixelGrid }) => {
      setPixelationLevel(data.level);
      if (data.canvas) setPixelatedCanvas(data.canvas);
    };

    const onCanvasUpdate = (data: { playerId: string; canvas: PixelGrid }) => {
      setBuilderCanvases(prev => ({ ...prev, [data.playerId]: data.canvas }));
    };

    const onRelayBands = (data: { bands: Array<Record<string, unknown>>; timeSeconds: number }) => {
      setPhase('relay-build');
      setTimeRemaining(data.timeSeconds);
    };

    const onMergeReveal = (data: MergeRevealData) => {
      setPhase('relay-merge');
      setMergeData(data);
    };

    const onChainReveal = (data: ChainRevealData) => {
      setPhase('gallery-reveal');
      setChainData(data);
    };

    socket.on('party:pixel:phaseUpdate', onPhaseUpdate);
    socket.on('party:pixel:pixelationLevel', onPixelation);
    socket.on('party:pixel:canvasUpdate', onCanvasUpdate);
    socket.on('party:pixel:relayBands', onRelayBands);
    socket.on('party:pixel:mergeReveal', onMergeReveal);
    socket.on('party:pixel:chainReveal', onChainReveal);

    return () => {
      socket.off('party:pixel:phaseUpdate', onPhaseUpdate);
      socket.off('party:pixel:pixelationLevel', onPixelation);
      socket.off('party:pixel:canvasUpdate', onCanvasUpdate);
      socket.off('party:pixel:relayBands', onRelayBands);
      socket.off('party:pixel:mergeReveal', onMergeReveal);
      socket.off('party:pixel:chainReveal', onChainReveal);
    };
  }, [socket]);

  // ==================== Relay: Artist Phase ====================
  if (phase === 'relay-artist' && phaseData) {
    return (
      <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8">
        <div className="mb-4 flex items-center gap-4">
          <span className="text-neo-cream/50 font-neo-body text-sm uppercase">
            {t('party.round') || 'Round'} {phaseData.round}/{phaseData.totalRounds}
          </span>
        </div>

        <h2 className="font-neo-display text-neo-cyan text-2xl uppercase mb-2">
          {phaseData.artistUsername} {t('party.isDrawing') || 'is drawing...'}
        </h2>

        {/* Pixelated canvas feed */}
        <AdaptiveMotion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="my-6"
        >
          {pixelatedCanvas ? (
            <div className="relative">
              <PixelGridDisplay grid={pixelatedCanvas} size={300} />
              {/* Pixelation level indicator */}
              <div className="absolute top-2 right-2 bg-neo-black/50 rounded-neo px-2 py-1">
                <span className="text-neo-cyan text-xs font-neo-body">
                  {pixelationLevel === 0 ? '???' : pixelationLevel === 1 ? '??' : pixelationLevel === 2 ? '?' : 'Clear!'}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-[300px] h-[300px] border-3 border-neo-cyan/30 border-dashed rounded-neo-lg flex items-center justify-center">
              <span className="text-neo-cream/30 font-neo-body animate-pulse">
                {t('party.drawingInProgress') || 'Drawing in progress...'}
              </span>
            </div>
          )}
        </AdaptiveMotion.div>

        {/* Timer */}
        <div className={`font-neo-display text-4xl ${timeRemaining <= 5 ? 'text-neo-red animate-neo-wobble' : 'text-neo-cream'}`}>
          {timeRemaining}s
        </div>

        {timeRemaining <= 3 && timeRemaining > 0 && (
          <p className="text-neo-cyan font-neo-display uppercase animate-neo-pop mt-2">
            Look carefully!
          </p>
        )}
      </div>
    );
  }

  // ==================== Relay: Build Phase ====================
  if (phase === 'relay-build') {
    const canvasEntries = Object.entries(builderCanvases);
    return (
      <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8">
        <h2 className="font-neo-display text-neo-cyan text-2xl uppercase mb-6">
          {t('party.rebuilding') || 'Rebuilding!'}
        </h2>

        {/* Builder canvases side by side */}
        <div className="flex gap-6 flex-wrap justify-center mb-6">
          {canvasEntries.length > 0 ? (
            canvasEntries.map(([playerId, canvas]) => (
              <AdaptiveMotion.div
                key={playerId}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <PixelGridDisplay grid={canvas} size={200} />
              </AdaptiveMotion.div>
            ))
          ) : (
            <div className="flex gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-[200px] h-[200px] border-3 border-neo-cyan/20 border-dashed rounded-neo animate-pulse" />
              ))}
            </div>
          )}
        </div>

        <div className={`font-neo-display text-3xl ${timeRemaining <= 5 ? 'text-neo-red animate-neo-wobble' : 'text-neo-cream'}`}>
          {timeRemaining}s
        </div>
      </div>
    );
  }

  // ==================== Relay: Merge Reveal ====================
  if (phase === 'relay-merge' && mergeData) {
    return (
      <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8">
        {/* Side by side: merged vs original */}
        <div className="flex gap-8 items-center mb-6">
          <div className="text-center">
            <p className="font-neo-display text-neo-cream/60 text-sm uppercase mb-2">
              {t('party.rebuilt') || 'Rebuilt'}
            </p>
            <AdaptiveMotion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <PixelGridDisplay grid={mergeData.merged} size={250} />
            </AdaptiveMotion.div>
          </div>

          <div className="font-neo-display text-neo-cream/30 text-3xl">vs</div>

          <div className="text-center">
            <p className="font-neo-display text-neo-cream/60 text-sm uppercase mb-2">
              {t('party.original') || 'Original'}
            </p>
            <AdaptiveMotion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <PixelGridDisplay grid={mergeData.original} size={250} />
            </AdaptiveMotion.div>
          </div>
        </div>

        {/* Prompt reveal */}
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          className="text-center"
        >
          <p className="font-neo-display text-neo-cyan text-3xl uppercase">
            &ldquo;{mergeData.prompt}&rdquo;
          </p>
          <p className="text-neo-cream/50 font-neo-body text-sm mt-1">
            {t('party.drawnBy') || 'Drawn by'} {mergeData.artistUsername}
          </p>
        </AdaptiveMotion.div>

        {/* Similarity score */}
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
            <p className="font-neo-body text-neo-cream/50 text-sm mt-1">
              {t('party.similarity') || 'Match'}
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
        <p className="text-neo-cream/50 font-neo-body text-sm mb-4">
          Chain {chainData.index + 1}/{chainData.total}
        </p>

        <div className="flex flex-wrap gap-4 justify-center max-w-4xl">
          {chainData.chain.steps.map((step, i) => (
            <AdaptiveMotion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 1.5 }}
              className="text-center"
            >
              {step.type === 'write' ? (
                <div className="bg-neo-navy-elevated border-3 border-neo-cyan/40 rounded-neo p-3 min-w-[150px]">
                  <p className="font-neo-body text-neo-cream text-sm">&ldquo;{step.content as string}&rdquo;</p>
                  <p className="font-neo-body text-neo-cream/40 text-xs mt-1">{step.username}</p>
                </div>
              ) : (
                <div>
                  <PixelGridDisplay grid={step.content as PixelGrid} size={150} />
                  <p className="font-neo-body text-neo-cream/40 text-xs mt-1">{step.username}</p>
                </div>
              )}
              {i < chainData.chain.steps.length - 1 && (
                <div className="text-neo-cream/20 mt-2">→</div>
              )}
            </AdaptiveMotion.div>
          ))}
        </div>
      </div>
    );
  }

  // ==================== Generic Waiting States ====================
  if (phase === 'write-prompt' || phase === 'drawing' || phase === 'guessing') {
    return (
      <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8">
        <div className="text-6xl mb-4">🎨</div>
        <h2 className="font-neo-display text-neo-cyan text-2xl uppercase">
          {phase === 'write-prompt' ? (t('party.everyoneWriting') || 'Everyone is writing...') :
           phase === 'drawing' ? (t('party.everyoneDrawing') || 'Everyone is drawing...') :
           (t('party.everyoneGuessing') || 'Everyone is guessing...')}
        </h2>
        <div className={`mt-4 font-neo-display text-3xl ${timeRemaining <= 5 ? 'text-neo-red animate-neo-wobble' : 'text-neo-cream'}`}>
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
        <p className="text-neo-cream/40 font-neo-body mt-2 animate-pulse">
          {t('party.starting') || 'Starting...'}
        </p>
      </div>
    </div>
  );
}

const PixelClashTv = memo(PixelClashTvInner);
PixelClashTv.displayName = 'PixelClashTv';
export default PixelClashTv;
