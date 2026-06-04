import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { HighlightedCell } from '@/components/GridComponent';
import { isWordOnBoard } from '@/utils/utils';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { LetterGrid, Language } from '@/types';
import { calculateWordScore } from '@/shared/utils/scoring';

// Level configurations
export const LEVEL_CONFIGS = [
  { level: 1, wordCount: 2, studyTime: 5000, lives: 3, targetScore: 50 },
  { level: 2, wordCount: 3, studyTime: 4500, lives: 3, targetScore: 100 },
  { level: 3, wordCount: 4, studyTime: 4000, lives: 2, targetScore: 200 },
  { level: 4, wordCount: 5, studyTime: 3500, lives: 2, targetScore: 350 },
  { level: 5, wordCount: 7, studyTime: 3000, lives: 1, targetScore: 500 },
];

export interface MemoryWord {
  word: string;
  path: HighlightedCell[];
  found: boolean;
}

export type GamePhase = 'ready' | 'study' | 'recall' | 'feedback' | 'complete';

interface UseMemoryHuntGameProps {
  grid: LetterGrid;
  availableWords: { word: string; path: { row: number; col: number }[] }[];
  level: number;
  language: Language;
  onComplete: (result: {
    score: number;
    wordsFound: number;
    totalWords: number;
    timeSpent: number;
    level: number;
  }) => void;
}

export function useMemoryHuntGame({
  grid,
  availableWords,
  level,
  language,
  onComplete,
}: UseMemoryHuntGameProps) {
  const { playErrorSound } = useSoundEffects();

  // Get level config
  const levelConfig = LEVEL_CONFIGS[Math.min(level - 1, LEVEL_CONFIGS.length - 1)];

  // Game state
  const [phase, setPhase] = useState<GamePhase>('ready');
  const [targetWords, setTargetWords] = useState<MemoryWord[]>([]);
  const [lives, setLives] = useState(levelConfig.lives);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [studyCountdown, setStudyCountdown] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<'correct' | 'wrong' | 'free' | null>(null);
  const [currentHighlight, setCurrentHighlight] = useState<HighlightedCell[]>([]);
  const [excludedWords, setExcludedWords] = useState<Set<string>>(new Set());
  const [showStudyModal, setShowStudyModal] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState(2);
  const [isHintActive, setIsHintActive] = useState(false);
  // Forgiveness: each round grants one free warm-up miss before lives drop.
  const [firstMissUsedThisRound, setFirstMissUsedThisRound] = useState(false);

  // Ref to track study countdown interval for cleanup
  const studyIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Select random words for this round (excluding marked invalid words)
  const selectTargetWords = useCallback((currentExcluded: Set<string> = excludedWords) => {
    const filtered = availableWords.filter(w => !currentExcluded.has(w.word.toUpperCase()));
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, levelConfig.wordCount);

    return selected.map(w => ({
      word: w.word.toUpperCase(),
      path: w.path.map(p => ({ row: p.row, col: p.col })),
      found: false,
    }));
  }, [availableWords, levelConfig.wordCount, excludedWords]);

  // Replace a word marked as invalid during study phase
  const replaceInvalidWord = useCallback((wordToReplace: string) => {
    const upperWord = wordToReplace.toUpperCase();

    const newExcluded = new Set(excludedWords);
    newExcluded.add(upperWord);
    setExcludedWords(newExcluded);

    const currentWordSet = new Set(targetWords.map(tw => tw.word));
    const availableReplacements = availableWords.filter(w =>
      !newExcluded.has(w.word.toUpperCase()) &&
      !currentWordSet.has(w.word.toUpperCase())
    );

    if (availableReplacements.length > 0) {
      const replacement = availableReplacements[Math.floor(Math.random() * availableReplacements.length)];
      const newWord: MemoryWord = {
        word: replacement.word.toUpperCase(),
        path: replacement.path.map(p => ({ row: p.row, col: p.col })),
        found: false,
      };

      setTargetWords(prev => prev.map(tw =>
        tw.word === upperWord ? newWord : tw
      ));

      setCurrentHighlight(prev => {
        const oldWordPaths = targetWords.find(tw => tw.word === upperWord)?.path || [];
        const filtered = prev.filter(cell =>
          !oldWordPaths.some(p => p.row === cell.row && p.col === cell.col)
        );
        return [...filtered, ...newWord.path];
      });
    }
  }, [availableWords, targetWords, excludedWords]);

  // Initialize round
  const startRound = useCallback(() => {
    if (studyIntervalRef.current) {
      clearInterval(studyIntervalRef.current);
      studyIntervalRef.current = null;
    }

    const words = selectTargetWords();
    setTargetWords(words);
    setFirstMissUsedThisRound(false); // fresh free miss each round
    setPhase('study');
    setShowStudyModal(true);
    setStudyCountdown(levelConfig.studyTime / 1000);

    const allPaths = words.flatMap(w => w.path);
    setCurrentHighlight(allPaths);

    studyIntervalRef.current = setInterval(() => {
      setStudyCountdown(prev => {
        if (prev <= 1) {
          if (studyIntervalRef.current) {
            clearInterval(studyIntervalRef.current);
            studyIntervalRef.current = null;
          }
          setShowStudyModal(false);
          setPhase('recall');
          setCurrentHighlight([]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [selectTargetWords, levelConfig.studyTime]);

  // Skip study phase early
  const skipStudyPhase = useCallback(() => {
    if (studyIntervalRef.current) {
      clearInterval(studyIntervalRef.current);
      studyIntervalRef.current = null;
    }
    setShowStudyModal(false);
    setPhase('recall');
    setCurrentHighlight([]);
    setStudyCountdown(0);
  }, []);

  // Finish game early
  const finishGame = useCallback(() => {
    if (studyIntervalRef.current) {
      clearInterval(studyIntervalRef.current);
      studyIntervalRef.current = null;
    }
    setEndTime(Date.now());
    setPhase('complete');
  }, []);

  // Cleanup study interval on unmount
  useEffect(() => {
    return () => {
      if (studyIntervalRef.current) {
        clearInterval(studyIntervalRef.current);
      }
    };
  }, []);

  // Start game
  const startGame = useCallback(() => {
    setLives(levelConfig.lives);
    setScore(0);
    setRound(1);
    setHintsRemaining(2);
    setStartTime(Date.now());
    startRound();
  }, [levelConfig.lives, startRound]);

  // Use hint to briefly reveal one unfound word
  const useHint = useCallback(() => {
    if (hintsRemaining <= 0 || phase !== 'recall' || isHintActive) return;

    const unfoundWord = targetWords.find(tw => !tw.found);
    if (!unfoundWord) return;

    setIsHintActive(true);
    setCurrentHighlight(unfoundWord.path);
    setHintsRemaining(prev => prev - 1);

    setTimeout(() => {
      setCurrentHighlight([]);
      setIsHintActive(false);
    }, 1500);
  }, [hintsRemaining, phase, targetWords, isHintActive]);

  // Handle word submission
  const handleWordSubmit = useCallback((word: string) => {
    if (phase !== 'recall') return;

    const upperWord = word.toUpperCase();

    if (!isWordOnBoard(upperWord, grid, language)) {
      setLastFeedback('wrong');
      setPhase('feedback');
      playErrorSound?.();
      setTimeout(() => {
        setLastFeedback(null);
        setPhase('recall');
      }, 800);
      return;
    }

    const targetIndex = targetWords.findIndex(
      tw => tw.word === upperWord && !tw.found
    );

    if (targetIndex >= 0) {
      const updatedTargets = [...targetWords];
      updatedTargets[targetIndex].found = true;
      setTargetWords(updatedTargets);

      const wordPoints = calculateWordScore(word) * round;
      setScore(prev => prev + wordPoints);

      setLastFeedback('correct');
      setPhase('feedback');

      setTimeout(() => {
        setLastFeedback(null);

        const allFound = updatedTargets.every(tw => tw.found);
        if (allFound) {
          setScore(prev => prev + 50 * round);

          if (round < 5) {
            setRound(prev => prev + 1);
            startRound();
          } else {
            setEndTime(Date.now());
            setPhase('complete');
          }
        } else {
          setPhase('recall');
        }
      }, 800);
    } else {
      // First miss of the round is a free warm-up — no life lost, warm tone.
      if (!firstMissUsedThisRound) {
        setFirstMissUsedThisRound(true);
        setLastFeedback('free');
        setPhase('feedback');
        setTimeout(() => {
          setLastFeedback(null);
          setPhase('recall');
        }, 800);
        return;
      }

      setLives(prev => {
        const newLives = prev - 1;
        setTimeout(() => {
          setLastFeedback(null);
          if (newLives <= 0) {
            setEndTime(Date.now());
            setPhase('complete');
          } else {
            setPhase('recall');
          }
        }, 800);
        return newLives;
      });
      setLastFeedback('wrong');
      setPhase('feedback');
      playErrorSound?.();
    }
  }, [phase, targetWords, round, startRound, grid, language, playErrorSound, firstMissUsedThisRound]);

  // Calculate final results
  const results = useMemo(() => {
    const wordsFound = targetWords.filter(tw => tw.found).length;
    const totalWords = targetWords.length;
    const timeSpent = startTime && endTime ? Math.floor((endTime - startTime) / 1000) : 0;

    return {
      score,
      wordsFound,
      totalWords,
      timeSpent,
      level,
    };
  }, [targetWords, score, startTime, endTime, level]);

  // Handle completion (idempotent: ref guard prevents reward loop when parent
  // recreates `onComplete` after coin-state updates).
  const completionFiredRef = useRef(false);
  useEffect(() => {
    if (phase !== 'complete' || completionFiredRef.current) return;
    completionFiredRef.current = true;
    onComplete(results);
  }, [phase, results, onComplete]);

  // Remaining unfound words for UI
  const remainingWords = targetWords.filter(tw => !tw.found);

  // Reset handler for play again
  const resetGame = useCallback(() => {
    setPhase('ready');
    setTargetWords([]);
    setEndTime(null);
  }, []);

  return {
    phase,
    targetWords,
    lives,
    score,
    round,
    studyCountdown,
    lastFeedback,
    currentHighlight,
    showStudyModal,
    hintsRemaining,
    isHintActive,
    levelConfig,
    results,
    remainingWords,
    startGame,
    skipStudyPhase,
    finishGame,
    useHint,
    handleWordSubmit,
    replaceInvalidWord,
    resetGame,
  };
}
