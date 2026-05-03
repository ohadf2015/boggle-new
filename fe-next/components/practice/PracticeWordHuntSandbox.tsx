'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics';
import { Mascot } from '@/components/ui/Mascot';
import GridComponent from '@/components/GridComponent';
import WordFormingArea from '@/components/game/WordFormingArea';
import { useWordSubmission } from '@/hooks/useWordSubmission';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import { generateRandomTable } from '@/utils/utils';
import { pickRichestBoardClient } from '@/lib/boardSelection';
import { fireOnboardingBurst, fireVictoryConfetti } from '@/utils/confettiUtils';
import { getLetterFeedback, type LetterFeedback } from '@/utils/wordHuntFeedback';
import { markPracticeMode } from '@/lib/practice/practiceProgress';
import { applyHebrewFinalLetters, normalizeWord } from '@/shared/utils/wordNormalization';
import PracticeCompleteCard from './PracticeCompleteCard';
import { cn } from '@/lib/utils';
import type { LetterGrid, Language } from '@/types';

const ROWS = 4;
const COLS = 4;
const TARGET_LENGTHS = [4, 5];
const MAX_TRIES = 8;
const MAX_BOARD_TRIES = 5;

interface BoardPick {
  grid: LetterGrid;
  target: string;
}

/** DFS the board for valid words of the desired length, using checkWord. */
function findCandidateWords(
  grid: LetterGrid,
  language: Language,
  checkWord: (w: string) => boolean,
  minLen: number,
  maxLen: number,
  cap: number,
): string[] {
  const found = new Set<string>();
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const dirs: [number, number][] = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  function dfs(r: number, c: number, word: string, visited: Set<string>) {
    if (found.size >= cap) return;
    if (word.length >= minLen) {
      const normalized = normalizeWord(word, language).toLowerCase();
      if (checkWord(normalized)) {
        found.add(word.toUpperCase());
      }
    }
    if (word.length >= maxLen) return;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const k = `${nr},${nc}`;
      if (visited.has(k)) continue;
      visited.add(k);
      dfs(nr, nc, word + grid[nr][nc], visited);
      visited.delete(k);
    }
  }

  outer: for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const visited = new Set<string>([`${r},${c}`]);
      dfs(r, c, grid[r][c], visited);
      if (found.size >= cap) break outer;
    }
  }

  return Array.from(found);
}

/**
 * Word Hunt practice — mirrors the real game's hidden-target hunt with
 * Wordle-style colour feedback. Picks a target by enumerating valid
 * words on the board, then asks the player to discover that exact word.
 * Wrong-length valid words are still rewarded as bonus discoveries.
 */
export default function PracticeWordHuntSandbox() {
  const { language, t } = useLanguage();
  const { playWordAcceptedSound, playWordRejectedSound, setGameActive } = useSoundEffects();
  const { checkWord, isLoaded } = useDictionaryCache(language);

  useEffect(() => {
    setGameActive(true);
    return () => setGameActive(false);
  }, [setGameActive]);

  const [boardPick, setBoardPick] = useState<BoardPick | null>(null);
  const [reveals, setReveals] = useState<Map<number, string>>(new Map());
  const [yellowLetters, setYellowLetters] = useState<Set<string>>(new Set());
  const [latestFeedback, setLatestFeedback] = useState<LetterFeedback[] | null>(null);
  const [overlayUntil, setOverlayUntil] = useState<number>(0);
  const [tries, setTries] = useState(0);
  const [solved, setSolved] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [formingWord, setFormingWord] = useState('');
  const [letterCount, setLetterCount] = useState(0);
  const [pop, setPop] = useState<{ id: number; word: string; label: string } | null>(null);
  const popIdRef = useRef(0);
  const celebratedRef = useRef(false);

  const pickBoard = useCallback((): BoardPick | null => {
    for (let i = 0; i < MAX_BOARD_TRIES; i++) {
      const grid = pickRichestBoardClient(
        () => generateRandomTable(ROWS, COLS, language, []),
        language,
      );
      const candidates = findCandidateWords(
        grid,
        language,
        checkWord,
        TARGET_LENGTHS[0],
        TARGET_LENGTHS[TARGET_LENGTHS.length - 1],
        24,
      );
      // Prefer mid-length targets — too short feels trivial, too long is brutal.
      const sorted = [...candidates].sort((a, b) => {
        const ad = Math.abs(a.length - 4);
        const bd = Math.abs(b.length - 4);
        return ad - bd;
      });
      if (sorted.length > 0) {
        const target = sorted[Math.floor(Math.random() * Math.min(sorted.length, 5))];
        return { grid, target };
      }
    }
    return null;
  }, [language, checkWord]);

  // First pick: wait for dictionary, then generate. Tracks attempts so we
  // don't infinite-loop when the dictionary is empty (e.g. test mocks).
  const hasPickedRef = useRef(false);
  useEffect(() => {
    if (!isLoaded) return;
    if (boardPick) return;
    if (hasPickedRef.current) return;
    hasPickedRef.current = true;
    const picked = pickBoard();
    if (picked) setBoardPick(picked);
  }, [isLoaded, boardPick, pickBoard]);

  const target = boardPick?.target ?? '';
  const targetLength = target.length || 4;

  const resetForNewBoard = useCallback(() => {
    const picked = pickBoard();
    if (picked) setBoardPick(picked);
    setReveals(new Map());
    setYellowLetters(new Set());
    setLatestFeedback(null);
    setOverlayUntil(0);
    setTries(0);
    setSolved(false);
    setRevealed(false);
    setFormingWord('');
    setLetterCount(0);
    celebratedRef.current = false;
  }, [pickBoard]);

  const handleAccepted = useCallback(
    (word: string) => {
      const upper = word.toUpperCase();
      playWordAcceptedSound();
      haptics.success();

      // Always celebrate finding a valid word — bonus discovery if not target length
      const labels = [
        t('practiceSwipe.celebrate1'),
        t('practiceSwipe.celebrate2'),
        t('practiceSwipe.celebrate3'),
        t('practiceSwipe.celebrate4'),
      ];
      popIdRef.current += 1;
      setPop({
        id: popIdRef.current,
        word: upper,
        label: labels[Math.floor(Math.random() * labels.length)],
      });
      setTimeout(() => {
        setPop((cur) => (cur && cur.id === popIdRef.current ? null : cur));
      }, 900);
      fireOnboardingBurst({ x: 0.5, y: 0.4 });

      if (!target || upper.length !== target.length) return;

      const fb = getLetterFeedback(upper, target, language);
      setLatestFeedback(fb);
      setOverlayUntil(Date.now() + 1400);
      setTries((n) => n + 1);

      // Persist green & yellow knowledge
      setReveals((prev) => {
        const next = new Map(prev);
        for (const f of fb) {
          if (f.feedback === 'green') next.set(f.position, f.letter);
        }
        return next;
      });
      setYellowLetters((prev) => {
        const next = new Set(prev);
        for (const f of fb) {
          if (f.feedback === 'yellow') next.add(f.letter);
        }
        return next;
      });
    },
    [playWordAcceptedSound, t, target, language],
  );

  const grid = boardPick?.grid ?? null;

  const {
    foundWords,
    currentFeedback,
    submitWord,
    reset: resetSubmission,
    validWordCount,
  } = useWordSubmission({
    grid,
    language,
    minWordLength: 2,
    mode: 'practice',
    t,
    onWordAccepted: handleAccepted,
    onWordRejected: () => {
      playWordRejectedSound();
    },
  });

  // Detect target solved
  useEffect(() => {
    if (!target) return;
    if (solved) return;
    const targetUpper = target.toUpperCase();
    const found = foundWords.some(
      (w) => w.isValid === true && w.word.toUpperCase() === targetUpper,
    );
    if (found && !celebratedRef.current) {
      celebratedRef.current = true;
      setSolved(true);
      markPracticeMode('wordHunt', language);
      fireVictoryConfetti();
    }
  }, [foundWords, target, language, solved]);

  // Reset overlay timer
  useEffect(() => {
    if (overlayUntil === 0) return;
    const ms = overlayUntil - Date.now();
    if (ms <= 0) return;
    const id = setTimeout(() => setOverlayUntil(0), ms);
    return () => clearTimeout(id);
  }, [overlayUntil]);

  const handleWordChange = useCallback((word: string, count: number) => {
    setFormingWord(word);
    setLetterCount(count);
  }, []);

  const handleNewBoard = useCallback(() => {
    resetForNewBoard();
    resetSubmission();
  }, [resetForNewBoard, resetSubmission]);

  const handleReveal = useCallback(() => {
    setRevealed(true);
  }, []);

  const validWords = useMemo(
    () => foundWords.filter((w) => w.isValid === true).map((w) => w.word.toUpperCase()),
    [foundWords],
  );

  const showOverlay = overlayUntil > 0 && latestFeedback !== null;
  const matchesTargetLength = !solved && letterCount === targetLength;
  const triesRemaining = Math.max(0, MAX_TRIES - tries);

  // Display character for each clue box
  const clueChars = useMemo(() => {
    const cells: Array<{ char: string; type: 'green' | 'yellow' | 'hidden' }> = [];
    if (!target) return cells;
    const display = language === 'he' ? applyHebrewFinalLetters(target) : target;
    for (let i = 0; i < display.length; i++) {
      const revealed = reveals.get(i);
      if (revealed) {
        cells.push({ char: revealed, type: 'green' });
      } else {
        cells.push({ char: '?', type: 'hidden' });
      }
    }
    return cells;
  }, [target, reveals, language]);

  const showFinalReveal = revealed && !solved;
  const greet = solved
    ? t('practiceSwipe.done')
    : t('practice.wordHunt.huntGreet');
  const instruction = solved
    ? t('practice.wordHunt.solved')
    : matchesTargetLength
      ? t('practice.wordHunt.matchLength')
      : t('practice.wordHunt.huntInstruction', { length: targetLength });

  const targetDisplay = useMemo(() => {
    if (!target) return '';
    return language === 'he' ? applyHebrewFinalLetters(target) : target;
  }, [target, language]);

  return (
    <div
      data-testid="practice-swipe-board"
      data-mode="wordHunt"
      className="min-h-[100dvh] w-full bg-linear-to-b from-neo-navy to-neo-navy-light px-4 pt-3 pb-bottom-stack flex flex-col items-center gap-3"
    >
      <div className="w-full max-w-md flex items-center justify-between">
        <Link
          href={`/${language}/practice`}
          className="text-xs font-neo-display font-black text-neo-cream/60 hover:text-neo-cream"
        >
          {t('practiceSwipe.back')}
        </Link>
        <div
          data-testid="practice-tries-left"
          className={cn(
            'flex items-center gap-1.5 px-2 py-0.5 rounded-full border-2 border-neo-black font-neo-display font-black text-xs',
            triesRemaining <= 2 ? 'bg-neo-red text-neo-white' : 'bg-neo-yellow text-neo-black',
          )}
        >
          <span>{triesRemaining}/{MAX_TRIES}</span>
          <span className="opacity-80">{t('practice.wordHunt.triesLeft')}</span>
        </div>
      </div>

      <div className="w-full max-w-md flex items-center gap-2">
        <Mascot variant={solved ? 'flexing' : 'explorer'} size="xs" clipShape="circle" clipBorder="lime" />
        <div className="relative flex-1 bg-neo-lime text-neo-black border-2 border-neo-black rounded-neo px-3 py-2 shadow-hard-sm">
          <p className="text-xs font-neo-display font-black uppercase tracking-wide leading-tight">
            {greet}
          </p>
          <p data-testid="practice-instruction" className="text-sm font-neo-body font-bold leading-tight">
            {instruction}
          </p>
        </div>
      </div>

      {/* Clue boxes — real-game style */}
      {target && (
        <div
          data-testid="practice-clue-boxes"
          className={cn(
            'mx-auto w-full max-w-md px-3 py-2 rounded-neo-lg border-2 transition-colors',
            showOverlay
              ? 'border-neo-lime bg-neo-navy/40 ring-2 ring-neo-lime/60'
              : matchesTargetLength
                ? 'border-neo-pink bg-neo-navy/40 ring-2 ring-neo-pink/60 animate-pulse'
                : 'border-neo-black/30 bg-neo-navy/30',
          )}
        >
          <div dir={language === 'he' ? 'rtl' : 'ltr'} className="flex justify-center flex-wrap gap-2">
            <AnimatePresence mode="sync">
              {showOverlay && latestFeedback ? (
                latestFeedback.map((f, i) => (
                  <motion.div
                    key={`fb-${i}-${f.letter}`}
                    initial={{ rotateX: 90, opacity: 0 }}
                    animate={{ rotateX: 0, opacity: 1 }}
                    transition={{ delay: i * 0.08, type: 'spring', stiffness: 280, damping: 20 }}
                    className={cn(
                      'flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 border-2 rounded-neo font-bold text-lg sm:text-xl shadow-hard',
                      f.feedback === 'green' && 'bg-green-500 border-green-700 text-white',
                      f.feedback === 'yellow' && 'bg-yellow-500 border-yellow-600 text-neo-black',
                      f.feedback === 'gray' && 'bg-gray-500 border-gray-700 text-white',
                    )}
                  >
                    {f.letter}
                  </motion.div>
                ))
              ) : (
                clueChars.map((cell, i) => {
                  const finalReveal = showFinalReveal;
                  const ch = finalReveal ? targetDisplay[i] ?? cell.char : cell.char;
                  const type = finalReveal ? 'green' : cell.type;
                  return (
                    <motion.div
                      key={`clue-${i}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.04, type: 'spring', stiffness: 320 }}
                      className={cn(
                        'flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 border-2 rounded-neo font-bold text-lg sm:text-xl shadow-hard',
                        type === 'green' && 'bg-green-500 border-green-700 text-white ring-1 ring-green-300/60',
                        type === 'yellow' && 'bg-yellow-500 border-yellow-600 text-neo-black',
                        type === 'hidden' && 'bg-neo-black border-neo-black text-white',
                      )}
                    >
                      {ch}
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>

          {/* Yellow letters legend */}
          {!showOverlay && yellowLetters.size > 0 && (
            <div className="mt-2 flex items-center justify-center gap-1 text-[10px] sm:text-xs">
              <span className="text-yellow-300 font-neo-display font-black uppercase">
                {t('practice.wordHunt.feedbackWrongPlace')}:
              </span>
              <div className="flex gap-0.5">
                {Array.from(yellowLetters).map((letter) => (
                  <span
                    key={letter}
                    className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-yellow-500 border border-yellow-600 rounded text-neo-black font-bold text-xs"
                  >
                    {letter}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <WordFormingArea
        word={formingWord}
        letterCount={letterCount}
        feedback={currentFeedback}
        compact
        className="justify-center"
      />

      <div className="relative w-full max-w-md flex items-center justify-center">
        <div className="w-full" style={{ aspectRatio: '1 / 1' }}>
          {grid && (
            <GridComponent
              grid={grid}
              interactive={!solved}
              onWordSubmit={submitWord}
              onWordChange={handleWordChange}
              hideWordPreview
              language={language}
              animateOnMount
            />
          )}
        </div>
        <AnimatePresence>
          {pop && (
            <motion.div
              key={pop.id}
              initial={{ opacity: 0, scale: 0.6, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: -10 }}
              exit={{ opacity: 0, scale: 0.7, y: -40 }}
              transition={{ type: 'spring', stiffness: 360, damping: 18 }}
              className="absolute pointer-events-none z-10 bg-neo-pink text-neo-white border-3 border-neo-black rounded-neo px-4 py-2 shadow-hard"
            >
              <span className="font-neo-display font-black text-lg uppercase tracking-wide">
                {pop.label}
              </span>
              <span className="block text-xs font-neo-body font-bold opacity-90 text-center">
                +{pop.word.toUpperCase()}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {validWords.length > 0 && (
        <div className="w-full max-w-md">
          <p className="text-[10px] uppercase tracking-wider font-neo-display font-black text-neo-cream/50 text-center mb-1">
            {t('practice.wordHunt.discoveries')} ({validWordCount})
          </p>
          <ul
            data-testid="practice-found-words"
            className="flex flex-wrap gap-1.5 justify-center"
          >
            {validWords.map((w) => {
              const isTarget = target && w === target.toUpperCase();
              return (
                <li
                  key={w}
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-neo-display font-bold border bg-neo-navy-light',
                    isTarget
                      ? 'border-neo-lime text-neo-lime ring-1 ring-neo-lime/40'
                      : 'border-neo-lime/40 text-neo-lime/80',
                  )}
                >
                  {language === 'he' ? applyHebrewFinalLetters(w) : w}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {solved ? (
        <div className="mt-2 w-full flex justify-center">
          <PracticeCompleteCard
            mode="wordHunt"
            words={validWords}
            locale={language}
            onPlayAgain={handleNewBoard}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleNewBoard}
            data-testid="practice-new-board"
            className="px-3 py-1 text-xs font-neo-display font-black text-neo-cream/60 underline underline-offset-2"
          >
            {t('practiceSwipe.newBoard')}
          </button>
          {(triesRemaining === 0 || tries > 0) && !revealed && (
            <button
              type="button"
              onClick={handleReveal}
              data-testid="practice-reveal-target"
              className="px-3 py-1 text-xs font-neo-display font-black text-neo-cream/60 underline underline-offset-2"
            >
              {t('practice.wordHunt.giveUp')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
