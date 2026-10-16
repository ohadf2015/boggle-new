'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Socket } from 'socket.io-client';
import { useGameMode } from '@/hooks/gameState/store';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { TvWordDropFeed, FEED_ROWS, type WordDrop } from './TvWordDropFeed';

// ==================== Types ====================

interface TvActivityPanelProps {
  playerScores: Record<string, number>;
  playerWordCounts: Record<string, number>;
  socket: Socket | null;
  t: (path: string, params?: Record<string, string | number>) => string;
  fireRoundActive?: boolean;
  earthquakeShaking?: boolean;
  activityPulse?: boolean;
  wordHuntTargetLength?: number;
  wordHuntAliveCount?: number;
  wordHuntTotalPlayers?: number;
}

interface ActivityEvent {
  id: number;
  wordLength: number;
  comboLevel: number;
  timestamp: number;
}

// ==================== Constants ====================

const BLAST_COLORS: Record<string, string> = {
  short: 'bg-neo-yellow',
  medium: 'bg-neo-orange',
  long: 'bg-neo-pink',
};

// ==================== Blast Panel ====================

const TvBlastActivityPanel = memo<{
  cascadeBlocks: ActivityEvent[];
  activeCombos: number;
  highestCombo: number;
  reducedMotion: boolean;
  t: TvActivityPanelProps['t'];
}>(({ cascadeBlocks, activeCombos, highestCombo, reducedMotion, t }) => {
  const bgGlow = highestCombo >= 10
    ? 'bg-neo-red/20'
    : highestCombo >= 5
      ? 'bg-neo-orange/10'
      : '';

  return (
    <div data-testid="tv-blast-panel" className="flex flex-col h-full">
      {/* Cascade area */}
      <div
        data-testid="blast-cascade-area"
        className={cn('flex-1 relative overflow-hidden', bgGlow)}
      >
        {/* Falling blocks */}
        {cascadeBlocks.map((block) => {
          const colorKey = block.wordLength <= 3 ? 'short' : block.wordLength <= 5 ? 'medium' : 'long';
          const col = block.id % 6;
          return (
            <m.div
              key={block.id}
              data-testid="cascade-block"
              initial={reducedMotion ? { opacity: 1 } : { y: -20, opacity: 1 }}
              animate={reducedMotion ? { opacity: 0 } : { y: 300, opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 1.5, ease: 'easeIn' }}
              className={cn(
                'absolute w-8 h-8 rounded-neo border-2 border-neo-black/30',
                BLAST_COLORS[colorKey],
              )}
              style={{ left: `${10 + col * 15}%`, top: 0 }}
            />
          );
        })}
      </div>
      {/* Stats bar */}
      <div className="flex justify-around p-3 border-t-2 border-neo-black/20">
        <div className="text-center">
          <p className="text-xs font-bold text-neo-cream/60 uppercase">{t('tvBroadcast.activeCombos')}</p>
          <p className="text-xl font-black text-neo-cream">{activeCombos}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-neo-cream/60 uppercase">{t('tvBroadcast.highestCombo')}</p>
          <p className="text-xl font-black text-neo-cream">{highestCombo}</p>
        </div>
      </div>
    </div>
  );
});
TvBlastActivityPanel.displayName = 'TvBlastActivityPanel';

// ==================== Word Hunt Panel ====================

const TvWordHuntActivityPanel = memo<{
  wordsHunted: number;
  blipCount: number;
  reducedMotion: boolean;
  targetLength: number;
  aliveCount: number;
  totalPlayers: number;
  t: TvActivityPanelProps['t'];
}>(({ wordsHunted, blipCount: _blipCount, reducedMotion, targetLength, aliveCount, totalPlayers, t }) => {
  return (
    <div data-testid="tv-wordhunt-panel" className="flex flex-col h-full">
      {/* Target word length indicator */}
      {targetLength > 0 && (
        <div className="flex items-center justify-center gap-1.5 p-3 border-b-2 border-neo-black/20">
          <p className="text-xs font-bold text-neo-cream/60 uppercase me-2">{t('tvBroadcast.targetLength')}:</p>
          {Array.from({ length: targetLength }, (_, i) => (
            <div
              key={`slot-${i}`}
              className="w-6 h-8 rounded border-2 border-neo-pink/60 bg-neo-pink/10 flex items-center justify-center"
            >
              <span className="text-neo-pink font-black text-lg">_</span>
            </div>
          ))}
        </div>
      )}

      {/* Radar visualization */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div
          data-testid="wordhunt-radar"
          className="relative w-48 h-48 rounded-full border-3 border-neo-cyan/40"
        >
          {/* Concentric circles */}
          <div className="absolute inset-4 rounded-full border-2 border-neo-cyan/25" />
          <div className="absolute inset-8 rounded-full border-2 border-neo-cyan/15" />
          <div className="absolute inset-12 rounded-full border-2 border-neo-cyan/10" />
          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-neo-cyan" />
          </div>
          {/* Sweep line */}
          {!reducedMotion && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0deg, color-mix(in srgb, var(--neo-cyan) 15%, transparent) 30deg, transparent 60deg)',
                animation: 'spin 3s linear infinite',
              }}
            />
          )}
        </div>
      </div>
      {/* Stats bar */}
      <div className="flex justify-around items-center p-3 border-t-2 border-neo-black/20">
        <div className="text-center">
          <p className="text-xs font-bold text-neo-cream/60 uppercase">{t('tvBroadcast.wordsHunted')}</p>
          <p className="text-xl font-black text-neo-cream">{wordsHunted}</p>
        </div>
        {totalPlayers > 0 && (
          <div className="text-center">
            <p className="text-xs font-bold text-neo-cream/60 uppercase">{t('tvBroadcast.playersAlive')}</p>
            <p className="text-xl font-black text-neo-lime">{aliveCount}<span className="text-neo-cream/40">/{totalPlayers}</span></p>
          </div>
        )}
        <div className="text-center">
          <p className={cn(
            'text-lg font-black text-neo-cyan uppercase tracking-wider',
            !reducedMotion && 'animate-pulse',
          )}>
            {t('tvBroadcast.hunting')}...
          </p>
        </div>
      </div>
    </div>
  );
});
TvWordHuntActivityPanel.displayName = 'TvWordHuntActivityPanel';

// ==================== Main Component ====================

const TvActivityPanel = memo<TvActivityPanelProps>(({
  playerScores: _playerScores,
  playerWordCounts,
  socket,
  t,
  fireRoundActive = false,
  earthquakeShaking = false,
  activityPulse: _activityPulse,
  wordHuntTargetLength = 0,
  wordHuntAliveCount = 0,
  wordHuntTotalPlayers = 0,
}) => {
  const gameMode = useGameMode() || 'classic';
  const reducedMotion = useReducedMotion() ?? false;

  // Activity tracking via refs to avoid re-renders
  const totalActivityRef = useRef(0);
  const wordLengthSumRef = useRef(0);
  const eventIdRef = useRef(0);

  // Visual state
  const [drops, setDrops] = useState<WordDrop[]>([]);
  const [longest, setLongest] = useState(0);
  const [cascadeBlocks, setCascadeBlocks] = useState<ActivityEvent[]>([]);
  const [activeCombos, setActiveCombos] = useState(0);
  const [highestCombo, setHighestCombo] = useState(0);
  const [wordsHunted, setWordsHunted] = useState(0);
  const [blipCount, setBlipCount] = useState(0);

  // Hype mascot — appears during intense action bursts
  const [showHypeMascot, setShowHypeMascot] = useState(false);
  const recentActivityRef = useRef(0);
  const hypeCooldownRef = useRef(false);

  // Compute aggregate stats
  const totalWords = Object.values(playerWordCounts).reduce((sum, c) => sum + c, 0);
  const avgLength = totalActivityRef.current > 0
    ? (wordLengthSumRef.current / totalActivityRef.current).toFixed(1)
    : '0.0';

  // Handle socket events
  // The batch carries the word itself, not its length.
  const handlePlayerFoundWord = useCallback((data: { word?: string; username?: string; wordLength?: number; comboLevel?: number }) => {
    const wordLength = data.word?.length || data.wordLength || 4;
    const comboLevel = data.comboLevel || 0;

    totalActivityRef.current += 1;
    wordLengthSumRef.current += wordLength;

    const id = ++eventIdRef.current;
    setDrops((prev) => [...prev.slice(-(FEED_ROWS - 1)), { id, username: data.username ?? '', length: wordLength, comboLevel }]);
    setLongest((prev) => Math.max(prev, wordLength));

    // Blast: add cascade block
    setCascadeBlocks((prev) => [...prev.slice(-20), { id, wordLength, comboLevel, timestamp: Date.now() }]);

    // Track combos
    if (comboLevel > 0) {
      setActiveCombos((prev) => prev + 1);
      setTimeout(() => setActiveCombos((prev) => Math.max(0, prev - 1)), 3000);
    }
    setHighestCombo((prev) => Math.max(prev, comboLevel));

    // Word hunt: increment
    setWordsHunted((prev) => prev + 1);
    setBlipCount((prev) => prev + 1);

    // Hype mascot trigger — 3+ words in 3s window
    recentActivityRef.current += 1;
    setTimeout(() => { recentActivityRef.current = Math.max(0, recentActivityRef.current - 1); }, 3000);
    if (recentActivityRef.current >= 3 && !hypeCooldownRef.current) {
      hypeCooldownRef.current = true;
      setShowHypeMascot(true);
      setTimeout(() => setShowHypeMascot(false), 2500);
      setTimeout(() => { hypeCooldownRef.current = false; }, 8000);
    }
  }, []);

  // Socket listener — playerFoundWord is coalesced server-side into
  // playerFoundWordBatch; replay each word through the per-word handler.
  useEffect(() => {
    if (!socket) return;
    const handleBatch = (data: { words?: Array<{ word?: string; username?: string; wordLength?: number; comboLevel?: number }> }) => {
      data.words?.forEach((w) => handlePlayerFoundWord(w));
    };
    socket.on('playerFoundWordBatch', handleBatch);
    return () => {
      socket.off('playerFoundWordBatch', handleBatch);
    };
  }, [socket, handlePlayerFoundWord]);

  return (
    <div
      data-testid="tv-activity-panel"
      className={cn(
        'h-full flex flex-col bg-neo-navy rounded-neo border-3 border-neo-black overflow-hidden relative',
        fireRoundActive && 'ring-2 ring-neo-orange/60',
        earthquakeShaking && !reducedMotion && 'animate-neo-shake',
      )}
      aria-label={t('tvBroadcast.activityPanel')}
    >
      {/* Fire round glow overlay */}
      {fireRoundActive && (
        <div className="absolute inset-0 bg-neo-orange/10 pointer-events-none z-10" />
      )}

      {/* Hype mascot — pops in during intense action bursts (uses existing game mascot) */}
      <AnimatePresence>
        {showHypeMascot && !reducedMotion && (
          <m.div
            initial={{ y: 100, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className="absolute bottom-12 right-4 z-20 pointer-events-none"
            aria-hidden="true"
          >
            <Image
              src="/mascot/celebration.webp"
              alt=""
              width={100}
              height={100}
              className="drop-shadow-[3px_3px_0px_rgb(var(--neo-black))]"
              unoptimized
              aria-hidden="true"
            />
          </m.div>
        )}
      </AnimatePresence>
      {/* Mode-specific panel */}
      {gameMode === 'blast' ? (
        <TvBlastActivityPanel
          cascadeBlocks={cascadeBlocks}
          activeCombos={activeCombos}
          highestCombo={highestCombo}
          reducedMotion={reducedMotion}
          t={t}
        />
      ) : gameMode === 'word-hunt' ? (
        <TvWordHuntActivityPanel
          wordsHunted={wordsHunted}
          blipCount={blipCount}
          reducedMotion={reducedMotion}
          targetLength={wordHuntTargetLength}
          aliveCount={wordHuntAliveCount}
          totalPlayers={wordHuntTotalPlayers}
          t={t}
        />
      ) : (
        <div data-testid="tv-classic-panel" className="h-full">
          <TvWordDropFeed drops={drops} totalWords={totalWords} avgLength={avgLength} longest={longest} t={t} />
        </div>
      )}
    </div>
  );
});

TvActivityPanel.displayName = 'TvActivityPanel';

export default TvActivityPanel;
