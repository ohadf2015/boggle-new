'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Language } from '@/types';
import { generateProgressiveHints, generateFallbackHints, type HintLevel, type ClueShopItem } from '@/utils/aiHintGenerator';
import type { FeedbackType } from '../WordFeedbackToast';

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

  // Set initial hints on mount
  useEffect(() => {
    if (initialHints && initialHints.hints.length > 0 && !currentHint) {
      setCurrentHint(initialHints.hints[0]);
      setCategory(initialHints.category);
      setExampleSentence(initialHints.exampleSentence);
    }
  }, [initialHints, currentHint]);

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
  };

  return [state, actions];
}
