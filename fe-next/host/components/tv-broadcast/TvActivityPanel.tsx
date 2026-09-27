'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Socket } from 'socket.io-client';
import { useGameMode } from '@/hooks/gameState/store';
import { cn } from '@/lib/utils';
import Image from 'next/image';

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

const TILE_COLORS = [
  'bg-neo-yellow/60', 'bg-neo-orange/50', 'bg-neo-pink/40',
  'bg-neo-cyan/50', 'bg-neo-yellow/40', 'bg-neo-orange/60',
  'bg-neo-pink/50', 'bg-neo-cyan/40', 'bg-neo-yellow/50',
  'bg-neo-orange/40', 'bg-neo-pink/60', 'bg-neo-cyan/60',
  'bg-neo-yellow/45', 'bg-neo-orange/55', 'bg-neo-pink/45',
  'bg-neo-cyan/55',
];

const BLAST_COLORS: Record<string, string> = {
  short: 'bg-neo-yellow',
  medium: 'bg-neo-orange',
  long: 'bg-neo-pink',
};

// ==================== Classic Panel ====================

const TvClassicActivityPanel = memo<{
  totalWords: number;
  avgLength: string;
  pulsingTiles: Set<number>;
  reducedMotion: boolean;
  t: TvActivityPanelProps['t'];
}>(({ totalWords, avgLength, pulsingTiles, reducedMotion, t }) => {
  return (
    <div data-testid="tv-classic-panel" className="flex flex-col h-full">
      {/* Abstract 4x4 grid */}
      <div className="flex-1 grid grid-cols-4 grid-rows-4 gap-2 p-4">
        {Array.from({ length: 16 }, (_, i) => (
          <div
            key={`tile-${i}`}
            data-testid="abstract-tile"
            data-pulsing={pulsingTiles.has(i) ? 'true' : undefined}
            className={cn(
              'rounded-neo border-2 border-neo-black/20 transition-all duration-300',
              TILE_COLORS[i],
              pulsingTiles.has(i) && !reducedMotion && 'animate-pulse ring-2 ring-neo-yellow',
            )}
          />
        ))}
      </div>
      {/* Stats bar */}
      <div className="flex justify-around p-3 border-t-2 border-neo-black/20">
        <div className="text-center">
          <p className="text-xs font-bold text-neo-cream/60 uppercase">{t('tvBroadcast.totalWords')}</p>
          <p className="text-xl font-black text-neo-cream">{totalWords}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-neo-cream/60 uppercase">{t('tvBroadcast.avgLength')}</p>
          <p className="text-xl font-black text-neo-cream">{avgLength}</p>
        </div>
      </div>
    </div>
  );
});
TvClassicActivityPanel.displayName = 'TvClassicActivityPanel';

// ==================== Blast Panel ====================

const TvBlastActivityPanel = memo<{
  cascadeBlocks: ActivityEvent[];
  activeCombos: number;
  highestCombo: number;
  reducedMotion: boolean;
  t: TvActivityPanelProps['t'];
}>(({ cascadeBlocks, activeCombos, highestCombo, reducedMotion, t }) => {
  const bgGlow = highestCombo >= 10
    ? 'bg-linear-to-b from-red-900/30 to-transparent'
    : highestCombo >= 5
      ? 'bg-linear-to-b from-orange-900/20 to-transparent'
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
                background: 'conic-gradient(from 0deg, transparent 0deg, rgba(0,255,255,0.15) 30deg, transparent 60deg)',
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

const MODE_BADGE_KEYS: Record<string, string> = {
  classic: 'tvBroadcast.modeClassic',
  blast: 'tvBroadcast.modeBlast',
  'word-hunt': 'tvBroadcast.modeWordHunt',
};

const TvActivityPanel = memo<TvActivityPanelProps>(({
  playerScores: _playerScores,
  playerWordCounts,
  socket,
  t,
  fireRoundActive = false,
  earthquakeShaking = false,
  activityPulse,
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
  const [pulsingTiles, setPulsingTiles] = useState<Set<number>>(new Set());
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
  const avgLength = totalWords > 0
    ? (wordLengthSumRef.current / Math.max(totalActivityRef.current, 1)).toFixed(1)
    : '0.0';

  // Handle socket events
  const handlePlayerFoundWord = useCallback((data: { wordLength?: number; comboLevel?: number }) => {
    const wordLength = data.wordLength || 4;
    const comboLevel = data.comboLevel || 0;

    totalActivityRef.current += 1;
    wordLengthSumRef.current += wordLength;

    // Classic: pulse random tiles
    const tilesToPulse = new Set<number>();
    const count = comboLevel >= 5 ? 16 : Math.min(2 + Math.floor(Math.random() * 3), 4);
    while (tilesToPulse.size < count) {
      tilesToPulse.add(Math.floor(Math.random() * 16));
    }
    setPulsingTiles(tilesToPulse);
    setTimeout(() => setPulsingTiles(new Set()), 400);

    // Blast: add cascade block
    const id = ++eventIdRef.current;
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
    const handleBatch = (data: { words?: Array<{ wordLength?: number; comboLevel?: number }> }) => {
      data.words?.forEach((w) => handlePlayerFoundWord(w));
    };
    socket.on('playerFoundWordBatch', handleBatch);
    return () => {
      socket.off('playerFoundWordBatch', handleBatch);
    };
  }, [socket, handlePlayerFoundWord]);

  // Handle activityPulse prop
  useEffect(() => {
    if (activityPulse) {
      const tilesToPulse = new Set<number>();
      while (tilesToPulse.size < 3) {
        tilesToPulse.add(Math.floor(Math.random() * 16));
      }
      setPulsingTiles(tilesToPulse);
      const timer = setTimeout(() => setPulsingTiles(new Set()), 400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [activityPulse]);

  const modeBadgeKey = MODE_BADGE_KEYS[gameMode] || MODE_BADGE_KEYS.classic;

  return (
    <div
      data-testid="tv-activity-panel"
      className={cn(
        'h-full flex flex-col bg-neo-navy rounded-neo border-3 border-neo-black overflow-hidden relative',
        fireRoundActive && 'ring-2 ring-orange-500/60',
        earthquakeShaking && !reducedMotion && 'animate-neo-shake',
      )}
      aria-label={t('tvBroadcast.activityPanel')}
    >
      {/* Fire round glow overlay */}
      {fireRoundActive && (
        <div className="absolute inset-0 bg-linear-to-b from-orange-500/15 via-transparent to-red-500/10 pointer-events-none z-10" />
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
              className="drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]"
              unoptimized
              aria-hidden="true"
            />
          </m.div>
        )}
      </AnimatePresence>
      {/* Mode badge */}
      <div className="relative">
        <div
          data-testid="tv-mode-badge"
          className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-neo border-2 border-neo-black bg-neo-yellow text-neo-black font-black text-xs uppercase"
        >
          {t(modeBadgeKey)}
        </div>
      </div>

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
        <TvClassicActivityPanel
          totalWords={totalWords}
          avgLength={avgLength}
          pulsingTiles={pulsingTiles}
          reducedMotion={reducedMotion}
          t={t}
        />
      )}
    </div>
  );
});

TvActivityPanel.displayName = 'TvActivityPanel';

export default TvActivityPanel;
