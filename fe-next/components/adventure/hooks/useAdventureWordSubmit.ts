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
import { getBossWeakness, evaluateWeakness } from '@/lib/adventure/combat/weakness';
import { BOSS_RPG_COMBAT_ENABLED } from '@/lib/adventure/combat/config';
import { useHaptics } from '@/hooks/useHaptics';

// Monotonic counter for unique IDs (avoids Date.now() collisions on rapid submission)
let popupIdCounter = 0;

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
  dealBossDamage: (baseDamage: number, mechanicMultiplier: number) => number;
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
  /** Rotating boss mechanic phase for W10 finalWord boss */
  bossCurrentPhase?: string | null;
  /** Word Dynamite T3: detonate mode active */
  detonateActive?: boolean;
  /** Archetype — when 'hunt', valid words matching target length register as hunt guesses */
  archetype?: string;
  /** Hunt mode: target word (uppercase) */
  huntTargetWord?: string | null;
  /** Hunt mode: dispatch guess to reducer */
  submitHuntGuess?: (guess: string) => void;
}

export interface MechanicBonusData {
  id: number;
  feedbackKey: string;
  multiplier: number;
}

export interface UseAdventureWordSubmitReturn {
  handleWordSubmit: (submittedWord: string, submittedIndices: number[]) => Promise<void>;
  validationFeedback: ValidationFeedback;
  lastAccepted: { word: string; score: number } | null;
  wordFeedback: WordFeedback | null;
  lastSubmittedWordRef: React.MutableRefObject<{ word: string; path: Array<{ row: number; col: number }> } | null>;
  prevComboCountRef: React.MutableRefObject<number>;
  resetWordSubmitState: () => void;
  mechanicBonus: MechanicBonusData | null;
  dismissMechanicBonus: () => void;
  mechanicHitCount: number;
}

export function useAdventureWordSubmit(props: UseAdventureWordSubmitProps): UseAdventureWordSubmitReturn {
  const {
    isPlaying, isPaused, isCascading,
    currentWord, selectedIndices, tiles, gridSize, minWordLength,
    validateWord, submitWordWithPath, clearSelection, clearCurrentHint,
    recordActivity, resetOnGameAction,
    comboCount, wordsFound,
    isBossActive, bossConfig, checkBossWord, dealBossDamage, triggerBossTaunt,
    handleEarnAchievement, recordAIWord, handleAITransition,
    addScorePopup, getScoreMultiplier,
    upgradeBonuses, skillEffects, t, getPopupStartPosition,
    worldMechanic,
    bossCurrentPhase,
    bossHealPerWord = 0,
    healPlayerHealth,
    detonateActive = false,
    archetype,
    huntTargetWord,
    submitHuntGuess,
  } = props;

  const { tap, success: hapticSuccess } = useHaptics();

  const [validationFeedback, setValidationFeedback] = useState<ValidationFeedback>({
    error: null,
    wasSubmitted: false,
    isValid: false,
  });
  const [lastAccepted, setLastAccepted] = useState<{ word: string; score: number } | null>(null);
  const [wordFeedback, setWordFeedback] = useState<WordFeedback | null>(null);
  const [mechanicBonus, setMechanicBonus] = useState<MechanicBonusData | null>(null);
  const [mechanicHitCount, setMechanicHitCount] = useState(0);
  const dismissMechanicBonus = useCallback(() => setMechanicBonus(null), []);

  const validationErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordSubmittedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSubmittedWordRef = useRef<{ word: string; path: Array<{ row: number; col: number }> } | null>(null);
  const prevComboCountRef = useRef(0);
  // Track same-word submissions currently in-flight. Different words are
  // allowed to validate concurrently; only identical duplicates are dropped.
  const inFlightWordsRef = useRef<Set<string>>(new Set());
  // Holds a submission received during cascade so we can replay it once the
  // cascade finishes — otherwise fast consecutive words get silently dropped.
  const pendingCascadeSubmissionRef = useRef<{ word: string; indices: number[] } | null>(null);

  // Cleanup timeouts and guards on unmount
  useEffect(() => {
    return () => {
      if (validationErrorTimeoutRef.current) clearTimeout(validationErrorTimeoutRef.current);
      if (wordSubmittedTimeoutRef.current) clearTimeout(wordSubmittedTimeoutRef.current);
      inFlightWordsRef.current.clear();
      pendingCascadeSubmissionRef.current = null;
    };
  }, []);

  const handleWordSubmit = useCallback(
    async (submittedWord: string, submittedIndices: number[]) => {
      const word = submittedWord || currentWord;
      const indices = submittedIndices.length > 0 ? submittedIndices : selectedIndices;

      if (!isPlaying || isPaused) {
        clearSelection();
        return;
      }
      if (word.length < minWordLength) {
        clearSelection();
        return;
      }

      const normalizedWord = word.toLowerCase();

      // Queue the submission during cascade so rapid swipes aren't lost.
      // Replay after cascade ends (useEffect below).
      if (isCascading) {
        pendingCascadeSubmissionRef.current = { word, indices };
        clearSelection();
        return;
      }

      // Drop only duplicates of a word already being validated — different
      // words must be allowed through concurrently.
      if (inFlightWordsRef.current.has(normalizedWord)) {
        clearSelection();
        return;
      }
      inFlightWordsRef.current.add(normalizedWord);

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
      let result;
      try {
        result = await validateWord(word, path);
      } catch {
        // Network error or unexpected failure — unblock future submissions
        inFlightWordsRef.current.delete(normalizedWord);
        setValidationFeedback(prev => ({ ...prev, error: 'validationError' }));
        return;
      }
      inFlightWordsRef.current.delete(normalizedWord);

      // Silently ignore cancelled validations (aborted by a newer submission)
      // Still clear selection so tiles don't stay highlighted ("stuck word" bug)
      if (!result.isValid && !result.errorKey && !result.score) {
        clearSelection();
        return;
      }

      if (result.isValid && result.score) {
        try {
          const startPos = getPopupStartPosition();
          let scoreValue = Math.floor(result.score * upgradeBonuses.scoreBonus * getScoreMultiplier());

          // World mechanic bonus (use rotating boss phase for W10 finalWord boss)
          const activeMechanic = (isBossActive && bossCurrentPhase) ? bossCurrentPhase : (worldMechanic ?? null);
          const mechanicEval = evaluateWorldMechanic(word, activeMechanic, wordsFound);
          if (mechanicEval.bonus) {
            // Streak bonus: consecutive mechanic triggers boost the multiplier
            // 0 hits = 1x, 1 hit = 1x, 2 hits = 1.1x, 3+ = 1.2x (capped)
            const streakBonus = mechanicHitCount >= 3 ? 1.2 : mechanicHitCount >= 2 ? 1.1 : 1;
            const effectiveMultiplier = mechanicEval.multiplier * streakBonus;
            scoreValue = Math.floor(scoreValue * effectiveMultiplier);
            if (mechanicEval.feedbackKey) {
              setMechanicBonus({ id: ++popupIdCounter, feedbackKey: mechanicEval.feedbackKey, multiplier: effectiveMultiplier });
              setMechanicHitCount(prev => prev + 1);
            }
          } else if (mechanicHitCount > 0) {
            // Reset streak on non-mechanic word
            setMechanicHitCount(0);
          }

          let bossBonus: string | undefined;
          if (isBossActive && bossConfig) {
            const mechResult = checkBossWord(word);
            scoreValue = Math.floor(scoreValue * mechResult.scoreMultiplier);

            // RPG elemental weakness: hitting the boss's weak word-type crits.
            // Deterministic from the boss twist mechanic (see lib/adventure/combat/weakness).
            // Flag-dark: no damage change unless the RPG combat layer is enabled.
            const weak = BOSS_RPG_COMBAT_ENABLED
              ? evaluateWeakness(word, getBossWeakness(bossConfig.twistMechanic?.type))
              : { isWeakHit: false, multiplier: 1 };

            // Round once after all multipliers; stacked ceils would inflate damage up to +3.
            const rawBase = Math.max(1, scoreValue / 3);
            const baseDamage = Math.max(
              1,
              Math.ceil(
                rawBase
                  * skillEffects.bossDamageMultiplier
                  * skillEffects.getLongWordDamageMultiplier(word.length)
                  * weak.multiplier
              )
            );

            const mechanicMultiplier = mechResult.meetsRequirement ? 2.0 : 1.0;
            dealBossDamage(baseDamage, mechanicMultiplier);

            if (mechResult.triggerTaunt) {
              triggerBossTaunt(mechResult.triggerTaunt);
            } else if (scoreValue >= 50) {
              triggerBossTaunt('onGoodWord');
            }

            if (weak.isWeakHit) {
              bossBonus = 'WEAKNESS!';
            } else if (mechResult.meetsRequirement) {
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
            id: ++popupIdCounter,
            value: scoreValue,
            x: startPos.x,
            y: startPos.y,
            word,
            bonus: bossBonus || mechanicBonus || comboBonus,
          });

          hapticSuccess();
          setValidationFeedback({ error: null, isValid: true, wasSubmitted: true });
          setLastAccepted({ word, score: scoreValue });
          setWordFeedback({ id: `${++popupIdCounter}`, type: 'accepted', word, score: scoreValue, timestamp: Date.now() });
          lastSubmittedWordRef.current = { word, path };

          submitWordWithPath(word, scoreValue, path, { detonate: detonateActive });

          if (
            archetype === 'hunt' &&
            huntTargetWord &&
            word.length === huntTargetWord.length &&
            submitHuntGuess
          ) {
            submitHuntGuess(word);
          }
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
          // comboCount is the pre-submit value; the reducer increments it in
          // SUBMIT_WORD. So the actual streak after this word = comboCount + 1.
          const postSubmitCombo = comboCount + 1;
          if (postSubmitCombo >= 5) {
            handleEarnAchievement('WORD_STREAK_5');
          }
          if (postSubmitCombo >= 10) {
            handleEarnAchievement('WORD_STREAK_10');
          }
          if (postSubmitCombo >= 15) {
            handleEarnAchievement('COMBO_KING');
          }

          wordSubmittedTimeoutRef.current = setTimeout(() => {
            setValidationFeedback({ error: null, wasSubmitted: false, isValid: false });
            setLastAccepted(null);
            setWordFeedback(null);
          }, 1200);
        } finally {
          clearSelection();
        }
      } else if (result.errorKey) {
        const errorMessage = t(result.errorKey) || result.errorKey;
        setValidationFeedback({ error: errorMessage, isValid: false, wasSubmitted: false });
        setWordFeedback({ id: `${++popupIdCounter}`, type: 'rejected', word, message: errorMessage, timestamp: Date.now() });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPlaying, isPaused, isCascading, currentWord, selectedIndices, tiles, gridSize, validateWord, submitWordWithPath, clearSelection, t, getPopupStartPosition, comboCount, wordsFound, clearCurrentHint, recordActivity, resetOnGameAction, isBossActive, bossConfig, checkBossWord, triggerBossTaunt, dealBossDamage, minWordLength, upgradeBonuses.scoreBonus, skillEffects, handleEarnAchievement, recordAIWord, handleAITransition, addScorePopup, getScoreMultiplier, worldMechanic, bossCurrentPhase, tap, hapticSuccess, bossHealPerWord, healPlayerHealth, detonateActive]
  );

  // Flush a submission queued during cascade once cascade ends. Tile letters
  // may have shifted — validateWord re-checks path-word match and will reject
  // with proper feedback instead of silently dropping the word.
  const handleWordSubmitRef = useRef(handleWordSubmit);
  useEffect(() => { handleWordSubmitRef.current = handleWordSubmit; }, [handleWordSubmit]);
  useEffect(() => {
    if (isCascading) return;
    const pending = pendingCascadeSubmissionRef.current;
    if (!pending) return;
    pendingCascadeSubmissionRef.current = null;
    void handleWordSubmitRef.current(pending.word, pending.indices);
  }, [isCascading]);

  const resetWordSubmitState = useCallback(() => {
    setValidationFeedback({ error: null, wasSubmitted: false, isValid: false });
    setLastAccepted(null);
    setWordFeedback(null);
    setMechanicBonus(null);
    setMechanicHitCount(0);
    lastSubmittedWordRef.current = null;
    prevComboCountRef.current = 0;
    inFlightWordsRef.current.clear();
    pendingCascadeSubmissionRef.current = null;
    if (validationErrorTimeoutRef.current) {
      clearTimeout(validationErrorTimeoutRef.current);
      validationErrorTimeoutRef.current = null;
    }
    if (wordSubmittedTimeoutRef.current) {
      clearTimeout(wordSubmittedTimeoutRef.current);
      wordSubmittedTimeoutRef.current = null;
    }
  }, []);

  return {
    handleWordSubmit,
    validationFeedback,
    lastAccepted,
    wordFeedback,
    lastSubmittedWordRef,
    prevComboCountRef,
    resetWordSubmitState,
    mechanicBonus,
    dismissMechanicBonus,
    mechanicHitCount,
  };
}
