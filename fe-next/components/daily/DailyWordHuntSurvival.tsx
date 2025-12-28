'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaHeart, FaCoins, FaLightbulb } from 'react-icons/fa';
import { Trophy, Zap, ShoppingBag } from 'lucide-react';
import GridComponent from '@/components/GridComponent';
import { HelpPanel, HelpButton } from '@/components/game/HelpPanel';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { cn } from '@/lib/utils';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import type { LetterGrid, Language } from '@/types';
import {
  getLetterFeedback,
  isTargetWordFound,
  type LetterFeedback,
} from '@/utils/wordHuntFeedback';
import {
  generateProgressiveHints,
  getNextHint,
  calculateLifeReward,
  calculateTokenReward,
  calculateEfficiencyScore,
  CLUE_SHOP_ITEMS,
  type HintLevel,
  type ClueShopItem,
} from '@/utils/aiHintGenerator';
import { isWordOnBoard } from '@/utils/clientWordValidator';
import { WordFeedbackToast, type FeedbackType } from './WordFeedbackToast';
import { LifeGainAnimation } from './LifeGainAnimation';

const MAX_ATTEMPTS = 10;
const INITIAL_LIFE = 100;
const LIFE_DRAIN_RATE = 2; // points per second

interface DailyWordHuntSurvivalProps {
  grid: LetterGrid;
  puzzleNumber: number;
  language: Language;
  targetWord: string;
  onComplete: (result: SurvivalGameResult) => void;
  onQuit: () => void;
}

export interface WordDiscovery {
  word: string;
  timestamp: number;
  lifeGained: number;
  tokensGained: number;
}

export interface TargetAttempt {
  word: string;
  feedback: LetterFeedback[];
  timestamp: number;
}

export interface SurvivalGameResult {
  solved: boolean;
  attemptsUsed: number;
  targetWord: string;
  attempts: TargetAttempt[];
  wordsDiscovered: WordDiscovery[];
  lifeRemaining: number;
  clueTokensEarned: number;
  clueTokensSpent: number;
  hintsUnlocked: number;
  efficiencyScore: number;
}

/**
 * DailyWordHuntSurvival - Word Hunt with bleeding points, word discovery, and AI hints
 */
const DailyWordHuntSurvival: React.FC<DailyWordHuntSurvivalProps> = ({
  grid,
  puzzleNumber,
  language,
  targetWord,
  onComplete,
  onQuit,
}) => {
  const { t } = useLanguage();
  const { playWordAcceptedSound } = useSoundEffects();
  const isLandscape = useMobileLandscape();

  // Survival state
  const [lifePoints, setLifePoints] = useState(INITIAL_LIFE);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);

  // Word discovery state
  const [discoveredWords, setDiscoveredWords] = useState<WordDiscovery[]>([]);
  const [clueTokens, setClueTokens] = useState(0);

  // Target word attempts
  const [attempts, setAttempts] = useState<TargetAttempt[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<string>('');

  // Toast feedback system
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  // Life gain animation
  const [lifeGainAmount, setLifeGainAmount] = useState<number | null>(null);

  // Hint system
  const [availableHints, setAvailableHints] = useState<HintLevel[]>([]);
  const [currentHint, setCurrentHint] = useState<HintLevel | null>(null);
  const [category, setCategory] = useState<string>('');
  const [exampleSentence, setExampleSentence] = useState<string>('');
  const [revealedLetters, setRevealedLetters] = useState<Set<number>>(new Set());
  const [eliminatedLetters, setEliminatedLetters] = useState<Set<string>>(new Set());
  const [showCategory, setShowCategory] = useState(false);
  const [showExample, setShowExample] = useState(false);

  // UI state
  const [formedWord, setFormedWord] = useState('');
  const [letterCount, setLetterCount] = useState(0);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [tokensSpent, setTokensSpent] = useState(0);

  // Refs for life drain
  const lifeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gameOverRef = useRef(false);

  // Load AI hints on mount
  useEffect(() => {
    async function loadHints() {
      const hints = await generateProgressiveHints(targetWord, language);
      setAvailableHints(hints.hints);
      setCategory(hints.category);
      setExampleSentence(hints.exampleSentence);

      // Show first hint immediately
      if (hints.hints.length > 0) {
        setCurrentHint(hints.hints[0]);
      }
    }
    loadHints();
  }, [targetWord, language]);

  // Start life drain
  useEffect(() => {
    if (isGameOver) {
      if (lifeIntervalRef.current) {
        clearInterval(lifeIntervalRef.current);
      }
      return;
    }

    lifeIntervalRef.current = setInterval(() => {
      setLifePoints(prev => {
        const newLife = Math.max(0, prev - LIFE_DRAIN_RATE);
        if (newLife === 0 && !gameOverRef.current) {
          handleGameOver(false); // Died
        }
        return newLife;
      });
    }, 1000);

    return () => {
      if (lifeIntervalRef.current) {
        clearInterval(lifeIntervalRef.current);
      }
    };
  }, [isGameOver]);

  // Update hints when words discovered
  useEffect(() => {
    const nextHint = getNextHint(availableHints, discoveredWords.length);
    if (nextHint && (!currentHint || nextHint.level > currentHint.level)) {
      setCurrentHint(nextHint);
    }
  }, [discoveredWords.length, availableHints, currentHint]);

  // Show toast feedback
  const showToast = useCallback((type: FeedbackType, message: string) => {
    setFeedbackType(type);
    setFeedbackMessage(message);
  }, []);

  // Close toast
  const closeToast = useCallback(() => {
    setFeedbackType(null);
    setFeedbackMessage('');
  }, []);

  // Handle word change from grid
  const handleWordChange = useCallback((word: string, count: number) => {
    setFormedWord(word);
    setLetterCount(count);
    setCurrentFeedback('');
    closeToast();
  }, [closeToast]);

  // Handle word submission (could be target attempt OR grid word discovery)
  const handleWordSubmit = useCallback((word: string) => {
    if (isGameOver) return;

    const normalizedWord = word.toUpperCase();
    const normalizedTarget = targetWord.toUpperCase();

    // Check if attempting target word
    if (normalizedWord.length === normalizedTarget.length) {
      handleTargetAttempt(normalizedWord, normalizedTarget);
    } else {
      // It's a grid word discovery
      handleWordDiscovery(normalizedWord);
    }
  }, [isGameOver, targetWord, discoveredWords, attempts]);

  // Handle target word attempt
  const handleTargetAttempt = useCallback((word: string, target: string) => {
    // Check if already attempted
    if (attempts.some(a => a.word === word)) {
      setCurrentFeedback(t('wordHunt.alreadyGuessed'));
      return;
    }

    // Get feedback
    const feedback = getLetterFeedback(word, target);
    const newAttempt: TargetAttempt = {
      word,
      feedback,
      timestamp: Date.now(),
    };

    const newAttempts = [...attempts, newAttempt];
    setAttempts(newAttempts);
    playWordAcceptedSound?.();

    // Check if correct
    const won = isTargetWordFound(feedback);
    if (won) {
      handleGameOver(true, newAttempts); // Victory - pass the updated attempts array
      return;
    }

    // Check if out of attempts
    if (newAttempts.length >= MAX_ATTEMPTS) {
      handleGameOver(false, newAttempts); // Failed - pass the updated attempts array
      return;
    }

    setCurrentFeedback(t('wordHunt.keepGoing'));
  }, [attempts, playWordAcceptedSound, t]);

  // Handle grid word discovery
  const handleWordDiscovery = useCallback((word: string) => {
    // Check minimum length (3+ letters)
    if (word.length < 3) {
      showToast('too-short', t('wordHunt.feedback.tooShort') || '📏 Minimum 3 letters');
      return;
    }

    // Check if already discovered
    if (discoveredWords.some(w => w.word === word)) {
      showToast('duplicate', t('wordHunt.feedback.duplicate') || '🔁 Already found!');
      return;
    }

    // Check if word is actually on the board
    if (!isWordOnBoard(word, grid, language)) {
      showToast('not-on-board', t('wordHunt.feedback.notOnBoard') || '⚠️ Can\'t form this on the board');
      return;
    }

    // Calculate rewards
    const lifeGained = calculateLifeReward(word.length);
    const tokensGained = calculateTokenReward(word.length);

    // Add to discovered words
    const discovery: WordDiscovery = {
      word,
      lifeGained,
      tokensGained,
      timestamp: Date.now(),
    };

    setDiscoveredWords(prev => [...prev, discovery]);
    setLifePoints(prev => Math.min(INITIAL_LIFE, prev + lifeGained));
    setClueTokens(prev => prev + tokensGained);
    playWordAcceptedSound?.();

    // Trigger life gain animation
    setLifeGainAmount(lifeGained);

    // Show success feedback
    showToast('valid-word', `+${lifeGained} ❤️ ${tokensGained > 0 ? `+${tokensGained} 🪙` : ''}`);
    setCurrentFeedback(`+${lifeGained} ❤️ ${tokensGained > 0 ? `+${tokensGained} 🪙` : ''}`);
  }, [discoveredWords, grid, language, playWordAcceptedSound, showToast, t]);

  // Handle game over
  const handleGameOver = useCallback((won: boolean, finalAttempts?: TargetAttempt[]) => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setIsGameOver(true);
    setHasWon(won);

    if (lifeIntervalRef.current) {
      clearInterval(lifeIntervalRef.current);
    }

    // Use provided finalAttempts or fall back to state (for life drain game over)
    const attemptsToUse = finalAttempts || attempts;

    const result: SurvivalGameResult = {
      solved: won,
      attemptsUsed: attemptsToUse.length,
      targetWord,
      attempts: attemptsToUse,
      wordsDiscovered: discoveredWords,
      lifeRemaining: lifePoints,
      clueTokensEarned: clueTokens + tokensSpent,
      clueTokensSpent: tokensSpent,
      hintsUnlocked: currentHint?.level || 0,
      efficiencyScore: calculateEfficiencyScore(
        lifePoints,
        clueTokens,
        attemptsToUse.length,
        discoveredWords.length,
        won
      ),
    };

    onComplete(result);
  }, [attempts, discoveredWords, lifePoints, clueTokens, tokensSpent, currentHint, targetWord, onComplete]);

  // Handle clue shop purchases
  const handlePurchase = useCallback((item: ClueShopItem) => {
    if (clueTokens < item.cost) {
      setCurrentFeedback('Not enough tokens!');
      return;
    }

    setClueTokens(prev => prev - item.cost);
    setTokensSpent(prev => prev + item.cost);
    setShowShop(false);

    switch (item.id) {
      case 'reveal_letter': {
        // Reveal a random unrevealed letter, but never reveal ALL letters (keep at least 1 hidden)
        const unrevealed = [...Array(targetWord.length).keys()].filter(i => !revealedLetters.has(i));
        // Only reveal if we have at least 2 unrevealed letters (to keep 1 always hidden)
        if (unrevealed.length > 1) {
          const randomIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
          setRevealedLetters(prev => new Set([...prev, randomIdx]));
        } else {
          // Cannot reveal more - show feedback
          setCurrentFeedback('Cannot reveal more! At least one letter must remain hidden.');
        }
        break;
      }
      case 'eliminate_letters': {
        // Eliminate 3 random wrong letters
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
  }, [clueTokens, targetWord, revealedLetters, eliminatedLetters, playWordAcceptedSound]);

  // Render target word with revealed letters
  const renderTargetWord = () => {
    return targetWord.split('').map((letter, idx) => (
      <div
        key={idx}
        className="w-10 h-10 flex items-center justify-center border-2 border-neo-black rounded bg-white dark:bg-gray-800 font-bold text-lg"
      >
        {revealedLetters.has(idx) ? letter.toUpperCase() : '_'}
      </div>
    ));
  };

  // Life bar color based on remaining life
  const getLifeColor = () => {
    if (lifePoints > 66) return 'bg-green-500';
    if (lifePoints > 33) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "flex-1 flex flex-col p-2 sm:p-4 overflow-hidden",
        isLandscape && "flex-row"
      )}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-2 px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onQuit}
          className="text-gray-600 hover:text-red-500"
        >
          <FaTimes className="w-4 h-4 mr-1" />
          {t('common.quit') || 'Quit'}
        </Button>
        <span className="px-2 py-0.5 bg-neo-purple/20 text-neo-black dark:text-neo-purple text-xs font-bold rounded-full">
          🎯 #{puzzleNumber}
        </span>
      </div>

      {/* Life bar + Clue tokens */}
      <div className="flex items-center gap-3 mb-2">
        {/* Life bar */}
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden border-2 border-neo-black relative">
          <motion.div
            className={cn("h-full flex items-center justify-center text-xs font-bold text-white transition-all", getLifeColor())}
            style={{ width: `${lifePoints}%` }}
            animate={{ width: `${lifePoints}%` }}
          >
            <FaHeart className="w-3 h-3 mr-1" />
            {lifePoints}/100
          </motion.div>

          {/* Life gain animation */}
          <LifeGainAnimation
            amount={lifeGainAmount}
            onComplete={() => setLifeGainAmount(null)}
          />
        </div>

        {/* Clue tokens */}
        <div className="flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 border-2 border-neo-black rounded-neo">
          <FaCoins className="w-4 h-4 text-yellow-600" />
          <span className="font-bold text-sm">{clueTokens}</span>
        </div>

        {/* Shop button - more prominent with animation when tokens available */}
        <Button
          size="sm"
          onClick={() => setShowShop(!showShop)}
          className={cn(
            "bg-neo-purple text-white relative",
            clueTokens > 0 && "animate-pulse"
          )}
        >
          <ShoppingBag className="w-4 h-4" />
          {clueTokens > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-neo-yellow text-neo-black text-xs font-bold rounded-full flex items-center justify-center">
              !
            </span>
          )}
        </Button>
      </div>

      {/* Current hint */}
      {currentHint && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 rounded-neo p-3 mb-2"
        >
          <div className="flex items-start gap-2">
            <FaLightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-1">
                Hint {currentHint.level}/5 {currentHint.unlockCost === 0 ? '(Free)' : `(Unlocked at ${currentHint.unlockCost} words)`}
              </div>
              <div className="text-sm">{currentHint.hint}</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Next hint progress */}
      {(() => {
        const nextHint = availableHints.find(h => h.unlockCost > discoveredWords.length);
        if (nextHint) {
          const wordsNeeded = nextHint.unlockCost - discoveredWords.length;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-xs text-gray-600 dark:text-gray-400 mb-2"
            >
              💡 Next hint unlocks in {wordsNeeded} {wordsNeeded === 1 ? 'word' : 'words'}
            </motion.div>
          );
        }
        return null;
      })()}

      {/* Category and example (if unlocked) */}
      {showCategory && (
        <div className="text-xs bg-purple-50 dark:bg-purple-900/20 border border-purple-300 rounded p-2 mb-2">
          <span className="font-bold">Category:</span> {category}
        </div>
      )}
      {showExample && (
        <div className="text-xs bg-green-50 dark:bg-green-900/20 border border-green-300 rounded p-2 mb-2">
          <span className="font-bold">Example:</span> {exampleSentence.replace(targetWord, '____')}
        </div>
      )}

      {/* Target word display */}
      <div className="flex justify-center gap-1 mb-2">
        {renderTargetWord()}
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-2">
        <span>Words: {discoveredWords.length}</span>
        <span>Attempts: {attempts.length}/{MAX_ATTEMPTS}</span>
      </div>

      {/* Feedback */}
      <AnimatePresence mode="wait">
        {currentFeedback && (
          <motion.div
            key={currentFeedback}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center mb-2 text-sm font-medium"
          >
            {currentFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Grid */}
      <div className="flex-1 flex items-center justify-center">
        <GridComponent
          grid={grid}
          interactive={!isGameOver}
          onWordSubmit={handleWordSubmit}
          onWordChange={handleWordChange}
          hideWordPreview
          hideComboIndicator
          comboLevel={0}
        />
      </div>

      {/* Clue Shop Modal */}
      <AnimatePresence>
        {showShop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowShop(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-neo-navy rounded-neo border-4 border-neo-black p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-black mb-4">Clue Shop</h3>
              <div className="space-y-2">
                {CLUE_SHOP_ITEMS.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handlePurchase(item)}
                    disabled={clueTokens < item.cost}
                    className={cn(
                      "w-full p-3 rounded-neo border-2 border-neo-black text-left transition-all",
                      clueTokens >= item.cost
                        ? "bg-neo-yellow hover:shadow-hard cursor-pointer"
                        : "bg-gray-200 opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{item.icon}</span>
                          <span className="font-bold">{item.name}</span>
                        </div>
                        <div className="text-xs text-gray-600">{item.description}</div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <FaCoins className="w-4 h-4 text-yellow-600" />
                        <span className="font-bold">{item.cost}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <Button onClick={() => setShowShop(false)} className="w-full mt-4">
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Button */}
      <HelpButton
        onClick={() => setIsHelpOpen(true)}
        className="fixed bottom-0 right-0 z-40 mb-[max(env(safe-area-inset-bottom),8px)] mr-2 w-10 h-10"
      />

      {/* Help Panel */}
      <HelpPanel isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Word Feedback Toast */}
      <WordFeedbackToast
        type={feedbackType}
        message={feedbackMessage}
        onClose={closeToast}
      />
    </motion.div>
  );
};

export default DailyWordHuntSurvival;
