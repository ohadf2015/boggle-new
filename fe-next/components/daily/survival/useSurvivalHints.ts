'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { Language } from '@/types';
import { generateProgressiveHints, generateFallbackHints, CLUE_SHOP_ITEMS, type HintLevel, type ClueShopItem } from '@/utils/aiHintGenerator';
import { getWordRarity } from '@/utils/dailyChallenge/wordRarity';
import type { FeedbackType } from '../WordFeedbackToast';

/**
 * Rarity threshold for auto-revealing first letter
 * Words with rarity >= 4 (RARE or LEGENDARY) get a free hint
 */
const RARE_WORD_THRESHOLD = 4;

export interface UseSurvivalHintsProps {
  targetWord: string;
  language: Language;
  playWordAcceptedSound?: () => void;
  showToast: (type: FeedbackType, message: string) => void;
  t: (key: string) => string;
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
}

export interface HintActions {
  handlePurchase: (item: ClueShopItem, clueTokens: number, setClueTokens: (fn: (prev: number) => number) => void, setShowShop: (show: boolean) => void) => void;
  getNextAffordableClue: (clueTokens: number) => ClueShopItem | null;
  autoRevealLetter: () => boolean;
  revealCategory: () => void;
  revealExample: () => void;
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
}: UseSurvivalHintsProps): [HintState, HintActions] {
  const [currentHint, setCurrentHint] = useState<HintLevel | null>(null);
  const [category, setCategory] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');
  const [revealedLetters, setRevealedLetters] = useState<Set<number>>(new Set());
  const [eliminatedLetters, setEliminatedLetters] = useState<Set<string>>(new Set());
  const [showCategory, setShowCategory] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [tokensSpent, setTokensSpent] = useState(0);

  // Generate initial fallback hints synchronously
  const initialHints = useMemo(() => {
    if (!targetWord || targetWord.length < 2) return null;
    return generateFallbackHints(targetWord, language);
  }, [targetWord, language]);

  // Check if target word is rare/legendary (rarity >= 4)
  const targetWordRarity = useMemo(() => {
    if (!targetWord || targetWord.length < 2) return 3;
    return getWordRarity(targetWord, language);
  }, [targetWord, language]);

  const isRareWord = targetWordRarity >= RARE_WORD_THRESHOLD;

  // Set initial hints on mount
  useEffect(() => {
    if (initialHints && initialHints.hints.length > 0 && !currentHint) {
      setCurrentHint(initialHints.hints[0]);
      setCategory(initialHints.category);
      setExampleSentence(initialHints.exampleSentence);
    }
  }, [initialHints, currentHint]);

  // Track if we've already shown the rare word hint
  const hasShownRareWordHint = useRef(false);

  // Auto-reveal first letter for rare/legendary words
  useEffect(() => {
    if (isRareWord && targetWord.length > 0 && !hasShownRareWordHint.current) {
      hasShownRareWordHint.current = true;
      // Reveal first letter as a free hint for tricky words
      setRevealedLetters(new Set([0]));
      // Show toast notification about the hint
      showToast('valid-word', '💎 Here\'s a hint for this tricky word!');
    }
  }, [isRareWord, targetWord, showToast]);

  // Load AI-enhanced hints asynchronously
  useEffect(() => {
    if (!targetWord || targetWord.length < 2) return;

    async function loadHints() {
      const hints = await generateProgressiveHints(targetWord, language);
      setCategory(hints.category);
      setExampleSentence(hints.exampleSentence);
      if (hints.hints.length > 0) {
        setCurrentHint(hints.hints[0]);
      }
    }
    loadHints();
  }, [targetWord, language]);

  // Handle clue shop purchases
  const handlePurchase = useCallback((
    item: ClueShopItem,
    clueTokens: number,
    setClueTokens: (fn: (prev: number) => number) => void,
    setShowShop: (show: boolean) => void
  ) => {
    if (clueTokens < item.cost) {
      showToast('invalid-word', t('wordHunt.survival.notEnoughTokens') || 'Not enough tokens!');
      return;
    }

    setClueTokens(prev => prev - item.cost);
    setTokensSpent(prev => prev + item.cost);
    setShowShop(false);

    switch (item.id) {
      case 'reveal_letter': {
        const unrevealed = [...Array(targetWord.length).keys()].filter(i => !revealedLetters.has(i));
        if (unrevealed.length > 1) {
          const randomIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
          setRevealedLetters(prev => new Set([...prev, randomIdx]));
        } else {
          setClueTokens(prev => prev + item.cost);
          setTokensSpent(prev => prev - item.cost);
          showToast('invalid-word', t('wordHunt.survival.cannotRevealMore') || 'Cannot reveal more letters');
        }
        break;
      }
      case 'eliminate_letters': {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const targetLetters = new Set(targetWord.toUpperCase().split(''));
        const wrongLetters = alphabet.split('').filter(l => !targetLetters.has(l) && !eliminatedLetters.has(l));
        const toEliminate = wrongLetters.slice(0, 3);
        setEliminatedLetters(prev => new Set([...prev, ...toEliminate]));
        break;
      }
      case 'example_sentence':
        setShowExample(true);
        break;
      case 'reveal_category':
        setShowCategory(true);
        break;
    }

    playWordAcceptedSound?.();
  }, [targetWord, revealedLetters, eliminatedLetters, playWordAcceptedSound, showToast, t]);

  // Get next affordable clue based on priority: reveal_letter > reveal_category > example_sentence
  const getNextAffordableClue = useCallback((clueTokens: number): ClueShopItem | null => {
    // Priority order: reveal letters first (most useful), then category, then example
    const priorityOrder = ['reveal_letter', 'reveal_category', 'example_sentence'];

    for (const itemId of priorityOrder) {
      const item = CLUE_SHOP_ITEMS.find(i => i.id === itemId);
      if (!item || clueTokens < item.cost) continue;

      // Check if this clue type is still available
      switch (itemId) {
        case 'reveal_letter': {
          // Can reveal if there are at least 2 unrevealed letters
          const unrevealed = [...Array(targetWord.length).keys()].filter(i => !revealedLetters.has(i));
          if (unrevealed.length > 1) return item;
          break;
        }
        case 'reveal_category':
          if (!showCategory) return item;
          break;
        case 'example_sentence':
          if (!showExample) return item;
          break;
      }
    }
    return null;
  }, [targetWord.length, revealedLetters, showCategory, showExample]);

  // Auto-reveal a single letter (for auto-spend system)
  const autoRevealLetter = useCallback((): boolean => {
    const unrevealed = [...Array(targetWord.length).keys()].filter(i => !revealedLetters.has(i));
    if (unrevealed.length > 1) {
      const randomIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      setRevealedLetters(prev => new Set([...prev, randomIdx]));
      return true;
    }
    return false;
  }, [targetWord.length, revealedLetters]);

  // Reveal category (for auto-spend system)
  const revealCategory = useCallback(() => {
    setShowCategory(true);
  }, []);

  // Reveal example sentence (for auto-spend system)
  const revealExample = useCallback(() => {
    setShowExample(true);
  }, []);

  const state: HintState = {
    currentHint,
    category,
    exampleSentence,
    revealedLetters,
    eliminatedLetters,
    showCategory,
    showExample,
    tokensSpent,
  };

  const actions: HintActions = {
    handlePurchase,
    getNextAffordableClue,
    autoRevealLetter,
    revealCategory,
    revealExample,
  };

  return [state, actions];
}
