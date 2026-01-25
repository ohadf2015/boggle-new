/**
 * useBossMechanics Hook
 *
 * Manages boss battle mechanics including:
 * - Taunt display with cooldown timing
 * - Word evaluation against twist mechanics
 * - Phase transitions for multi-phase bosses (Lexicon Dragon)
 * - Boss game state tracking
 */

'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { getBossConfig } from '@/lib/adventure/bossConfig';
import type {
  BossConfig,
  BossGameState,
  BossMechanicResult,
  BossTauntEvent,
  BossTwistType,
  UseBossMechanicsReturn,
} from '@/types/boss';

// ==============================================
// CONSTANTS
// ==============================================

/** How long a taunt is displayed (ms) */
const TAUNT_DISPLAY_MS = 3000;

/** Minimum cooldown between taunts (ms) */
const TAUNT_COOLDOWN_MS = 5000;

/** Minimum word length for assemblyLine (Baron Buildaword) bonus */
const ASSEMBLY_LINE_MIN_LENGTH = 5;

// ==============================================
// TYPES
// ==============================================

interface UseBossMechanicsProps {
  /** World ID to load boss config from (null for non-boss levels) */
  worldId: number | null;
}

// ==============================================
// MECHANIC CHECKERS
// ==============================================

/**
 * Check if a word is a palindrome (reads same forwards and backwards)
 */
function isPalindrome(word: string): boolean {
  const lower = word.toLowerCase();
  const reversed = lower.split('').reverse().join('');
  return lower.length >= 3 && lower === reversed;
}

/**
 * Check if a word contains any double letters (e.g., LETTERS has TT)
 */
function hasDoubleLetters(word: string): boolean {
  const upper = word.toUpperCase();
  for (let i = 0; i < upper.length - 1; i++) {
    if (upper[i] === upper[i + 1]) return true;
  }
  return false;
}

/**
 * Check if a word contains any of the given root fragments
 */
function containsRootFragment(word: string, roots: string[]): boolean {
  const upper = word.toUpperCase();
  return roots.some((root) => upper.includes(root.toUpperCase()));
}

/**
 * Check if a word uses any of the supernova letters
 */
function hasSupernovaLetters(word: string, letters: string[]): boolean {
  const upper = word.toUpperCase();
  return letters.some((letter) => upper.includes(letter.toUpperCase()));
}

/**
 * Evaluate a word against a specific twist mechanic
 */
function evaluateWordForMechanic(
  word: string,
  boss: BossConfig,
  mechanicState: Record<string, unknown>
): BossMechanicResult {
  const { type, params } = boss.twistMechanic;

  switch (type) {
    case 'popQuiz':
      return evaluatePopQuiz(word, params, mechanicState);

    case 'hiveMind':
      return evaluateHiveMind(word, params);

    case 'etymologyDig':
      return evaluateEtymologyDig(word, params);

    case 'idiomBattle':
      return evaluateIdiomBattle(word, params);

    case 'assemblyLine':
      return evaluateAssemblyLine(word, params);

    case 'scrambledReality':
      return evaluateScrambledReality(word, params, mechanicState);

    case 'mirrorMatch':
      return evaluateMirrorMatch(word, params);

    case 'stellarForge':
      return evaluateStellarForge(word, params);

    case 'babelSummit':
      return evaluateBabelSummit(word, params);

    case 'finalWord':
      return evaluateFinalWord(word, boss, mechanicState);

    default:
      return { meetsRequirement: false, scoreMultiplier: 1.0 };
  }
}

function evaluatePopQuiz(
  word: string,
  params: Record<string, unknown>,
  mechanicState: Record<string, unknown>
): BossMechanicResult {
  const requirementTypes = (params.requirementTypes as string[]) ?? [];
  const currentReqIndex = (mechanicState.currentRequirementIndex as number) ?? 0;
  const currentReq = requirementTypes[currentReqIndex % requirementTypes.length];
  const bonusMultiplier = (params.bonusMultiplier as number) ?? 1.5;
  const penaltyMultiplier = (params.penaltyMultiplier as number) ?? 0.8;

  let meets = false;

  switch (currentReq) {
    case 'doubleLetters':
      meets = hasDoubleLetters(word);
      break;
    case 'startsWith':
      // Check if word starts with a common consonant
      meets = /^[BCDFGHJKLMNPQRSTVWXYZ]/i.test(word);
      break;
    case 'exactLength':
      meets = word.length === 5;
      break;
    case 'containsVowel':
      meets = /[AEIOU]/i.test(word) && word.length >= 4;
      break;
    default:
      meets = false;
  }

  return {
    meetsRequirement: meets,
    scoreMultiplier: meets ? bonusMultiplier : penaltyMultiplier,
    triggerTaunt: meets ? 'onMechanic' : undefined,
    feedbackKey: meets
      ? 'adventure.bosses.common.requirementMet'
      : 'adventure.bosses.common.requirementMissed',
    triggerEffect: meets,
  };
}

/**
 * Build a standard mechanic result for threshold-based checks.
 * Many mechanics share the same pattern: if the word meets a condition,
 * apply a bonus multiplier and trigger a taunt.
 */
function buildThresholdResult(
  meets: boolean,
  bonusMultiplier: number,
  feedbackKey?: string
): BossMechanicResult {
  return {
    meetsRequirement: meets,
    scoreMultiplier: meets ? bonusMultiplier : 1.0,
    triggerTaunt: meets ? 'onMechanic' : undefined,
    feedbackKey: meets ? feedbackKey : undefined,
    triggerEffect: meets,
  };
}

function evaluateHiveMind(
  word: string,
  params: Record<string, unknown>
): BossMechanicResult {
  const synonymBonusMultiplier =
    (params.synonymBonusMultiplier as number) ?? 2.0;
  return buildThresholdResult(word.length >= 5, synonymBonusMultiplier);
}

function evaluateEtymologyDig(
  word: string,
  params: Record<string, unknown>
): BossMechanicResult {
  const rootFragments = (params.rootFragments as string[]) ?? [];
  const rootComboMultiplier =
    (params.rootComboMultiplier as number) ?? 1.8;
  return buildThresholdResult(
    containsRootFragment(word, rootFragments),
    rootComboMultiplier,
    'adventure.bosses.common.rootFound'
  );
}

function evaluateIdiomBattle(
  word: string,
  params: Record<string, unknown>
): BossMechanicResult {
  const idiomBonusMultiplier =
    (params.idiomBonusMultiplier as number) ?? 2.5;
  return buildThresholdResult(word.length >= 6, idiomBonusMultiplier);
}

function evaluateAssemblyLine(
  word: string,
  params: Record<string, unknown>
): BossMechanicResult {
  const compoundBonusMultiplier =
    (params.compoundBonusMultiplier as number) ?? 3.0;
  return buildThresholdResult(
    word.length >= ASSEMBLY_LINE_MIN_LENGTH,
    compoundBonusMultiplier,
    'adventure.bosses.common.compoundDetected'
  );
}

/**
 * Check if two words are anagrams of each other.
 * Anagrams have the same letters in different order.
 * Words must be different (same word is not an anagram of itself).
 */
function areAnagrams(word1: string, word2: string): boolean {
  if (word1.length !== word2.length) return false;
  if (word1.length === 0) return false;
  const upper1 = word1.toUpperCase();
  const upper2 = word2.toUpperCase();
  if (upper1 === upper2) return false; // Same word is not an anagram of itself
  const sorted1 = upper1.split('').sort().join('');
  const sorted2 = upper2.split('').sort().join('');
  return sorted1 === sorted2;
}

function evaluateScrambledReality(
  word: string,
  params: Record<string, unknown>,
  mechanicState: Record<string, unknown> = {}
): BossMechanicResult {
  const anagramBonusMultiplier =
    (params.anagramBonusMultiplier as number) ?? 2.0;
  const foundWords = (mechanicState.foundWords as string[]) ?? [];

  // Check if word is anagram of any previously found word
  const hasAnagramPair = foundWords.some((prevWord) =>
    areAnagrams(word, prevWord)
  );

  // Fallback: Check unique letters >= 4
  const uniqueLetters = new Set(word.toUpperCase().split('')).size;
  const meetsRequirement = hasAnagramPair || uniqueLetters >= 4;

  // Special feedback only for anagram pair detection
  const feedbackKey = hasAnagramPair
    ? 'adventure.bosses.common.anagramPair'
    : undefined;

  return {
    meetsRequirement,
    scoreMultiplier: meetsRequirement ? anagramBonusMultiplier : 1.0,
    triggerTaunt: meetsRequirement ? 'onMechanic' : undefined,
    feedbackKey,
    triggerEffect: meetsRequirement,
  };
}

function evaluateMirrorMatch(
  word: string,
  params: Record<string, unknown>
): BossMechanicResult {
  const palindromeBonusMultiplier =
    (params.palindromeBonusMultiplier as number) ?? 3.0;
  return buildThresholdResult(
    isPalindrome(word),
    palindromeBonusMultiplier,
    'adventure.bosses.common.palindromeFound'
  );
}

function evaluateStellarForge(
  word: string,
  params: Record<string, unknown>
): BossMechanicResult {
  const supernovaLetters = (params.supernovaLetters as string[]) ?? [
    'Q',
    'X',
    'Z',
  ];
  const supernovaBonusMultiplier =
    (params.supernovaBonusMultiplier as number) ?? 2.5;
  return buildThresholdResult(
    hasSupernovaLetters(word, supernovaLetters),
    supernovaBonusMultiplier,
    'adventure.bosses.common.supernovaWord'
  );
}

function evaluateBabelSummit(
  word: string,
  params: Record<string, unknown>
): BossMechanicResult {
  // BabelSummit rewards universal/long words
  const universalWordBonusMultiplier =
    (params.universalWordBonusMultiplier as number) ?? 3.0;
  const loanwordBonusMultiplier =
    (params.loanwordBonusMultiplier as number) ?? 1.5;
  const isLong = word.length >= 6;

  return {
    meetsRequirement: isLong,
    scoreMultiplier: isLong ? universalWordBonusMultiplier : loanwordBonusMultiplier,
    triggerTaunt: isLong ? 'onMechanic' : undefined,
    triggerEffect: isLong,
  };
}

function evaluateFinalWord(
  word: string,
  boss: BossConfig,
  mechanicState: Record<string, unknown>
): BossMechanicResult {
  // FinalWord cycles through all previous mechanics based on current phase
  const currentPhase = (mechanicState.currentPhase as string) ?? 'popQuiz';
  const phaseOrder =
    (boss.twistMechanic.params.phaseOrder as string[]) ?? [];

  // Create a temporary boss-like config for the current phase mechanic
  const phaseBoss: BossConfig = {
    ...boss,
    twistMechanic: {
      ...boss.twistMechanic,
      type: currentPhase as BossTwistType,
      params: getBossConfig(phaseOrder.indexOf(currentPhase) + 1)
        ?.twistMechanic.params ?? {},
    },
  };

  return evaluateWordForMechanic(word, phaseBoss, mechanicState);
}

// ==============================================
// HOOK
// ==============================================

export function useBossMechanics({
  worldId,
}: UseBossMechanicsProps): UseBossMechanicsReturn {
  // Load boss config
  const boss = useMemo(
    () => (worldId !== null ? getBossConfig(worldId) : null),
    [worldId]
  );

  // Boss game state
  const [bossState, setBossState] = useState<BossGameState>(() => {
    const phaseOrder = boss?.twistMechanic.params.phaseOrder as
      | string[]
      | undefined;
    const isFinalWord = boss?.twistMechanic.type === 'finalWord';

    return {
      currentTauntIndex: 0,
      lastTauntTime: 0,
      mechanicState: {
        currentRequirementIndex: 0,
        currentPhase: isFinalWord && phaseOrder ? phaseOrder[0] : undefined,
      },
      phase: isFinalWord && phaseOrder ? phaseOrder[0] : undefined,
      introShown: false,
      isActive: boss !== null,
    };
  });

  // Taunt state
  const [currentTaunt, setCurrentTaunt] = useState<string | null>(null);
  const [showTaunt, setShowTaunt] = useState(false);

  // Timer refs for cleanup
  const tauntTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (tauntTimerRef.current) {
        clearTimeout(tauntTimerRef.current);
        tauntTimerRef.current = null;
      }
    };
  }, []);

  // Trigger a taunt for a specific event
  const triggerTaunt = useCallback(
    (event: BossTauntEvent) => {
      if (!boss) return;

      // Check cooldown
      const now = Date.now();
      if (now - bossState.lastTauntTime < TAUNT_COOLDOWN_MS && bossState.lastTauntTime > 0) {
        return;
      }

      // Get taunt value
      const tauntValue = boss.taunts[event];
      let tauntKey: string;

      if (Array.isArray(tauntValue)) {
        if (tauntValue.length === 0) return;
        const index = bossState.currentTauntIndex % tauntValue.length;
        tauntKey = tauntValue[index];
      } else {
        tauntKey = tauntValue;
      }

      // Show taunt
      setCurrentTaunt(tauntKey);
      setShowTaunt(true);

      // Update boss state
      setBossState((prev) => ({
        ...prev,
        currentTauntIndex: prev.currentTauntIndex + 1,
        lastTauntTime: now,
      }));

      // Clear existing timer
      if (tauntTimerRef.current) {
        clearTimeout(tauntTimerRef.current);
      }

      // Auto-hide after display duration
      tauntTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setShowTaunt(false);
        }
      }, TAUNT_DISPLAY_MS);
    },
    [boss, bossState.lastTauntTime, bossState.currentTauntIndex]
  );

  // Check a word against the boss mechanic
  const checkWord = useCallback(
    (word: string): BossMechanicResult => {
      if (!boss) {
        return { meetsRequirement: false, scoreMultiplier: 1.0 };
      }

      const result = evaluateWordForMechanic(word, boss, bossState.mechanicState);

      // Track found words for anagram detection (scrambledReality mechanic)
      if (boss.twistMechanic.type === 'scrambledReality') {
        setBossState((prev) => {
          const existingWords = (prev.mechanicState.foundWords as string[]) ?? [];
          return {
            ...prev,
            mechanicState: {
              ...prev.mechanicState,
              foundWords: [...existingWords, word.toUpperCase()],
            },
          };
        });
      }

      return result;
    },
    [boss, bossState.mechanicState]
  );

  // Advance to next phase (for multi-phase bosses)
  const advancePhase = useCallback(() => {
    if (!boss) return;

    const isFinalWord = boss.twistMechanic.type === 'finalWord';
    if (!isFinalWord) return;

    const phaseOrder = boss.twistMechanic.params.phaseOrder as string[];
    if (!phaseOrder || phaseOrder.length === 0) return;

    setBossState((prev) => {
      const currentPhase = prev.mechanicState.currentPhase as string;
      const currentIndex = phaseOrder.indexOf(currentPhase);
      const nextIndex = (currentIndex + 1) % phaseOrder.length;
      const nextPhase = phaseOrder[nextIndex];

      return {
        ...prev,
        phase: nextPhase,
        mechanicState: {
          ...prev.mechanicState,
          currentPhase: nextPhase,
          currentRequirementIndex:
            ((prev.mechanicState.currentRequirementIndex as number) ?? 0) + 1,
        },
      };
    });
  }, [boss]);

  const currentRequirement = boss?.twistMechanic.description;

  return {
    isActive: boss !== null,
    currentRequirement,
    checkWord,
    triggerTaunt,
    advancePhase,
    currentTaunt,
    showTaunt,
    bossState,
    boss,
  };
}
