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
  hintStage: number;
  nextHintItem: ClueShopItem | null;
}

export interface HintActions {
  buyNextHint: (clueTokens: number, setClueTokens: (fn: (prev: number) => number) => void) => void;
  // Legacy actions kept for compatibility if needed, but buyNextHint is preferred
  autoRevealLetter: () => number;
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
  
  // Stage 0: Reveal Letter, Stage 1: Reveal Category, Stage 2: Example Sentence
  const [hintStage, setHintStage] = useState(0);

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
      // Advance stage since level 1 is essentially done
      setHintStage(1);
      // Show toast notification about the hint
      showToast('valid-word', '💎 Here\'s a hint for this tricky word!');
    }
  }, [isRareWord, targetWord, showToast]);

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
  
  // Determine next hint item based on stage
  const nextHintItem = useMemo(() => {
    // Stage 0: Reveal Letter
    if (hintStage === 0) {
      // Find 'reveal_letter' item
      // We manually construct it if needed or find from array
      return CLUE_SHOP_ITEMS.find(i => i.id === 'reveal_letter') || null;
    }
    // Stage 1: Reveal Category
    if (hintStage === 1) {
       return CLUE_SHOP_ITEMS.find(i => i.id === 'reveal_category') || null;
    }
    // Stage 2: Example Sentence
    if (hintStage === 2) {
       return CLUE_SHOP_ITEMS.find(i => i.id === 'example_sentence') || null;
    }
    
    return null; // No more hints
  }, [hintStage]);

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
         const unrevealed = [...Array(targetWord.length).keys()].filter(i => !revealedLetters.has(i));
        if (unrevealed.length > 0) { // Changed from > 1 to allow last letter if desired? 
          // Logic said > 1 originally to keep 1 hidden. User says "level 1 clues (revealing a letter)".
          // Assume revealing ANY random unrevealed letter is fine. 
          // But original logic enforced keeping 1 hidden. I'll respect that if possible, or relax it.
          // Let's relax it to > 0 for better UX if it's the "Level 1" hint.
          // Actually, keeping 1 hidden prevents auto-solve.
          if (unrevealed.length >= 1) {
             const randomIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
             setRevealedLetters(prev => new Set([...prev, randomIdx]));
             success = true;
          } else {
             // Already fully revealed?
             showToast('invalid-word', 'All letters revealed!');
          }
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
        setHintStage(prev => prev + 1);
        playWordAcceptedSound?.();
        
        // Show clearer feedback that coins were spent
        showToast('valid-word', `${nextHintItem.name} Unlocked! (-${nextHintItem.cost} Coins)`);
    }
    
  }, [nextHintItem, targetWord, revealedLetters, playWordAcceptedSound, showToast, t]);

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
  }, []); // Placeholder comment logic
  
  // ... re-adding autoRevealLetter etc for internal use if needed
  
  const autoRevealLetter = useCallback((): number => {
      const unrevealed = [...Array(targetWord.length).keys()].filter(i => !revealedLetters.has(i));
      if (unrevealed.length > 1) {
        const randomIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
        setRevealedLetters(prev => new Set([...prev, randomIdx]));
        return randomIdx;
      }
      return -1;
    }, [targetWord.length, revealedLetters]);

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

  const actions: HintActions = {
    buyNextHint,
    autoRevealLetter,
    revealCategory,
    revealExample,
  };

  return [state, actions];
}
