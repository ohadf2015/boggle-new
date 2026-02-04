/**
 * useAdventureBoss Hook
 *
 * Manages boss gameplay mechanics for adventure mode including:
 * - Boss intro/skip handling
 * - Boss defeat detection and fireworks
 * - Boss taunt triggers (low time, word events)
 * - Integration with useBossMechanics and useBossHealth
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useBossMechanics } from '@/hooks/useBossMechanics';
import { useBossHealth } from '@/hooks/useBossHealth';
import { type BossTier } from '@/components/celebration/BossDefeatFireworks';

export interface UseAdventureBossProps {
  /** Whether this is a boss level */
  isBossLevel: boolean;
  /** World ID for boss mechanics (null for non-boss levels) */
  worldId: number | null;
  /** Level number for tier calculation */
  levelNumber: number;
  /** Whether to show boss intro from level config */
  showBossIntroConfig: boolean;
  /** Current time remaining in seconds */
  timeRemaining: number;
  /** Whether game is currently playing */
  isPlaying: boolean;
  /** Callback to start the game */
  onStartGame: () => void;
  /** Callback to start AI director */
  onStartAIDirector: () => void;
}

export interface UseAdventureBossReturn {
  // Boss state
  /** Whether boss is currently active */
  isBossActive: boolean;
  /** Boss configuration object */
  bossConfig: any;
  /** Current boss taunt message */
  bossTaunt: string | null;
  /** Whether to show boss taunt */
  showBossTaunt: boolean;
  /** Boss health state */
  bossHealthState: any;
  /** Boss HP percentage (0-100) */
  bossHPPercentage: number;
  /** Whether boss is enraged (HP < 25%) */
  isEnraged: boolean;
  /** Boss state (taunts, phases, mechanics) */
  bossState: any;

  // Boss intro state
  /** Whether to show boss intro cutscene */
  showBossIntro: boolean;

  // Boss defeat state
  /** Whether to show boss defeat fireworks */
  showBossFireworks: boolean;
  /** Tier of defeated boss (for fireworks animation) */
  defeatedBossTier: BossTier;

  // Boss mechanics functions
  /** Check if word meets boss mechanic requirements */
  checkBossWord: (word: string) => any;
  /** Deal damage to boss with multipliers */
  dealBossDamage: (baseDamage: number, combo: number, mechanicMultiplier: number, comboBonus: number) => number;
  /** Trigger specific boss taunt */
  triggerBossTaunt: (event: string) => void;
  /** Start boss battle (transition from intro to active) */
  startBossBattle: () => void;
  /** End boss battle (victory or defeat) */
  endBossBattle: (isVictory: boolean) => void;
  /** Reset boss health */
  resetBossHealth: () => void;

  // Boss intro handlers
  /** Handle boss intro start (with start taunt) */
  handleBossIntroStart: () => void;
  /** Handle boss intro skip (without start taunt) */
  handleBossIntroSkip: () => void;
}

/**
 * Custom hook to manage boss gameplay mechanics.
 *
 * Consolidates boss-related state, effects, and handlers that were
 * previously scattered throughout AdventureGame component.
 *
 * @returns Boss gameplay state and control functions
 *
 * @example
 * ```tsx
 * const boss = useAdventureBoss({
 *   isBossLevel: true,
 *   worldId: 1,
 *   levelNumber: 5,
 *   showBossIntroConfig: true,
 *   timeRemaining: 60,
 *   isPlaying: false,
 *   onStartGame: startGame,
 *   onStartAIDirector: startAIDirector,
 * });
 *
 * // Use boss state
 * {boss.showBossIntro && <BossIntro onStart={boss.handleBossIntroStart} />}
 * {boss.showBossFireworks && <BossFireworks tier={boss.defeatedBossTier} />}
 * ```
 */
export function useAdventureBoss({
  isBossLevel,
  worldId,
  levelNumber,
  showBossIntroConfig,
  timeRemaining,
  isPlaying,
  onStartGame,
  onStartAIDirector,
}: UseAdventureBossProps): UseAdventureBossReturn {
  // Boss defeat fireworks state
  const [showBossFireworks, setShowBossFireworks] = useState(false);
  const [defeatedBossTier, setDefeatedBossTier] = useState<BossTier>('standard');

  // Boss intro state (shown before gameplay on boss levels)
  const [showBossIntro, setShowBossIntro] = useState(
    isBossLevel && showBossIntroConfig === true
  );

  // Boss mechanics hook (active only on boss levels)
  const {
    isActive: isBossActive,
    boss: bossConfig,
    currentTaunt: bossTaunt,
    showTaunt: showBossTaunt,
    checkWord: checkBossWord,
    triggerTaunt: triggerBossTaunt,
    bossState,
  } = useBossMechanics({
    worldId: isBossLevel ? worldId : null,
  });

  // Boss health hook (tracks HP and phase transitions)
  const bossMaxHP = isBossLevel ? 100 : 0;
  const {
    healthState: bossHealthState,
    dealDamage: dealBossDamage,
    startBattle: startBossBattle,
    endBattle: endBossBattle,
    resetHealth: resetBossHealth,
    hpPercentage: bossHPPercentage,
    isEnraged,
  } = useBossHealth(bossMaxHP);

  // Refs for taunt and defeat detection
  const bossLowTimeTriggedRef = useRef(false);
  const prevBossPhaseRef = useRef(bossHealthState.phase);

  // Low-time taunt effect
  useEffect(() => {
    if (
      isBossActive &&
      isPlaying &&
      timeRemaining <= 15 &&
      timeRemaining > 0 &&
      !bossLowTimeTriggedRef.current
    ) {
      bossLowTimeTriggedRef.current = true;
      triggerBossTaunt('onLowTime');
    }
    // Reset trigger on game reset
    if (timeRemaining > 15) {
      bossLowTimeTriggedRef.current = false;
    }
  }, [isBossActive, isPlaying, timeRemaining, triggerBossTaunt]);

  // Boss defeat detection and fireworks effect
  useEffect(() => {
    let hideTimeout: NodeJS.Timeout | undefined;

    // Detect phase transition to 'victory' (not on initial render)
    if (bossHealthState.phase === 'victory' && prevBossPhaseRef.current !== 'victory') {
      // Determine boss tier based on level number
      // Mini boss: levels 5, 10 (every 5th level except multiples of 15/20)
      // Standard boss: levels 15 (or multiples)
      // Elite boss: levels 20+ (or final bosses)
      let tier: BossTier = 'mini';
      if (levelNumber >= 20 || levelNumber % 20 === 0) {
        tier = 'elite';
      } else if (levelNumber >= 15 || levelNumber % 15 === 0) {
        tier = 'standard';
      }

      setDefeatedBossTier(tier);
      setShowBossFireworks(true);

      // Hide after animation completes (use tier config duration + buffer)
      // mini: 3s, standard: 5s, elite: 8s
      const durations: Record<BossTier, number> = {
        mini: 3500,
        standard: 5500,
        elite: 8500,
      };
      hideTimeout = setTimeout(() => {
        setShowBossFireworks(false);
      }, durations[tier]);
    }

    // Update ref for next comparison
    prevBossPhaseRef.current = bossHealthState.phase;

    // Always return cleanup function (even if undefined timeout)
    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [bossHealthState.phase, levelNumber]);

  // Boss intro start handler (with start taunt)
  const handleBossIntroStart = useCallback(() => {
    setShowBossIntro(false);
    startBossBattle();
    if (!isPlaying) {
      onStartGame();
      onStartAIDirector();
    }
    triggerBossTaunt('onStart');
  }, [isPlaying, onStartGame, triggerBossTaunt, startBossBattle, onStartAIDirector]);

  // Boss intro skip handler (without start taunt)
  const handleBossIntroSkip = useCallback(() => {
    setShowBossIntro(false);
    startBossBattle();
    if (!isPlaying) {
      onStartGame();
      onStartAIDirector();
    }
  }, [isPlaying, onStartGame, startBossBattle, onStartAIDirector]);

  return {
    // Boss state
    isBossActive,
    bossConfig,
    bossTaunt,
    showBossTaunt,
    bossHealthState,
    bossHPPercentage,
    isEnraged,
    bossState,

    // Boss intro state
    showBossIntro,

    // Boss defeat state
    showBossFireworks,
    defeatedBossTier,

    // Boss mechanics functions
    checkBossWord,
    dealBossDamage,
    triggerBossTaunt,
    startBossBattle,
    endBossBattle,
    resetBossHealth,

    // Boss intro handlers
    handleBossIntroStart,
    handleBossIntroSkip,
  };
}
