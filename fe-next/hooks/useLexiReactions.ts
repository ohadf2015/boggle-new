/**
 * useLexiReactions - Detects game events and triggers Lexi mascot reactions
 *
 * Monitors adventure game state and emits contextual reactions for:
 * - Long words (6+ letters)
 * - Combo milestones (3x, 5x, 10x)
 * - First word of level
 * - Time-pressure wins (<10 seconds remaining)
 *
 * NOTE: Stuck detection and struggle patterns are deferred to a future iteration.
 * Translation keys for these features exist but implementation is not in scope.
 *
 * Enforces 3s cooldown between reactions to prevent spam.
 * Higher-priority reactions can override lower-priority ones.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ExtendedMascotVariant } from '@/components/ui/InteractiveMascot';

// ==============================================
// TYPES
// ==============================================

export type LexiReactionType =
  | 'celebration'   // Achievement (long word, combo, first word)
  | 'encourage'     // (Future: struggle or stuck)
  | 'levelComplete' // Level finished with stars
  | 'hint';         // (Future: player stuck for too long)

export type ReactionPriority = 'high' | 'normal' | 'low';

export interface LexiReaction {
  /** Unique ID for React key */
  id: number;
  /** Type of reaction */
  type: LexiReactionType;
  /** Mascot variant to display */
  variant: ExtendedMascotVariant;
  /** Translation key for dialogue text */
  messageKey: string;
  /** Priority for cooldown override */
  priority: ReactionPriority;
  /** Custom cooldown override (ms) */
  cooldown?: number;
}

export interface GameStateForReactions {
  /** Words found in current level */
  wordsFound: string[];
  /** Current combo multiplier */
  comboCount: number;
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Whether level is complete */
  isComplete: boolean;
  /** Stars earned (0-3) */
  stars: number;
  /** Current world ID (1-3) */
  worldId: number;
}

export interface UseLexiReactionsOptions {
  /** Game state to monitor */
  gameState: GameStateForReactions;
  /** Whether game is actively playing */
  isPlaying: boolean;
  /** Callback when reaction should be dismissed */
  onDismiss?: () => void;
  /** Cooldown between reactions in ms (default: 3000) */
  cooldownMs?: number;
}

export interface UseLexiReactionsReturn {
  /** Current active reaction (null if none) */
  reaction: LexiReaction | null;
  /** Dismiss current reaction */
  dismissReaction: () => void;
  /** Manually trigger a reaction (for level complete, etc.) */
  triggerReaction: (reaction: Omit<LexiReaction, 'id'>) => void;
}

// ==============================================
// CONSTANTS
// ==============================================

/** Default cooldown between reactions in milliseconds */
export const COOLDOWN_MS = 3000;
const LONG_WORD_LENGTH = 6;
const COMBO_MILESTONES = [3, 5, 10] as const;

// Priority order (higher = takes precedence)
const PRIORITY_ORDER: Record<ReactionPriority, number> = {
  high: 3,
  normal: 2,
  low: 1,
};

// ==============================================
// HELPER: Get world-specific message key
// ==============================================

function getWorldMessageKey(baseKey: string, worldId: number): string {
  // Try world-specific first, fallback to default
  return `adventure.lexi.${baseKey}.world${worldId}`;
}

function getDefaultMessageKey(baseKey: string): string {
  return `adventure.lexi.${baseKey}.default`;
}

// ==============================================
// HOOK
// ==============================================

export function useLexiReactions({
  gameState,
  isPlaying,
  onDismiss,
  cooldownMs = COOLDOWN_MS,
}: UseLexiReactionsOptions): UseLexiReactionsReturn {
  const [reaction, setReaction] = useState<LexiReaction | null>(null);

  // Refs for tracking state changes
  const lastReactionTimeRef = useRef<number>(0);
  const prevWordsFoundRef = useRef<number>(0);
  const prevComboRef = useRef<number>(0);
  const reactionIdRef = useRef<number>(0);

  // Check if cooldown allows new reaction
  const canTrigger = useCallback(
    (priority: ReactionPriority): boolean => {
      const now = Date.now();
      const elapsed = now - lastReactionTimeRef.current;

      // High priority can override during cooldown
      if (priority === 'high' && elapsed > cooldownMs / 2) {
        return true;
      }

      return elapsed >= cooldownMs;
    },
    [cooldownMs]
  );

  // Trigger a new reaction
  const triggerReaction = useCallback(
    (newReaction: Omit<LexiReaction, 'id'>) => {
      if (!canTrigger(newReaction.priority)) {
        return;
      }

      // Check if current reaction has higher priority
      if (
        reaction &&
        PRIORITY_ORDER[reaction.priority] > PRIORITY_ORDER[newReaction.priority]
      ) {
        return;
      }

      reactionIdRef.current += 1;
      lastReactionTimeRef.current = Date.now();

      setReaction({
        ...newReaction,
        id: reactionIdRef.current,
      });
    },
    [canTrigger, reaction]
  );

  // Dismiss current reaction
  const dismissReaction = useCallback(() => {
    setReaction(null);
    onDismiss?.();
  }, [onDismiss]);

  // Auto-dismiss reaction after display duration
  useEffect(() => {
    if (!reaction) return;

    const displayDuration = reaction.cooldown || 2000;
    const timer = setTimeout(() => {
      dismissReaction();
    }, displayDuration);

    return () => clearTimeout(timer);
  }, [reaction, dismissReaction]);

  // Detect long word (6+ letters)
  useEffect(() => {
    if (!isPlaying) return;

    const currentWordsCount = gameState.wordsFound.length;
    if (currentWordsCount <= prevWordsFoundRef.current) {
      prevWordsFoundRef.current = currentWordsCount;
      return;
    }

    const lastWord = gameState.wordsFound[gameState.wordsFound.length - 1];
    prevWordsFoundRef.current = currentWordsCount;

    if (lastWord && lastWord.length >= LONG_WORD_LENGTH) {
      triggerReaction({
        type: 'celebration',
        variant: lastWord.length >= 8 ? 'mindblown' : 'celebrating',
        messageKey: getWorldMessageKey('longWord', gameState.worldId),
        priority: 'normal',
      });
    } else if (currentWordsCount === 1) {
      // First word of level
      triggerReaction({
        type: 'celebration',
        variant: 'encouraging',
        messageKey: getDefaultMessageKey('firstWord'),
        priority: 'low',
      });
    }
  }, [gameState.wordsFound, gameState.worldId, isPlaying, triggerReaction]);

  // Detect combo milestones (3x, 5x, 10x)
  useEffect(() => {
    if (!isPlaying) return;

    const currentCombo = gameState.comboCount;
    const prevCombo = prevComboRef.current;
    prevComboRef.current = currentCombo;

    // Check for milestone crossings
    for (const milestone of COMBO_MILESTONES) {
      if (currentCombo >= milestone && prevCombo < milestone) {
        const isHighCombo = milestone >= 10;
        triggerReaction({
          type: 'celebration',
          variant: isHighCombo ? 'onfire' : 'celebrating',
          messageKey: getDefaultMessageKey(`combo${milestone}x`),
          priority: isHighCombo ? 'high' : 'normal',
        });
        break; // Only trigger one milestone at a time
      }
    }
  }, [gameState.comboCount, isPlaying, triggerReaction]);

  // Detect time-pressure win (complete with <10s remaining)
  useEffect(() => {
    if (
      gameState.isComplete &&
      gameState.stars > 0 &&
      gameState.timeRemaining > 0 &&
      gameState.timeRemaining <= 10
    ) {
      triggerReaction({
        type: 'celebration',
        variant: 'victory',
        messageKey: getDefaultMessageKey('timeBonus'),
        priority: 'high',
      });
    }
  }, [gameState.isComplete, gameState.stars, gameState.timeRemaining, triggerReaction]);

  // Reset refs when game restarts
  useEffect(() => {
    if (gameState.wordsFound.length === 0) {
      prevWordsFoundRef.current = 0;
      prevComboRef.current = 0;
    }
  }, [gameState.wordsFound.length]);

  return {
    reaction,
    dismissReaction,
    triggerReaction,
  };
}

export default useLexiReactions;
