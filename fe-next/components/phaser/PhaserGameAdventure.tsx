/**
 * PhaserGameAdventure — adventure-mode variant of PhaserGame.
 *
 * Uses the same React↔Phaser bridge but swaps GameScene for AdventureScene.
 * Adds adventure-specific props: tileStates, hintCells, onTileActivated.
 */

'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useMemo } from 'react';
import { GameBridge, type PathCellPayload, type BridgeEvents } from '@/lib/phaser/bridge/GameBridge';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useLanguage } from '@/contexts/LanguageContext';
import type { WordFeedback } from '@/components/game/WordFormingArea';

const PhaserCanvasAdventure = dynamic(
  () => import('./PhaserCanvasAdventure'),
  { ssr: false }
);

// ─── Props ────────────────────────────────────────────────────────────────────

/** Boss state passed from React hooks to Phaser via bridge */
export interface BossState {
  bossName: string;
  bossImagePath: string;
  maxHP: number;
  currentHP: number;
  phase: string;
  isActive: boolean;
}

/** Boss ability telegraph state */
export interface BossTelegraphState {
  abilityId: string;
  abilityName: string;
  duration: number;
  targetTiles: number[];
}

export interface PhaserGameAdventureProps {
  grid: string[][];
  comboLevel: number;
  fireRoundActive: boolean;
  /** Earthquake phase — drives camera shake in Phaser */
  earthquakeState?: 'idle' | 'warning' | 'shaking' | 'fire-round';
  /** Map of "row,col" → TileType for adventure overlays */
  tileStates?: Record<string, string>;
  /** Word feedback — drives tile animations and particle effects in Phaser */
  wordFeedback?: WordFeedback | null;
  /** Hint cells to highlight */
  hintCells?: Array<{ row: number; col: number }>;
  /** Boss state — when provided, boss UI renders in Phaser canvas */
  bossState?: BossState | null;
  /** Boss taunt — speech bubble displayed on canvas */
  bossTaunt?: { text: string; bossName: string; visible: boolean } | null;
  /** Boss ability telegraph — attack warning overlay */
  bossTelegraph?: BossTelegraphState | null;
  /** Boss ability execution — attack effect */
  bossAttackEffect?: { abilityName: string | null; damage: number } | null;
  /** Boss battle result */
  bossResult?: 'victory' | 'defeat' | null;
  onWordSubmit?: (word: string, path: PathCellPayload[]) => void;
  onWordChange?: (word: string, letterCount: number) => void;
  onTileActivated?: (payload: BridgeEvents['tile:activated']) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PhaserGameAdventure({
  grid,
  comboLevel,
  fireRoundActive,
  earthquakeState = 'idle',
  wordFeedback,
  tileStates,
  hintCells,
  bossState,
  bossTaunt,
  bossTelegraph,
  bossAttackEffect,
  bossResult,
  onWordSubmit,
  onWordChange,
  onTileActivated,
}: PhaserGameAdventureProps) {
  const { settings, shouldReduceMotion } = useAccessibility();
  const { isLowEnd } = useDevicePerformance();
  const { dir } = useLanguage();
  const isRTL = dir === 'rtl';

  const gridStateRef = useRef({ grid, comboLevel, fireRoundActive, tileStates });
  gridStateRef.current = { grid, comboLevel, fireRoundActive, tileStates };

  // Grid + tile-state update (handles live changes while scene is running)
  useEffect(() => {
    GameBridge.emit('grid:update', { grid, comboLevel, fireRoundActive, tileStates });
  }, [grid, comboLevel, fireRoundActive, tileStates]);

  // Send initial grid once the adventure scene finishes booting
  useEffect(() => {
    return GameBridge.on('scene:ready', () => {
      GameBridge.emit('grid:update', gridStateRef.current);
    });
  }, []);

  // Accessibility
  useEffect(() => {
    GameBridge.emit('accessibility:update', {
      reduceMotion: shouldReduceMotion,
      disableFireRoundLights: settings.disableFireRoundLights,
      disableEarthquakeEffects: settings.disableEarthquakeEffects,
      isLowEnd,
      isRTL,
    });
  }, [shouldReduceMotion, settings, isLowEnd, isRTL]);

  // Earthquake effect → Phaser camera shake
  useEffect(() => {
    if (earthquakeState !== 'idle') {
      GameBridge.emit('effect:earthquake', { intensity: earthquakeState });
    }
  }, [earthquakeState]);

  // Word feedback → Phaser tile animations
  // 'checking'/'pending' are React-UI-only states; Phaser doesn't handle them.
  useEffect(() => {
    if (!wordFeedback) return;
    const { type } = wordFeedback;
    if (type === 'accepted' || type === 'rejected' || type === 'duplicate' || type === 'foundByOther') {
      GameBridge.emit('word:feedback', {
        type,
        word: wordFeedback.word,
        score: wordFeedback.score,
      });
    }
  }, [wordFeedback]);

  // Stable serialisation of hint cells to avoid firing on every render
  // (hintCells is typically a new array reference each render from .map() in JSX)
  const hintCellsKey = useMemo(
    () => (hintCells ?? []).map((c) => `${c.row},${c.col}`).join(';'),
    [hintCells]
  );

  // Hint cells → persistent highlight event (or clear when empty)
  const prevHintKeyRef = useRef('');
  useEffect(() => {
    if (hintCellsKey === prevHintKeyRef.current) return;
    prevHintKeyRef.current = hintCellsKey;

    if (!hintCellsKey) {
      // Hint cleared — tell Phaser to remove glow
      GameBridge.emit('selection:highlight', { cells: [] });
      return;
    }

    GameBridge.emit('selection:highlight', {
      cells: (hintCells ?? []).map((c) => ({ ...c, letter: '' })),
    });
  }, [hintCellsKey, hintCells]);

  // Phaser → React callbacks
  useEffect(() => {
    if (!onWordSubmit) return;
    return GameBridge.on('word:submit', ({ word, path }) => onWordSubmit(word, path));
  }, [onWordSubmit]);

  useEffect(() => {
    if (!onWordChange) return;
    return GameBridge.on('word:change', ({ word, letterCount }) => onWordChange(word, letterCount));
  }, [onWordChange]);

  useEffect(() => {
    if (!onTileActivated) return;
    return GameBridge.on('tile:activated', onTileActivated);
  }, [onTileActivated]);

  // ── Boss bridge emissions ──────────────────────────────────────────────────

  // Boss init/damage — emit when boss state changes
  const prevBossHPRef = useRef<number | null>(null);
  useEffect(() => {
    if (!bossState?.isActive) return;

    if (prevBossHPRef.current === null) {
      // First activation — send boss:init
      GameBridge.emit('boss:init', {
        bossName: bossState.bossName,
        bossImagePath: bossState.bossImagePath,
        maxHP: bossState.maxHP,
        currentHP: bossState.currentHP,
        phase: bossState.phase,
      });
    } else if (bossState.currentHP !== prevBossHPRef.current) {
      // HP changed — send boss:damage
      GameBridge.emit('boss:damage', {
        currentHP: bossState.currentHP,
        maxHP: bossState.maxHP,
        phase: bossState.phase,
      });
    }

    prevBossHPRef.current = bossState.currentHP;
  }, [bossState]);

  // Boss phase change
  const prevPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    if (!bossState?.isActive) return;
    if (prevPhaseRef.current !== null && bossState.phase !== prevPhaseRef.current) {
      GameBridge.emit('boss:phase:change', { phase: bossState.phase });
    }
    prevPhaseRef.current = bossState.phase;
  }, [bossState?.phase, bossState?.isActive]);

  // Boss taunt
  useEffect(() => {
    if (!bossTaunt) return;
    GameBridge.emit('boss:taunt', bossTaunt);
  }, [bossTaunt]);

  // Boss telegraph
  useEffect(() => {
    if (!bossTelegraph) return;
    GameBridge.emit('boss:ability:telegraph', bossTelegraph);
  }, [bossTelegraph]);

  // Boss attack effect
  useEffect(() => {
    if (!bossAttackEffect) return;
    GameBridge.emit('boss:ability:execute', bossAttackEffect);
  }, [bossAttackEffect]);

  // Boss battle end
  useEffect(() => {
    if (!bossResult) return;
    GameBridge.emit('boss:end', { result: bossResult });
    prevBossHPRef.current = null;
    prevPhaseRef.current = null;
  }, [bossResult]);

  // Cleanup
  useEffect(() => {
    return () => {
      GameBridge.emit('scene:destroy', undefined);
      GameBridge.reset();
    };
  }, []);

  return (
    <div
      data-testid="phaser-game-adventure"
      className="relative w-full h-full"
    >
      <PhaserCanvasAdventure />
    </div>
  );
}
