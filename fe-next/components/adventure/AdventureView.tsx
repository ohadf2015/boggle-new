'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Sparkles, Map, Zap, Loader2, Coins, Hammer, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useProgression } from '@/contexts/ProgressionContext';
import { useMusic } from '@/contexts/MusicContext';
import { UpgradeShop } from './meta/UpgradeShop';
import type { UpgradeState } from '@/lib/adventure/upgradeConfig';
import { useAdventureMusic } from '@/hooks/useAdventureMusic';
import {
  getWorldConfig,
  getLevelConfig,
  generateAdventureGrid,
  getLevelSeed,
  getGridSize,
} from '@/lib/adventure';
import dynamic from 'next/dynamic';
// WorldBackground is handled internally by LevelGrid for proper parallax layering
import { AdventureThemeProvider } from '@/contexts/AdventureThemeContext';
import MusicControls from '@/components/MusicControls';

import WorldMap from './WorldMap';
import LevelGrid from './LevelGrid';
// AdventureGame loads on demand (contains heavy cinematic/Remotion imports)
const AdventureGame = dynamic(() => import('./AdventureGame'), { ssr: false, loading: () => <div className="h-screen bg-neo-navy flex items-center justify-center"><Loader2 className="w-12 h-12 text-neo-yellow animate-spin" /></div> });

// View state type for navigation
type ViewState = 'worldMap' | 'levelGrid' | 'playing';

// History state interface for browser back button support
interface AdventureHistoryState {
  adventureView: ViewState;
  worldId?: number | null;
  levelId?: number | null;
}

// Timer state for music hook coordination
interface GameTimerState {
  timeRemaining: number;
  totalTime: number;
  isPlaying: boolean;
  isPaused: boolean;
}

/**
 * AdventureView - Main Adventure Mode with interactive floating islands world map
 * Shows all 10 worlds with visual progression and level selection
 */
export default function AdventureView(): React.JSX.Element {
  const { t, dir, language } = useLanguageSafe();
  const isRTL = dir === 'rtl';

  // Get progression data from context (includes currency)
  const { progression, isLoading, error, completeLevel, updateCurrency } = useProgression();

  // Derived currency values from shared progression state
  const gold = progression?.gold ?? 0;
  const upgrades = (progression?.upgrades ?? {}) as Record<string, number>;

  // Shop modal state
  const [showShop, setShowShop] = useState(false);

  // Global music context - stop main game music when adventure starts
  const { stopMusic: stopGlobalMusic } = useMusic();

  // View navigation state
  const [viewState, setViewState] = useState<ViewState>('worldMap');
  const [selectedWorld, setSelectedWorld] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  // Game timer state for music coordination (reported by AdventureGame)
  const [gameTimerState, setGameTimerState] = useState<GameTimerState>({
    timeRemaining: 0,
    totalTime: 0,
    isPlaying: false,
    isPaused: false,
  });

  // Stop global music when adventure mode starts
  useEffect(() => {
    stopGlobalMusic(500); // Quick fade out
  }, [stopGlobalMusic]);

  // Current world for music (selected world or default to 1)
  const currentMusicWorld = selectedWorld || 1;

  // Adventure music hook - plays on ALL adventure screens
  // - WorldMap/LevelGrid: ambient mode (track 1 loops, no timer tracking)
  // - AdventureGame: dynamic mode (track switching based on time)
  useAdventureMusic({
    worldNumber: currentMusicWorld,
    isPlaying: viewState === 'playing' ? gameTimerState.isPlaying : true,
    isPaused: viewState === 'playing' ? gameTimerState.isPaused : false,
    timeRemaining: viewState === 'playing' ? gameTimerState.timeRemaining : 0,
    totalTime: viewState === 'playing' ? gameTimerState.totalTime : 0,
    enabled: true,
  });

  // Callback for AdventureGame to report timer state
  const handleTimerStateChange = useCallback((timerState: GameTimerState) => {
    setGameTimerState(timerState);
  }, []);

  // Derive player stats from progression
  const totalStars = progression?.totalStars ?? 0;
  const playerLevel = progression?.playerLevel ?? 1;
  const completions = progression?.completions ?? [];

  // Get selected world config
  const selectedWorldConfig = selectedWorld ? getWorldConfig(selectedWorld) : null;

  // Generate grid FIRST, then pass to level config for vowel protection
  // This prevents ice tiles from being placed on vowels, ensuring fair levels
  const gameGrid =
    selectedWorld && selectedLevel
      ? generateAdventureGrid(
          getGridSize(selectedWorld) as 4 | 5 | 6 | 7,
          getLevelSeed(selectedWorld, selectedLevel),
          language
        )
      : null;

  // Get level config with grid for vowel-protected special tiles
  const levelConfig =
    selectedWorld && selectedLevel
      ? getLevelConfig(selectedWorld, selectedLevel, gameGrid ?? undefined)
      : null;

  // Track if we're handling a popstate event to avoid pushing state during back nav
  const isHandlingPopstateRef = useRef(false);
  // Track if we've initialized history state
  const historyInitializedRef = useRef(false);
  // Track popstate flag reset timeout for cleanup (prevents memory leak)
  const popstateFlagTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Push initial history state on mount (for worldMap view)
  useEffect(() => {
    if (typeof window === 'undefined' || historyInitializedRef.current) return;

    // Replace current state with our adventure state (don't push, replace)
    const initialState: AdventureHistoryState = {
      adventureView: 'worldMap',
      worldId: null,
      levelId: null,
    };
    window.history.replaceState(initialState, '');
    historyInitializedRef.current = true;
  }, []);

  // Handle browser back button (popstate event)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopstate = (event: PopStateEvent) => {
      const state = event.state as AdventureHistoryState | null;

      // If no state or not our state, let browser handle it (navigate away)
      if (!state || !state.adventureView) {
        return;
      }

      // Set flag to prevent pushing state during this navigation
      isHandlingPopstateRef.current = true;

      // Navigate to the state from history
      setViewState(state.adventureView);
      setSelectedWorld(state.worldId ?? null);
      setSelectedLevel(state.levelId ?? null);

      // Reset flag after state updates are processed (with tracked timeout for cleanup)
      if (popstateFlagTimeoutRef.current) {
        clearTimeout(popstateFlagTimeoutRef.current);
      }
      popstateFlagTimeoutRef.current = setTimeout(() => {
        isHandlingPopstateRef.current = false;
        popstateFlagTimeoutRef.current = null;
      }, 0);
    };

    window.addEventListener('popstate', handlePopstate);

    return () => {
      window.removeEventListener('popstate', handlePopstate);
      // Clean up any pending flag reset timeout to prevent memory leaks
      if (popstateFlagTimeoutRef.current) {
        clearTimeout(popstateFlagTimeoutRef.current);
        popstateFlagTimeoutRef.current = null;
      }
    };
  }, []);

  // Push history state when view changes (forward navigation only)
  const pushHistoryState = useCallback((newView: ViewState, worldId: number | null, levelId: number | null) => {
    if (typeof window === 'undefined' || isHandlingPopstateRef.current) return;

    const state: AdventureHistoryState = {
      adventureView: newView,
      worldId,
      levelId,
    };
    window.history.pushState(state, '');
  }, []);

  // Handle shop purchase — optimistic update + persist via context
  const handleShopPurchase = useCallback((_upgradeId: string, newState: UpgradeState, newGold: number) => {
    updateCurrency(newGold, newState);
  }, [updateCurrency]);

  // Handle world selection from WorldMap
  const handleWorldSelect = useCallback((worldId: number) => {
    setSelectedWorld(worldId);
    setViewState('levelGrid');
    pushHistoryState('levelGrid', worldId, null);
  }, [pushHistoryState]);

  // Handle level selection from LevelGrid
  const handleLevelSelect = useCallback((worldId: number, levelId: number) => {
    setSelectedWorld(worldId);
    setSelectedLevel(levelId);
    setViewState('playing');
    pushHistoryState('playing', worldId, levelId);
  }, [pushHistoryState]);

  // Handle game completion
  const handleLevelComplete = useCallback(
    async (stars: number, score: number) => {
      if (selectedWorld && selectedLevel) {
        try {
          await completeLevel(
            selectedWorld,
            selectedLevel,
            stars as 0 | 1 | 2 | 3,
            score,
            0 // words count - can be expanded later
          );
        } catch (err) {
          console.error('Failed to save progress:', err instanceof Error ? err.message : String(err));
        }
        // Navigate back to level grid regardless of save success
        // Use history.back() to maintain proper back button behavior
        if (typeof window !== 'undefined') {
          window.history.back();
        } else {
          setViewState('levelGrid');
          setSelectedLevel(null);
        }
      }
    },
    [selectedWorld, selectedLevel, completeLevel]
  );

  // Handle exit from game
  const handleGameExit = useCallback(() => {
    // Use history.back() to maintain proper back button behavior
    if (typeof window !== 'undefined') {
      window.history.back();
    } else {
      setViewState('levelGrid');
      setSelectedLevel(null);
    }
  }, []);

  // Handle back navigation based on current view
  const handleBack = useCallback(() => {
    // Use history.back() to navigate, which triggers popstate handler
    if (typeof window !== 'undefined') {
      window.history.back();
    } else {
      // Fallback for SSR
      if (viewState === 'playing') {
        setViewState('levelGrid');
        setSelectedLevel(null);
      } else if (viewState === 'levelGrid') {
        setViewState('worldMap');
        setSelectedWorld(null);
      }
    }
  }, [viewState]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen bg-neo-navy flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-neo-yellow animate-spin" />
          <p className="text-neo-white font-bold">
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen bg-neo-navy flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-16 h-16 bg-neo-red/20 rounded-full flex items-center justify-center">
            <span className="text-3xl">!</span>
          </div>
          <p className="text-neo-white font-bold">
            {t('adventure.loadError')}
          </p>
          <Link
            href="/"
            className={cn(
              'px-4 py-2 bg-neo-purple text-neo-white font-bold',
              'border-3 border-neo-black rounded-neo shadow-hard',
              'hover:bg-neo-purple-light transition-colors'
            )}
          >
            {t('common.back')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AdventureThemeProvider
      initialWorldId={selectedWorld || 1}
      initialLevel={selectedLevel || 1}
    >
    <div className="min-h-screen bg-neo-navy relative flex flex-col overflow-x-hidden">
      {/* Header - Fixed at top, hidden during gameplay (game has its own GameHeader) */}
      {viewState !== 'playing' && <header className="fixed top-0 left-0 right-0 z-30 px-4 py-3 sm:px-6 lg:px-8 bg-neo-navy border-b border-neo-white/10 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Back / World Map button */}
          {viewState !== 'worldMap' ? (
            <button
              onClick={handleBack}
              className={cn(
                'flex items-center gap-2 px-4 py-2 whitespace-nowrap',
                'bg-neo-navy border-2 border-neo-white/20 rounded-neo',
                'text-neo-white font-bold hover:bg-neo-navy-light',
                'transition-colors shadow-hard-sm'
              )}
            >
              <ArrowLeft className={cn('w-5 h-5', isRTL && 'rotate-180')} />
              <span className="hidden sm:inline">
                {t('common.back')}
              </span>
            </button>
          ) : (
            <Link
              href="/"
              className={cn(
                'flex items-center gap-2 px-4 py-2 whitespace-nowrap',
                'bg-neo-navy border-2 border-neo-white/20 rounded-neo',
                'text-neo-white font-bold hover:bg-neo-navy-light',
                'transition-colors shadow-hard-sm'
              )}
            >
              <ArrowLeft className={cn('w-5 h-5', isRTL && 'rotate-180')} />
              <span className="hidden sm:inline">{t('common.back')}</span>
            </Link>
          )}

          {/* Title */}
          <div className="hidden sm:flex items-center gap-2">
            <Map className="w-6 h-6 text-neo-lime" />
            <h1 className="text-xl font-black text-neo-white uppercase tracking-tight">
              {t('adventure.title')}
            </h1>
            <Sparkles className="w-6 h-6 text-neo-yellow" />
          </div>

          {/* Player Stats and Controls */}
          <div className="flex items-center gap-3">
            {/* Total Stars */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neo-yellow/20 border-2 border-neo-yellow rounded-neo">
              <Star className="w-4 h-4 text-neo-yellow fill-neo-yellow" />
              <span className="font-bold text-neo-yellow text-sm">
                {totalStars}
              </span>
            </div>

            {/* Player Level */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neo-purple/20 border-2 border-neo-purple rounded-neo">
              <Zap className="w-4 h-4 text-neo-purple" />
              <span className="font-bold text-neo-purple text-sm">
                Lv.{playerLevel}
              </span>
            </div>

            {/* Gold + Word Forge Shop */}
            <button
              onClick={() => setShowShop(true)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5',
                'bg-neo-orange/20 border-2 border-neo-orange rounded-neo',
                'hover:bg-neo-orange/30 transition-colors',
                'font-bold text-neo-orange text-sm'
              )}
              aria-label={t('adventure.shop.open')}
            >
              <Coins className="w-4 h-4" />
              <span>{gold}</span>
              <Hammer className="w-3.5 h-3.5 ms-1 opacity-70" />
            </button>

            {/* Sound Controller */}
            <MusicControls />
          </div>
        </div>
      </header>}

      {/* Word Forge Shop Modal */}
      <AnimatePresence>
        {showShop && viewState !== 'playing' && (
          <motion.div
            key="shop-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowShop(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn(
                'relative w-full max-w-lg max-h-[80vh] overflow-y-auto',
                'bg-neo-navy border-3 border-neo-black rounded-neo shadow-hard-lg p-4'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowShop(false)}
                className={cn(
                  'absolute top-3 end-3 z-10 p-1.5',
                  'bg-neo-navy border-2 border-neo-white/20 rounded-neo',
                  'text-neo-white hover:bg-neo-red/30 transition-colors'
                )}
                aria-label={t('common.close')}
              >
                <X className="w-4 h-4" />
              </button>
              <UpgradeShop
                gold={gold}
                upgrades={upgrades}
                currentWorld={selectedWorld ?? 1}
                onPurchase={handleShopPurchase}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer for fixed header (approx 56px height), hidden during gameplay */}
      {viewState !== 'playing' && <div className="h-14 flex-shrink-0" />}

      {/* Main Content - Takes remaining height, children handle their own scroll */}
      <div className="relative z-10 flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {viewState === 'worldMap' && (
            // World Map View
            <motion.div
              key="world-map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: isRTL ? 100 : -100 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <WorldMap
                totalStars={totalStars}
                completions={completions}
                onWorldSelect={handleWorldSelect}
              />
            </motion.div>
          )}

          {viewState === 'levelGrid' && selectedWorldConfig && (
            // Level Grid View - LevelGrid handles its own scrolling and parallax
            <motion.div
              key="level-grid"
              initial={{ opacity: 0, x: isRTL ? -100 : 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <LevelGrid
                world={selectedWorldConfig}
                completions={completions}
                totalStars={totalStars}
                onLevelSelect={handleLevelSelect}
              />
            </motion.div>
          )}

          {viewState === 'playing' && levelConfig && gameGrid && (
            // Game View
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <AdventureGame
                levelConfig={levelConfig}
                initialGrid={gameGrid}
                onLevelComplete={handleLevelComplete}
                onExit={handleGameExit}
                onTimerStateChange={handleTimerStateChange}
                totalStars={totalStars}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Word Forge FAB — visible on worldMap and levelGrid */}
      {viewState !== 'playing' && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring', damping: 15 }}
          onClick={() => setShowShop(true)}
          className={cn(
            'fixed bottom-6 z-20',
            isRTL ? 'left-6' : 'right-6',
            'flex items-center gap-2 px-5 py-3',
            'bg-neo-orange text-neo-black font-black text-sm uppercase tracking-wide',
            'border-3 border-neo-black rounded-neo shadow-hard-lg',
            'hover:shadow-hard hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed',
            'transition-all duration-150'
          )}
          aria-label={t('adventure.shop.open')}
        >
          <Hammer className="w-5 h-5" />
          <span>{t('adventure.shop.title')}</span>
          <div className="flex items-center gap-1 ms-1 px-2 py-0.5 bg-neo-black/20 rounded-neo">
            <Coins className="w-3.5 h-3.5 text-neo-yellow" />
            <span className="text-neo-yellow font-bold">{gold}</span>
          </div>
        </motion.button>
      )}
    </div>
    </AdventureThemeProvider>
  );
}
