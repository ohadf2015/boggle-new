/**
 * Endless Mode PageClient
 *
 * Manages the endless run loop: lobby -> playing -> floor-cleared -> next floor / run over.
 * Uses useEndlessMode for state and AdventureGame for gameplay.
 */

'use client';

import React, { Suspense, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import nextDynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Infinity as InfinityIcon, Trophy, Zap, Clock, Target } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { PageLoader } from '@/components/ui/PageLoader';
import { PlayfulBackground } from '@/components/ui/PlayfulBackground';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { AdventureThemeProvider } from '@/contexts/AdventureThemeContext';
import { useProgressionData } from '@/contexts/ProgressionContext';
import { useEndlessMode } from '@/hooks/useEndlessMode';
import { generateAdventureGrid } from '@/lib/adventure';
import type { LevelConfig } from '@/types/adventure';

const AdventureGame = nextDynamic(
  () => import('@/components/adventure/AdventureGame'),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen bg-neo-navy flex items-center justify-center">
        <PageLoader size="lg" />
      </div>
    ),
  }
);

type EndlessPhase = 'lobby' | 'playing' | 'floorCleared' | 'runOver';

export default function EndlessPageClient(): React.JSX.Element {
  const { t, language } = useLanguageSafe();
  const { progression } = useProgressionData();
  const [phase, setPhase] = useState<EndlessPhase>('lobby');
  const [lastScore, setLastScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const endless = useEndlessMode({
    initialHighFloor: progression?.endlessHighFloor ?? 0,
    onNewHighFloor: () => setIsNewRecord(true),
  });

  const handleStart = useCallback(() => {
    endless.start();
    setIsNewRecord(false);
    setPhase('playing');
  }, [endless]);

  const handleFloorComplete = useCallback(
    (_stars: number, score: number) => {
      setLastScore(score);
      setPhase('floorCleared');
    },
    []
  );

  const handleNextFloor = useCallback(() => {
    endless.advanceFloor();
    setPhase('playing');
  }, [endless]);

  const handleExit = useCallback(() => {
    endless.endRun();
    setPhase('runOver');
  }, [endless]);

  const handleBackToLobby = useCallback(() => {
    endless.endRun();
    setPhase('lobby');
    setIsNewRecord(false);
  }, [endless]);

  // Build LevelConfig from endless floor data
  const levelConfig: LevelConfig | null = useMemo(() => {
    if (!endless.isActive) return null;
    const floor = endless.levelConfig;
    return {
      world: floor.world,
      level: floor.level,
      gridSize: floor.gridSize,
      timerSeconds: floor.timerSeconds,
      objectives: floor.objectives,
      specialTiles: floor.specialTiles,
      difficulty: floor.difficulty,
      worldMechanic: floor.worldMechanic,
      chapterNumber: floor.chapterNumber,
      levelInChapter: floor.levelInChapter,
      isBossLevel: floor.isBossLevel,
      minWordLength: floor.minWordLength as 2 | 3 | undefined,
    };
  }, [endless.isActive, endless.levelConfig]);

  // Stable seed: increments each floor to produce different grids
  const seedRef = useRef(1);
  const prevFloorRef = useRef(0);
  if (endless.currentFloor !== prevFloorRef.current) {
    prevFloorRef.current = endless.currentFloor;
    seedRef.current += 1;
  }

  const grid = useMemo(() => {
    if (!levelConfig) return null;
    const seed = seedRef.current * 1000 + endless.currentFloor;
    return generateAdventureGrid(levelConfig.gridSize, seed, language);
  }, [levelConfig, endless.currentFloor, language]);

  // Track last known world/level so AdventureThemeProvider survives exit animations
  const lastLevelRef = useRef<{ world: number; level: number }>({ world: 1, level: 1 });
  if (levelConfig) {
    lastLevelRef.current = { world: levelConfig.world, level: levelConfig.level };
  }

  const diff = endless.difficulty;

  return (
    <Suspense fallback={<PageLoader size="lg" />}>
      <div className="h-full flex flex-col bg-neo-navy relative overflow-hidden">
        <PlayfulBackground intensity="medium" colorScheme="game" />

        <AdventureThemeProvider
          initialWorldId={lastLevelRef.current.world}
          initialLevel={lastLevelRef.current.level}
        >
        <AdaptiveAnimatePresence mode="wait">
          {/* === LOBBY === */}
          {phase === 'lobby' && (
            <AdaptiveMotion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 gap-6"
            >
              <Link
                href={`/${language}/adventure`}
                className="absolute top-4 inset-s-4 flex items-center gap-2 text-neo-white hover:text-neo-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5 rtl:scale-x-[-1]" />
                <span className="text-sm font-bold">{t('common.back')}</span>
              </Link>

              <AdaptiveMotion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-neo-purple"
              >
                <InfinityIcon className="w-20 h-20" />
              </AdaptiveMotion.div>

              <h1 className="text-3xl sm:text-4xl font-black text-neo-white font-neo-display uppercase tracking-tight">
                {t('adventure.endlessMode.title')}
              </h1>
              <p className="text-neo-white text-lg font-neo-body">
                {t('adventure.endlessMode.subtitle')}
              </p>

              {endless.highFloor > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-neo-navy-light border-3 border-neo-black rounded-neo shadow-hard-sm">
                  <Trophy className="w-5 h-5 text-neo-lime" />
                  <span className="text-neo-lime font-black text-sm">
                    {t('adventure.endlessMode.highFloor', { floor: endless.highFloor })}
                  </span>
                </div>
              )}

              <AdaptiveMotion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStart}
                className="mt-4 px-10 py-4 bg-neo-purple text-neo-white font-black text-xl uppercase rounded-neo border-3 border-neo-black shadow-hard active:shadow-hard-pressed active:translate-y-[2px] transition-shadow"
              >
                {t('adventure.endlessMode.startRun')}
              </AdaptiveMotion.button>
            </AdaptiveMotion.div>
          )}

          {/* === PLAYING === */}
          {phase === 'playing' && levelConfig && grid && (
            <AdaptiveMotion.div
              key={`floor-${endless.currentFloor}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-10 flex-1 flex flex-col"
            >
              {/* Floor indicator bar */}
              <div className="flex items-center justify-between px-4 py-2 bg-neo-navy-light/80 border-b-3 border-neo-black">
                <div className="flex items-center gap-3">
                  <span className="text-neo-purple font-black text-sm uppercase">
                    {t('adventure.endlessMode.floor', { floor: endless.currentFloor })}
                  </span>
                  {levelConfig.isBossLevel && (
                    <span className="px-2 py-0.5 bg-neo-pink text-neo-white text-xs font-black uppercase rounded-neo border-2 border-neo-black">
                      {t('adventure.endlessMode.bossFloor')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleExit}
                  className="text-neo-white hover:text-neo-white text-xs font-bold uppercase transition-colors"
                >
                  {t('adventure.endlessMode.quit')}
                </button>
              </div>

              <div className="flex-1">
                  <AdventureGame
                    levelConfig={levelConfig}
                    initialGrid={grid}
                    onLevelComplete={handleFloorComplete}
                    onExit={handleExit}
                  />
              </div>
            </AdaptiveMotion.div>
          )}

          {/* === FLOOR CLEARED === */}
          {phase === 'floorCleared' && (
            <AdaptiveMotion.div
              key="cleared"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 gap-5"
            >
              <AdaptiveMotion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="text-neo-lime text-5xl font-black"
              >
                {t('adventure.endlessMode.floorCleared')}
              </AdaptiveMotion.div>

              <p className="text-neo-white text-lg">
                {t('adventure.endlessMode.floor', { floor: endless.currentFloor })} — {lastScore} pts
              </p>

              {isNewRecord && (
                <AdaptiveMotion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-4 py-2 bg-neo-lime/20 border-3 border-neo-lime rounded-neo"
                >
                  <Trophy className="w-5 h-5 text-neo-lime" />
                  <span className="text-neo-lime font-black">
                    {t('adventure.endlessMode.newRecord')}
                  </span>
                </AdaptiveMotion.div>
              )}

              {/* Next floor preview */}
              <div className="flex items-center gap-4 text-neo-white text-sm mt-2">
                <span className="flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  {t('adventure.endlessMode.gridSize', { size: diff.gridSize })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {t('adventure.endlessMode.timeLimit', { seconds: diff.timerSeconds })}
                </span>
                <span className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  {t('adventure.endlessMode.scoreTarget', { score: diff.scoreTarget })}
                </span>
              </div>

              <div className="flex gap-4 mt-4">
                <AdaptiveMotion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleExit}
                  className="px-6 py-3 bg-neo-navy-light text-neo-white font-bold uppercase rounded-neo border-3 border-neo-black shadow-hard-sm active:shadow-hard-pressed active:translate-y-[2px] transition-shadow"
                >
                  {t('adventure.endlessMode.quit')}
                </AdaptiveMotion.button>
                <AdaptiveMotion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNextFloor}
                  className="px-8 py-3 bg-neo-purple text-neo-white font-black text-lg uppercase rounded-neo border-3 border-neo-black shadow-hard active:shadow-hard-pressed active:translate-y-[2px] transition-shadow"
                >
                  {t('adventure.endlessMode.nextFloor')}
                </AdaptiveMotion.button>
              </div>
            </AdaptiveMotion.div>
          )}

          {/* === RUN OVER === */}
          {phase === 'runOver' && (
            <AdaptiveMotion.div
              key="over"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 gap-5"
            >
              <h2 className="text-3xl font-black text-neo-pink font-neo-display uppercase">
                {t('adventure.endlessMode.runOver')}
              </h2>

              <p className="text-neo-white text-lg">
                {t('adventure.endlessMode.floor', { floor: endless.currentFloor })}
              </p>

              {isNewRecord && (
                <div className="flex items-center gap-2 px-4 py-2 bg-neo-lime/20 border-3 border-neo-lime rounded-neo">
                  <Trophy className="w-5 h-5 text-neo-lime" />
                  <span className="text-neo-lime font-black">
                    {t('adventure.endlessMode.newRecord')}
                  </span>
                </div>
              )}

              {endless.highFloor > 0 && (
                <div className="flex items-center gap-2 text-neo-white">
                  <Trophy className="w-4 h-4" />
                  <span className="font-bold text-sm">
                    {t('adventure.endlessMode.highFloor', { floor: endless.highFloor })}
                  </span>
                </div>
              )}

              <div className="flex gap-4 mt-4">
                <button
                  type="button"
                  onClick={handleBackToLobby}
                  className="px-6 py-3 bg-neo-navy-light text-neo-white font-bold uppercase rounded-neo border-3 border-neo-black shadow-hard-sm active:shadow-hard-pressed active:translate-y-[2px] transition-shadow"
                >
                  {t('common.back')}
                </button>
                <AdaptiveMotion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStart}
                  className="px-8 py-3 bg-neo-purple text-neo-white font-black text-lg uppercase rounded-neo border-3 border-neo-black shadow-hard active:shadow-hard-pressed active:translate-y-[2px] transition-shadow"
                >
                  {t('adventure.endlessMode.startRun')}
                </AdaptiveMotion.button>
              </div>
            </AdaptiveMotion.div>
          )}
        </AdaptiveAnimatePresence>
        </AdventureThemeProvider>
      </div>
    </Suspense>
  );
}
