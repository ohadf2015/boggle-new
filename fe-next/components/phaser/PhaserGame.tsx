/**
 * PhaserGame — React wrapper for the Phaser canvas.
 *
 * Responsibilities:
 *   1. Bridge React prop changes → GameBridge events (grid, accessibility)
 *   2. Subscribe to GameBridge Phaser→React events → call React callbacks
 *   3. Dynamically import PhaserCanvas (ssr:false) to avoid SSR crash
 *   4. Clean up GameBridge on unmount
 *
 * This component renders zero game UI — all visual rendering happens inside
 * the Phaser canvas. React keeps header, score, word input, leaderboard, etc.
 */

'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { GameBridge, type PathCellPayload } from '@/lib/phaser/bridge/GameBridge';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useLanguage } from '@/contexts/LanguageContext';
import type { WordFeedback } from '@/components/game/WordFormingArea';

// PhaserCanvas is browser-only — never server-rendered
const PhaserCanvas = dynamic(() => import('./PhaserCanvas'), { ssr: false });

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PhaserGameProps {
  /** Current letter grid (string[][]) */
  grid: string[][];
  /** Current combo multiplier level */
  comboLevel: number;
  /** Whether the fire round visual is active */
  fireRoundActive: boolean;
  /** Earthquake phase from the server — drives camera shake in Phaser */
  earthquakeState?: 'idle' | 'warning' | 'shaking' | 'fire-round';
  /** Word feedback — drives tile animations and particle effects in Phaser */
  wordFeedback?: WordFeedback | null;
  /** Scene variant — 'adventure' swaps in AdventureScene */
  sceneType?: 'game' | 'adventure';
  /** Called when Phaser emits a completed word path */
  onWordSubmit?: (word: string, path: PathCellPayload[]) => void;
  /** Called on every drag step (live word preview) */
  onWordChange?: (word: string, letterCount: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PhaserGame({
  grid,
  comboLevel,
  fireRoundActive,
  earthquakeState = 'idle',
  wordFeedback,
  sceneType = 'game',
  onWordSubmit,
  onWordChange,
}: PhaserGameProps) {
  const { settings, shouldReduceMotion } = useAccessibility();
  const { isLowEnd, targetFPS } = useDevicePerformance();
  const { dir } = useLanguage();
  const isRTL = dir === 'rtl';

  // Ref holds latest grid values so scene:ready handler always sends fresh data
  const gridStateRef = useRef({ grid, comboLevel, fireRoundActive });
  gridStateRef.current = { grid, comboLevel, fireRoundActive };

  // ── React → Phaser: grid state ──────────────────────────────────────────
  // Emit on every prop change (handles updates while scene is already running)
  useEffect(() => {
    GameBridge.emit('grid:update', { grid, comboLevel, fireRoundActive });
  }, [grid, comboLevel, fireRoundActive]);

  // ── Wait for scene boot, then send initial grid ─────────────────────────
  // Phaser takes ~100ms to boot through BootScene → GameScene.create().
  // Without this, the initial grid:update fires before the scene subscribes.
  useEffect(() => {
    return GameBridge.on('scene:ready', () => {
      GameBridge.emit('grid:update', gridStateRef.current);
    });
  }, []);

  // ── React → Phaser: earthquake effect ──────────────────────────────────
  // Emit whenever the earthquake phase is not idle so Phaser can shake the camera.
  useEffect(() => {
    if (earthquakeState !== 'idle') {
      GameBridge.emit('effect:earthquake', { intensity: earthquakeState });
    }
  }, [earthquakeState]);

  // ── React → Phaser: word feedback ──────────────────────────────────────
  // Forward server feedback to Phaser so tiles animate and effects fire.
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

  // ── React → Phaser: accessibility flags ────────────────────────────────
  useEffect(() => {
    GameBridge.emit('accessibility:update', {
      reduceMotion: shouldReduceMotion,
      disableFireRoundLights: settings.disableFireRoundLights,
      disableEarthquakeEffects: settings.disableEarthquakeEffects,
      isLowEnd,
      isRTL,
    });
  }, [shouldReduceMotion, settings, isLowEnd, isRTL]);

  // ── Phaser → React: word submit ─────────────────────────────────────────
  useEffect(() => {
    if (!onWordSubmit) return;
    return GameBridge.on('word:submit', ({ word, path }) => {
      onWordSubmit(word, path);
    });
  }, [onWordSubmit]);

  // ── Phaser → React: live word change ────────────────────────────────────
  useEffect(() => {
    if (!onWordChange) return;
    return GameBridge.on('word:change', ({ word, letterCount }) => {
      onWordChange(word, letterCount);
    });
  }, [onWordChange]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      GameBridge.emit('scene:destroy', undefined);
      GameBridge.reset();
    };
  }, []);

  return (
    <div
      data-testid="phaser-game"
      className="relative w-full h-full"
    >
      <PhaserCanvas sceneType={sceneType} deviceConfig={{ isLowEnd, targetFPS }} />
    </div>
  );
}
