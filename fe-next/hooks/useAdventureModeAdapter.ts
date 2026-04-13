/**
 * Adventure Mode Adapter
 *
 * Reads the level's archetype and provides mode-specific state/logic
 * so the Adventure UI can render differently for each game mode type.
 */

import { useMemo } from 'react';
import type { LevelConfig, LevelArchetype } from '@/types/adventure';

export type AdventureGameMode = 'timer' | 'moves' | 'lives';

export interface AdventureModeState {
  /** The archetype of the current level */
  archetype: LevelArchetype;
  /** Whether this mode uses a timer, move counter, or life bar */
  gameMode: AdventureGameMode;
  /** Whether to show the standard countdown timer */
  showTimer: boolean;
  /** Whether to show a move counter instead of timer */
  showMoveCounter: boolean;
  /** Maximum moves for move-based modes (blast) */
  movesLimit: number;
  /** Whether to show a life bar (hunt mode) */
  showLifeBar: boolean;
  /** Starting life points for life-based modes */
  lifePoints: number;
  /** Whether a center letter is required (wheel mode) */
  centerLetterRequired: boolean;
  /** The mandatory center letter (wheel mode) */
  centerLetter: string | null;
  /** Whether to show the target word hunt UI (hunt mode) */
  showTargetWordUI: boolean;
  /** Whether to show rune picker before level starts (forge mode) */
  showRunePicker: boolean;
  /** Display label key for the mode */
  modeDisplayKey: string;
  /** Mode-specific objective description key */
  modeObjectiveKey: string;
}

/**
 * Returns mode-specific configuration derived from the level config.
 * Pure computation — no side effects, no subscriptions.
 */
export function useAdventureModeAdapter(levelConfig: LevelConfig | null): AdventureModeState {
  return useMemo(() => {
    if (!levelConfig) {
      return getDefaultModeState();
    }

    const archetype = levelConfig.archetype;

    switch (archetype) {
      case 'blast':
        return {
          archetype,
          gameMode: 'moves' as AdventureGameMode,
          showTimer: false,
          showMoveCounter: true,
          movesLimit: levelConfig.movesLimit ?? Math.round(levelConfig.gridSize * levelConfig.gridSize * 0.6),
          showLifeBar: false,
          lifePoints: 0,
          centerLetterRequired: false,
          centerLetter: null,
          showTargetWordUI: false,
          showRunePicker: false,
          modeDisplayKey: 'adventure.mode.blast',
          modeObjectiveKey: 'adventure.mode.blastObjective',
        };

      case 'hunt':
        return {
          archetype,
          gameMode: 'lives' as AdventureGameMode,
          showTimer: false,
          showMoveCounter: false,
          movesLimit: 0,
          showLifeBar: true,
          lifePoints: levelConfig.lifePoints ?? 100,
          centerLetterRequired: false,
          centerLetter: null,
          showTargetWordUI: true,
          showRunePicker: false,
          modeDisplayKey: 'adventure.mode.hunt',
          modeObjectiveKey: 'adventure.mode.huntObjective',
        };

      case 'wheel':
        return {
          archetype,
          gameMode: 'timer' as AdventureGameMode,
          showTimer: true,
          showMoveCounter: false,
          movesLimit: 0,
          showLifeBar: false,
          lifePoints: 0,
          centerLetterRequired: false,
          centerLetter: null,
          showTargetWordUI: false,
          showRunePicker: false,
          modeDisplayKey: 'adventure.mode.wheel',
          modeObjectiveKey: 'adventure.mode.wheelObjective',
        };

      case 'forge':
        return {
          archetype,
          gameMode: 'timer' as AdventureGameMode,
          showTimer: true,
          showMoveCounter: false,
          movesLimit: 0,
          showLifeBar: false,
          lifePoints: 0,
          centerLetterRequired: false,
          centerLetter: null,
          showTargetWordUI: false,
          showRunePicker: levelConfig.hasRunePick ?? true,
          modeDisplayKey: 'adventure.mode.forge',
          modeObjectiveKey: 'adventure.mode.forgeObjective',
        };

      case 'boss':
        return {
          archetype,
          gameMode: 'timer' as AdventureGameMode,
          showTimer: true,
          showMoveCounter: false,
          movesLimit: 0,
          showLifeBar: false,
          lifePoints: 0,
          centerLetterRequired: false,
          centerLetter: null,
          showTargetWordUI: false,
          showRunePicker: false,
          modeDisplayKey: 'adventure.mode.boss',
          modeObjectiveKey: 'adventure.mode.bossObjective',
        };

      case 'classic':
      default:
        return getDefaultModeState();
    }
  }, [levelConfig]);
}

function getDefaultModeState(): AdventureModeState {
  return {
    archetype: 'classic',
    gameMode: 'timer',
    showTimer: true,
    showMoveCounter: false,
    movesLimit: 0,
    showLifeBar: false,
    lifePoints: 0,
    centerLetterRequired: false,
    centerLetter: null,
    showTargetWordUI: false,
    showRunePicker: false,
    modeDisplayKey: 'adventure.mode.classic',
    modeObjectiveKey: 'adventure.mode.classicObjective',
  };
}
