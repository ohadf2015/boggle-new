/**
 * useAdventureWordSubmit Hook
 *
 * Encapsulates the handleWordSubmit callback and related feedback state.
 * Handles validation, scoring, boss damage, achievements, and UI feedback.
 * Extracted from AdventureGame.tsx to reduce orchestrator size.
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import type { BossTauntEvent, BossConfig, BossMechanicResult } from '@/types/boss';
import type { AdventureAchievementId } from '@/utils/adventureAchievementUtils';
import type { GridTileState } from '@/types/adventure';
import { evaluateWorldMechanic } from '@/lib/adventure/worldMechanics';
import { useHaptics } from '@/hooks/useHaptics';

interface ValidationFeedback {
  error: string | null;
  wasSubmitted: boolean;
  isValid: boolean;
}

interface ScorePopup {
  id: number;
  value: number;
  x: number;
  y: number;
  word?: string;
  bonus?: string;
}

export interface UseAdventureWordSubmitProps {
  isPlaying: boolean;
  isPaused: boolean;
  isValidating: boolean;
  isCascading: boolean;
  currentWord: string;
  selectedIndices: number[];
  tiles: GridTileState[];
  gridSize: number;
  minWordLength: number;
  validateWord: (word: string, path: Array<{ row: number; col: number }>) => Promise<{ isValid: boolean; score?: number; errorKey?: string }>;
  submitWordWithPath: (word: string, score: number, path: Array<{ row: number; col: number }>, options?: { detonate?: boolean }) => void;
  clearSelection: () => void;
  clearCurrentHint: () => void;
  recordActivity: () => void;
  resetOnGameAction: () => void;
  comboCount: number;
  wordsFound: string[];
  isBossActive: boolean;
  bossConfig: BossConfig | null;
  checkBossWord: (word: string) => BossMechanicResult;
  dealBossDamage: (baseDamage: number, combo: number, mechanicMultiplier: number, comboBonus: number) => number;
  triggerBossTaunt: (event: BossTauntEvent) => void;
  handleEarnAchievement: (id: AdventureAchievementId) => boolean;
  recordAIWord: (success: boolean, combo: number) => void;
  handleAITransition: () => void;
  addScorePopup: (popup: ScorePopup) => void;
  getScoreMultiplier: () => number;
  upgradeBonuses: { scoreBonus: number; timeBonus: number; xpBonus: number };
  /** HP healed per word in boss fights (Armor Plating T4) */
  bossHealPerWord?: number;
  /** Player health heal function for boss heal-per-word */
  healPlayerHealth?: (amount: number) => void;
  skillEffects: {
    bossDamageMultiplier: number;
    comboMultiplierBonus: number;
    getLongWordDamageMultiplier: (length: number) => number;
  };
  t: (key: string) => string;
  getPopupStartPosition: () => { x: number; y: number };
  /** Current world mechanic (null for world 1) */
  worldMechanic?: string | null;
  /** Word Dynamite T3: detonate mode active */
  detonateActive?: boolean;
}

export interface UseAdventureWordSubmitReturn {
  handleWordSubmit: (submittedWord: string, submittedIndices: number[]) => Promise<void>;
  validationFeedback: ValidationFeedback;
  lastAccepted: { word: string; score: number } | null;
  wordFeedback: WordFeedback | null;
  lastSubmittedWordRef: React.MutableRefObject<{ word: string; path: Array<{ row: number; col: number }> } | null>;
  prevComboCountRef: React.MutableRefObject<number>;
}

export function useAdventureWordSubmit(props: UseAdventureWordSubmitProps): UseAdventureWordSubmitReturn {
  const {
    isPlaying, isPaused, isValidating,
    currentWord, selectedIndices, tiles, gridSize, minWordLength,
    validateWord, submitWordWithPath, clearSelection, clearCurrentHint,
    recordActivity, resetOnGameAction,
    comboCount, wordsFound,
    isBossActive, bossConfig, checkBossWord, dealBossDamage, triggerBossTaunt,
    handleEarnAchievement, recordAIWord, handleAITransition,
    addScorePopup, getScoreMultiplier,
    upgradeBonuses, skillEffects, t, getPopupStartPosition,
    worldMechanic,
    bossHealPerWord = 0,
    healPlayerHealth,
    detonateActive = false,
  } = props;

  const { tap, success: hapticSuccess } = useHaptics();

  const [validationFeedback, setValidationFeedback] = useState<ValidationFeedback>({
    error: null,
    wasSubmitted: false,
    isValid: false,
  });
  const [lastAccepted, setLastAccepted] = useState<{ word: string; score: number } | null>(null);
  const [wordFeedback, setWordFeedback] = useState<WordFeedback | null>(null);

  const validationErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordSubmittedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSubmittedWordRef = useRef<{ word: string; path: Array<{ row: number; col: number }> } | null>(null);
  const prevComboCountRef = useRef(0);
  // Synchronous guard to prevent double-submission from React state batching
  const isSubmittingRef = useRef(false);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (validationErrorTimeoutRef.current) clearTimeout(validationErrorTimeoutRef.current);
      if (wordSubmittedTimeoutRef.current) clearTimeout(wordSubmittedTimeoutRef.current);
    };
  }, []);

  const handleWordSubmit = useCallback(
    async (submittedWord: string, submittedIndices: number[]) => {
      const word = submittedWord || currentWord;
      const indices = submittedIndices.length > 0 ? submittedIndices : selectedIndices;

      if (!isPlaying || isPaused || word.length < minWordLength || isValidating || isSubmittingRef.current) return;
      isSubmittingRef.current = true;

      tap();

      if (validationErrorTimeoutRef.current) {
        clearTimeout(validationErrorTimeoutRef.current);
        validationErrorTimeoutRef.current = null;
      }
      if (wordSubmittedTimeoutRef.current) {
        clearTimeout(wordSubmittedTimeoutRef.current);
        wordSubmittedTimeoutRef.current = null;
      }

      setValidationFeedback(prev => ({ ...prev, error: null }));
      setWordFeedback(null);

      const path = indices.map(i => ({
        row: tiles[i]?.row ?? Math.floor(i / gridSize),
        col: tiles[i]?.col ?? i % gridSize,
      }));
      const result = await validateWord(word, path);
      isSubmittingRef.current = false;

      // Silently ignore cancelled validations (aborted by a newer submission)
      if (!result.isValid && !result.errorKey && !result.score) return;

      if (result.isValid && result.score) {
        const startPos = getPopupStartPosition();
        let scoreValue = Math.floor(result.score * upgradeBonuses.scoreBonus * getScoreMultiplier());

        // World mechanic bonus
        const mechanicEval = evaluateWorldMechanic(word, worldMechanic ?? null, wordsFound);
        if (mechanicEval.bonus) {
          scoreValue = Math.floor(scoreValue * mechanicEval.multiplier);
        }

        let bossBonus: string | undefined;
        if (isBossActive && bossConfig) {
          const mechResult = checkBossWord(word);
          scoreValue = Math.floor(scoreValue * mechResult.scoreMultiplier);

          let baseDamage = Math.floor(scoreValue / 10);
          baseDamage = Math.floor(baseDamage * skillEffects.bossDamageMultiplier);
          baseDamage = Math.floor(baseDamage * skillEffects.getLongWordDamageMultiplier(word.length));

          const mechanicMultiplier = mechResult.meetsRequirement ? 2.0 : 1.0;
          dealBossDamage(baseDamage, comboCount, mechanicMultiplier, skillEffects.comboMultiplierBonus);

          if (mechResult.triggerTaunt) {
            triggerBossTaunt(mechResult.triggerTaunt);
          } else if (scoreValue >= 50) {
            triggerBossTaunt('onGoodWord');
          }

          if (mechResult.meetsRequirement) {
            bossBonus = 'BOSS!';
          }

          // Armor Plating T4: heal player on every word during boss fight
          if (bossHealPerWord > 0 && healPlayerHealth) {
            healPlayerHealth(bossHealPerWord);
          }
        }

        const comboBonus = comboCount > 1 ? `${comboCount}x` : undefined;
        const mechanicBonus = mechanicEval.bonus && mechanicEval.feedbackKey
          ? t(mechanicEval.feedbackKey)
          : undefined;

        addScorePopup({
          id: Date.now(),
          value: scoreValue,
          x: startPos.x,
          y: startPos.y,
          word,
          bonus: bossBonus || mechanicBonus || comboBonus,
        });

        hapticSuccess();
        setValidationFeedback({ error: null, isValid: true, wasSubmitted: true });
        setLastAccepted({ word, score: scoreValue });
        setWordFeedback({ id: `${Date.now()}`, type: 'accepted', word, score: scoreValue, timestamp: Date.now() });
        lastSubmittedWordRef.current = { word, path };

        submitWordWithPath(word, scoreValue, path, { detonate: detonateActive });
        clearSelection();
        clearCurrentHint();
        recordActivity();
        resetOnGameAction();
        recordAIWord(true, comboCount);

        if (wordsFound.length === 0) {
          handleEarnAchievement('FIRST_WORD');
        }
        if (word.length >= 6) {
          handleEarnAchievement('LONG_WORD_6');
        }
        if (word.length >= 8) {
          handleEarnAchievement('LONG_WORD_8');
        }
        if (comboCount >= 5) {
          handleEarnAchievement('WORD_STREAK_5');
        }
        if (comboCount >= 10) {
          handleEarnAchievement('WORD_STREAK_10');
        }
        if (comboCount >= 15) {
          handleEarnAchievement('COMBO_KING');
        }

        wordSubmittedTimeoutRef.current = setTimeout(() => {
          setValidationFeedback({ error: null, wasSubmitted: false, isValid: false });
          setLastAccepted(null);
          setWordFeedback(null);
        }, 1200);
      } else if (result.errorKey) {
        const errorMessage = t(result.errorKey) || result.errorKey;
        setValidationFeedback({ error: errorMessage, isValid: false, wasSubmitted: false });
        setWordFeedback({ id: `${Date.now()}`, type: 'rejected', word, message: errorMessage, timestamp: Date.now() });
        clearSelection();

        recordAIWord(false, 0);

        if (prevComboCountRef.current > 0) {
          handleAITransition();
        }

        if (isBossActive) {
          triggerBossTaunt('onBadWord');
        }

        validationErrorTimeoutRef.current = setTimeout(() => {
          setValidationFeedback(prev => ({ ...prev, error: null }));
          setWordFeedback(null);
        }, 2000);
      }
    },
    [isPlaying, isPaused, isValidating, currentWord, selectedIndices, tiles, gridSize, validateWord, submitWordWithPath, clearSelection, t, getPopupStartPosition, comboCount, wordsFound, clearCurrentHint, recordActivity, resetOnGameAction, isBossActive, bossConfig, checkBossWord, triggerBossTaunt, dealBossDamage, minWordLength, upgradeBonuses.scoreBonus, skillEffects, handleEarnAchievement, recordAIWord, handleAITransition, addScorePopup, getScoreMultiplier, worldMechanic, tap, hapticSuccess, bossHealPerWord, healPlayerHealth, detonateActive]
  );

  return {
    handleWordSubmit,
    validationFeedback,
    lastAccepted,
    wordFeedback,
    lastSubmittedWordRef,
    prevComboCountRef,
  };
}
