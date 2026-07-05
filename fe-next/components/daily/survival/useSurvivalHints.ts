'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Language } from '@/types';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { generateProgressiveHints, generateFallbackHints, CLUE_SHOP_ITEMS, type HintLevel, type ClueShopItem } from '@/utils/aiHintGenerator';
import type { FeedbackType } from '../WordFeedbackToast';


export interface UseSurvivalHintsProps {
  targetWord: string;
  language: Language;
  playWordAcceptedSound?: () => void;
  showToast: (type: FeedbackType, message: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  accumulatedClues?: Map<number, { letter: string; type: string }>;
}


export interface HintState {
  currentHint: HintLevel | null;
  category: string;
  exampleSentence: string;
  revealedLetters: Set<number>;
  eliminatedLetters: Set<string>;
  showCategory: boolean;
  showExample: boolean;
  tokensSpent: number;
  hintStage: number;
  nextHintItem: ClueShopItem | null;
}

export interface HintActions {
  buyNextHint: (clueTokens: number, setClueTokens: (fn: (prev: number) => number) => void) => void;
  getNextAffordableClue: (tokens: number) => ClueShopItem | null;
  handlePurchase: (item: ClueShopItem, tokens: number, setTokens: (fn: (prev: number) => number) => void, setShowShop?: (show: boolean) => void) => void;
  // Legacy actions kept for compatibility if needed, but buyNextHint is preferred
  autoRevealLetter: () => number;
  revealCategory: () => void;
  revealExample: () => void;
  // Free auto-unlock (no token deduction). Reveals next available hint tier.
  // Never reveals the final letter of the target word.
  autoUnlockNextHint: () => ClueShopItem | null;
}

/**
 * Hook to manage hint system and clue shop purchases
 */
export function useSurvivalHints({
  targetWord,
  language,
  playWordAcceptedSound,
  showToast,
  t,
  accumulatedClues,
}: UseSurvivalHintsProps): [HintState, HintActions] {
  const [currentHint, setCurrentHint] = useState<HintLevel | null>(null);
  const [category, setCategory] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');
  const [revealedLetters, setRevealedLetters] = useState<Set<number>>(new Set());
  const [eliminatedLetters] = useState<Set<string>>(new Set());
  const [showCategory, setShowCategory] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [tokensSpent, setTokensSpent] = useState(0);
  
  // Stage 0: Reveal Letter, Stage 1: Reveal Category, Stage 2: Example Sentence
  const [hintStage, setHintStage] = useState(0);

  // Generate initial fallback hints synchronously
  const initialHints = useMemo(() => {
    if (!targetWord || targetWord.length < 2) return null;
    return generateFallbackHints(targetWord, language);
  }, [targetWord, language]);

  // Set initial hints on mount (only when initialHints changes, not currentHint)
  useEffect(() => {
    if (initialHints && initialHints.hints.length > 0) {
      setCurrentHint(prev => prev ?? initialHints.hints[0]);
      setCategory(initialHints.category);
      setExampleSentence(initialHints.exampleSentence);
    }
  }, [initialHints]);

  // Positions still hidden from the player (excludes last index, shop reveals, gameplay greens)
  const unrevealedPositions = useMemo(() => {
    if (!targetWord) return [];
    const hintChars = currentHint?.hint.split(' ').filter(c => c !== '') ?? [];
    const lastIdx = targetWord.length - 1;
    return [...Array(targetWord.length).keys()].filter(
      i =>
        i !== lastIdx &&
        !revealedLetters.has(i) &&
        !accumulatedClues?.has(i) &&
        (hintChars[i] === '_' || hintChars[i] === undefined)
    );
  }, [targetWord, revealedLetters, accumulatedClues, currentHint]);

  // Determine hint availability based on state
  const unrevealedCount = useMemo(() => {
    if (!targetWord) return 0;
    const greenPositions = accumulatedClues ? accumulatedClues.size : 0;
    return targetWord.length - revealedLetters.size - greenPositions;
  }, [targetWord, revealedLetters, accumulatedClues]);

  // We can reveal letters until only 1 is left hidden
  const canRevealLetter = unrevealedCount > 1;
  const canRevealCategory = !showCategory;
  const canRevealExample = !showExample;

  // Sync hintStage with availability
  useEffect(() => {
    if (canRevealLetter) setHintStage(0);
    else if (canRevealCategory) setHintStage(1);
    else if (canRevealExample) setHintStage(2);
    else setHintStage(3);
  }, [canRevealLetter, canRevealCategory, canRevealExample]);

  // Load AI-enhanced hints asynchronously
  useEffect(() => {
    if (!targetWord || targetWord.length < 2) return;

    async function loadHints() {
      try {
        const hints = await generateProgressiveHints(targetWord, language);
        setCategory(hints.category);
        setExampleSentence(hints.exampleSentence);
        if (hints.hints.length > 0) {
          setCurrentHint(hints.hints[0]);
        }
      } catch (error) {
        // Fallback to basic hints if AI fails
        console.error('Failed to load hints:', error);
      }
    }
    loadHints();
  }, [targetWord, language]);
  
  // Determine next hint item dynamically
  const nextHintItem = useMemo(() => {
    if (canRevealLetter) {
       return CLUE_SHOP_ITEMS.find(i => i.id === 'reveal_letter') || null;
    }
    if (canRevealCategory) {
       return CLUE_SHOP_ITEMS.find(i => i.id === 'reveal_category') || null;
    }
    if (canRevealExample) {
       return CLUE_SHOP_ITEMS.find(i => i.id === 'example_sentence') || null;
    }
    return null;
  }, [canRevealLetter, canRevealCategory, canRevealExample]);

  // Handle buying next hint
  const buyNextHint = useCallback((
    clueTokens: number,
    setClueTokens: (fn: (prev: number) => number) => void
  ) => {
    if (!nextHintItem) return;
    
    if (clueTokens < nextHintItem.cost) {
      showToast('invalid-word', t('wordHunt.survival.notEnoughTokens') || 'Not enough tokens!');
      return;
    }
    
    // Apply effect
    let success = false;
    
    if (nextHintItem.id === 'reveal_letter') {
        if (unrevealedPositions.length > 0) {
             const nextIdx = unrevealedPositions[0];
             setRevealedLetters(prev => new Set([...prev, nextIdx]));
             success = true;
        } else {
             showToast('invalid-word', t('wordHunt.survival.allLettersRevealed'));
        }
    } else if (nextHintItem.id === 'reveal_category') {
        setShowCategory(true);
        success = true;
    } else if (nextHintItem.id === 'example_sentence') {
        setShowExample(true);
        success = true;
    }

    if (success) {
        setClueTokens(prev => prev - nextHintItem.cost);
        setTokensSpent(prev => prev + nextHintItem.cost);
        playWordAcceptedSound?.();

        const clueNameKey =
          nextHintItem.id === 'reveal_letter'
            ? 'wordHunt.survival.revealLetter'
            : nextHintItem.id === 'reveal_category'
              ? 'wordHunt.survival.revealCategory'
              : 'wordHunt.survival.exampleSentence';
        showToast(
          'clue-unlocked',
          t('wordHunt.survival.clueUnlocked', { name: t(clueNameKey), cost: safeToLocaleString(nextHintItem.cost, language) }),
        );
    }

  }, [nextHintItem, unrevealedPositions, playWordAcceptedSound, showToast, t, language]);


  // Auto-Unlock logic
  // "it should auto unlocked"
  useEffect(() => {
    if (!nextHintItem) return;
    
    // We cannot access clueTokens here directly as it is passed to actions...
    // Wait, useSurvivalHints manages internal state but clueTokens is managed by parent useSurvivalLogic?
    // No, clueTokens is passed INTO handlePurchase.
    
    // We need the CURRENT clueTokens to be available here to effect an auto-purchase.
    // However, clueTokens is state in useSurvivalGameLogic, passed down.
    // If we want auto-unlock logic inside this hook, we need clueTokens as prop.
    // Or, we expose a check function that useSurvivalGameLogic calls in an effect.
  }, [nextHintItem]); // Placeholder comment logic
  
  // ... re-adding autoRevealLetter etc for internal use if needed
  
  const getNextAffordableClue = useCallback((tokens: number): ClueShopItem | null => {
    if (!nextHintItem) return null;
    return tokens >= nextHintItem.cost ? nextHintItem : null;
  }, [nextHintItem]);

  const handlePurchase = useCallback((
    item: ClueShopItem,
    tokens: number,
    setTokens: (fn: (prev: number) => number) => void,
    setShowShop?: (show: boolean) => void
  ) => {
    // If the item matches current next item, buy it
    if (nextHintItem && item.id === nextHintItem.id) {
        buyNextHint(tokens, setTokens);
        if (setShowShop) setShowShop(false);
    }
  }, [nextHintItem, buyNextHint]);

  const autoRevealLetter = useCallback((): number => {
      if (unrevealedPositions.length > 0) {
        const nextIdx = unrevealedPositions[0];
        setRevealedLetters(prev => new Set([...prev, nextIdx]));
        return nextIdx;
      }
      return -1;
    }, [unrevealedPositions]);

  const autoUnlockNextHint = useCallback((): ClueShopItem | null => {
      if (!nextHintItem) return null;
      // Don't auto-unlock anything when only 1 letter remains — player must guess it
      if (!canRevealLetter) return null;
      if (nextHintItem.id === 'reveal_letter') {
          if (unrevealedPositions.length === 0) return null;
          setRevealedLetters(prev => new Set([...prev, unrevealedPositions[0]]));
      } else if (nextHintItem.id === 'reveal_category') {
          setShowCategory(true);
      } else if (nextHintItem.id === 'example_sentence') {
          setShowExample(true);
      }
      playWordAcceptedSound?.();
      return nextHintItem;
  }, [nextHintItem, canRevealLetter, unrevealedPositions, playWordAcceptedSound]);

  const revealCategory = useCallback(() => setShowCategory(true), []);
  const revealExample = useCallback(() => setShowExample(true), []);

  const state: HintState = {
    currentHint,
    category,
    exampleSentence,
    revealedLetters,
    eliminatedLetters,
    showCategory,
    showExample,
    tokensSpent,
    hintStage,
    nextHintItem,
  };

  const actions: HintActions = useMemo(() => ({
    buyNextHint,
    getNextAffordableClue,
    handlePurchase,
    autoRevealLetter,
    revealCategory,
    revealExample,
    autoUnlockNextHint,
  }), [buyNextHint, getNextAffordableClue, handlePurchase, autoRevealLetter, revealCategory, revealExample, autoUnlockNextHint]);

  return [state, actions];
}
