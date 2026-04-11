'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Shuffle, RotateCcw, Sparkles, Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { isValidWordWheelWord, type WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { WordWheelEffect } from './WordWheelEffectsCanvas';
import { WheelLetter, WordTile } from './WordWheelParts';

export interface WordWheelGameResult { wordsFound: string[]; score: number; timeSeconds: number }

interface WordWheelGameProps {
  puzzle: WordWheelPuzzle;
  duration: number;
  onComplete: (result: WordWheelGameResult) => void;
  onValidateWord: (word: string) => Promise<boolean>;
  onEffect: (effect: WordWheelEffect) => void;
}

function scoreWord(word: string): number {
  const len = word.length;
  if (len <= 2) return 0;
  if (len === 3) return 1;
  if (len === 4) return 3;
  if (len === 5) return 5;
  if (len === 6) return 8;
  if (len === 7) return 12;
  if (len === 8) return 18;
  return 25;
}

const WordWheelGame: React.FC<WordWheelGameProps> = ({
  puzzle, duration, onComplete, onValidateWord, onEffect,
}) => {
  const { t, dir } = useLanguage();
  const {
    playTileSelectSound, playWordAcceptedSound, playWordRejectedSound,
    playComboSound, playLegendaryWordSound, playEpicVictorySound,
    playCountdownBeep, playBoardShuffleSound, playButtonClickSound,
  } = useSoundEffects();

  // Built word: array of { letter, wheelIndex } — wheelIndex: -1 = center
  const [builtLetters, setBuiltLetters] = useState<Array<{ letter: string; wheelIndex: number }>>([]);
  const [wordsFound, setWordsFound] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [outerLetters, setOuterLetters] = useState(puzzle.outerLetters);
  const [lastWordScore, setLastWordScore] = useState<number | null>(null);
  const [combo, setCombo] = useState(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gameOverRef = useRef(false);
  const wordsFoundRef = useRef<string[]>([]);
  const scoreRef = useRef(0);
  const timeWarningFiredRef = useRef(false);
  const wheelContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { wordsFoundRef.current = wordsFound; }, [wordsFound]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  // Track which wheel indices are used in current word
  const usedIndices = useMemo(() => {
    const set = new Set<number>();
    for (const bl of builtLetters) set.add(bl.wheelIndex);
    return set;
  }, [builtLetters]);

  const builtWord = useMemo(
    () => builtLetters.map(bl => bl.letter).join(''),
    [builtLetters],
  );

  // Timer
  useEffect(() => {
    if (gameOverRef.current) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          gameOverRef.current = true;
          onEffect({ type: 'gameComplete', score: scoreRef.current });
          playEpicVictorySound();
          onComplete({
            wordsFound: wordsFoundRef.current,
            score: scoreRef.current,
            timeSeconds: duration,
          });
          return 0;
        }
        // Time warning at 10 seconds
        if (prev === 11 && !timeWarningFiredRef.current) {
          timeWarningFiredRef.current = true;
          onEffect({ type: 'timeWarning' });
        }
        // Countdown beeps + visual urgency in final 10 seconds
        if (prev <= 10) {
          playCountdownBeep(prev - 1);
          onEffect({ type: 'timeTick', secondsLeft: prev - 1 });
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [duration, onComplete, onEffect, playEpicVictorySound, playCountdownBeep]);

  // ── Feedback toast ──
  const showFeedback = useCallback((message: string, type: 'success' | 'error') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 1500);
  }, []);

  // ── Letter tap ──
  const handleLetterPress = useCallback((letter: string, wheelIndex: number, el: HTMLButtonElement) => {
    if (gameOverRef.current) return;
    setBuiltLetters(prev => [...prev, { letter, wheelIndex }]);
    playTileSelectSound();
    // Get element position for particle effect
    const rect = el.getBoundingClientRect();
    const containerRect = wheelContainerRef.current?.getBoundingClientRect();
    if (containerRect) {
      onEffect({
        type: 'letterTap',
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2,
      });
    }
  }, [onEffect, playTileSelectSound]);

  // ── Remove built letter ──
  const handleRemoveLetter = useCallback((index: number) => {
    setBuiltLetters(prev => prev.filter((_, i) => i !== index));
    playButtonClickSound();
  }, [playButtonClickSound]);

  // ── Clear all ──
  const handleClear = useCallback(() => {
    setBuiltLetters([]);
    playButtonClickSound();
  }, [playButtonClickSound]);

  // ── Shuffle outer letters ──
  const handleShuffle = useCallback(() => {
    setOuterLetters(prev => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
    playBoardShuffleSound();
  }, [playBoardShuffleSound]);

  // ── Submit word ──
  const handleSubmit = useCallback(async () => {
    if (isValidating || builtWord.length === 0 || gameOverRef.current) return;

    const word = builtWord.toUpperCase();

    // Client-side checks
    if (word.length < 3) {
      showFeedback(t('wordWheel.tooShort').replace('{min}', '3'), 'error');
      onEffect({ type: 'error', x: 200, y: 80 });
      playWordRejectedSound();
      return;
    }

    if (!word.includes(puzzle.centerLetter.toUpperCase())) {
      showFeedback(t('wordWheel.missingCenter').replace('{letter}', puzzle.centerLetter), 'error');
      onEffect({ type: 'error', x: 200, y: 80 });
      playWordRejectedSound();
      return;
    }

    if (!isValidWordWheelWord(word, puzzle.centerLetter, puzzle.allLetters)) {
      showFeedback(t('wordWheel.invalidLetters'), 'error');
      onEffect({ type: 'error', x: 200, y: 80 });
      playWordRejectedSound();
      return;
    }

    if (wordsFound.includes(word)) {
      showFeedback(t('wordWheel.alreadyFound'), 'error');
      onEffect({ type: 'error', x: 200, y: 80 });
      playWordRejectedSound();
      return;
    }

    setIsValidating(true);
    try {
      const isValid = await onValidateWord(word);
      if (isValid) {
        const points = scoreWord(word);
        setWordsFound(prev => [...prev, word]);
        setScore(prev => prev + points);
        setLastWordScore(points);
        setTimeout(() => setLastWordScore(null), 1200);
        showFeedback(`+${points}`, 'success');
        setBuiltLetters([]);

        // Combo tracker — resets after 5s of inactivity
        const newCombo = (comboTimerRef.current ? combo + 1 : 1);
        setCombo(prev => prev + 1);
        if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
        comboTimerRef.current = setTimeout(() => setCombo(0), 5000);

        // Sound effects
        const isPangram = word.length >= 9;
        if (isPangram) {
          playLegendaryWordSound();
        } else {
          playWordAcceptedSound();
        }
        if (newCombo >= 2) {
          playComboSound(newCombo);
        }

        // Trigger celebration effects
        const cx = wheelContainerRef.current
          ? wheelContainerRef.current.getBoundingClientRect().width / 2
          : 200;
        if (isPangram) {
          onEffect({ type: 'pangram', x: cx, y: 200 });
        } else {
          onEffect({ type: 'wordValid', x: cx, y: 200, points });
        }
        // Combo milestone effect
        if (newCombo >= 2) {
          onEffect({ type: 'combo', x: cx, y: 160, combo: newCombo });
        }
      } else {
        showFeedback(t('wordWheel.notInDictionary'), 'error');
        onEffect({ type: 'error', x: 200, y: 80 });
      }
    } finally {
      setIsValidating(false);
    }
  }, [builtWord, isValidating, puzzle, wordsFound, onValidateWord, showFeedback, t, onEffect, combo, playWordRejectedSound, playWordAcceptedSound, playLegendaryWordSound, playComboSound]);

  const wheelRadius = typeof window !== 'undefined' && window.innerWidth < 640 ? 80 : 96;

  // Timer display
  const timerColor = timeLeft <= 10 ? 'text-neo-red' : timeLeft <= 30 ? 'text-neo-orange' : 'text-neo-white';
  const timerPulse = timeLeft <= 10 ? 'animate-pulse' : '';
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div ref={wheelContainerRef} className="relative flex flex-col items-center gap-3 sm:gap-5 w-full max-w-lg mx-auto px-4">
      {/* ── Timer & Score Bar ── */}
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between w-full">
          <div className={cn('flex items-center gap-2 font-neo-display font-black text-xl', timerColor, timerPulse)}>
            <Clock className="w-5 h-5" />
            <span className="tabular-nums">{minutes}:{seconds.toString().padStart(2, '0')}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Combo counter */}
            <AnimatePresence>
              {combo >= 2 && (
                <motion.div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-neo border-2 border-neo-black bg-gradient-to-r from-neo-pink to-neo-red shadow-[0_0_10px_rgba(255,20,147,0.4)]"
                  initial={{ scale: 0, x: 20 }}
                  animate={{ scale: 1, x: 0 }}
                  exit={{ scale: 0, x: 20 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  <Flame className="w-4 h-4 text-neo-white" />
                  <span className="font-neo-display font-black text-neo-white text-sm">x{combo}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <span className="text-neo-cream/60 text-sm font-semibold">
              {t('wordWheel.wordsFound').replace('{count}', String(wordsFound.length))}
            </span>
            <motion.span
              key={score}
              className="font-neo-display font-black text-neo-lime text-xl"
              initial={{ scale: 1.4 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              {score}
            </motion.span>
          </div>
        </div>
        {/* Timer progress bar */}
        <div className="w-full h-1.5 rounded-full bg-neo-navy-light border border-neo-cream/10 overflow-hidden">
          <motion.div
            className={cn(
              'h-full rounded-full',
              timeLeft <= 10 ? 'bg-neo-red' : timeLeft <= 30 ? 'bg-neo-orange' : 'bg-gradient-to-r from-neo-lime to-neo-cyan',
            )}
            style={{ width: `${(timeLeft / duration) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* ── Word Builder Area ── */}
      <div className="relative w-full min-h-[60px] sm:min-h-[72px] flex items-center justify-center">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <AnimatePresence mode="popLayout">
            {builtLetters.length === 0 ? (
              <motion.span
                key="placeholder"
                className="text-neo-cream/30 font-neo-display text-base sm:text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {t('wordWheel.tapLetters')}
              </motion.span>
            ) : (
              builtLetters.map((bl, i) => (
                <WordTile
                  key={`${bl.wheelIndex}-${i}`}
                  letter={bl.letter}
                  index={i}
                  onRemove={handleRemoveLetter}
                  isCenter={bl.wheelIndex === -1}
                />
              ))
            )}
          </AnimatePresence>
        </div>
        {/* Inline feedback toast */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              className={cn(
                'absolute -bottom-7 left-1/2 -translate-x-1/2 px-3 py-1 rounded-neo border-2 border-neo-black text-sm font-bold whitespace-nowrap z-20',
                feedback.type === 'success'
                  ? 'bg-neo-lime text-neo-black'
                  : 'bg-neo-red text-neo-white',
              )}
              initial={{ opacity: 0, y: -10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
            >
              {feedback.message}
            </motion.div>
          )}
        </AnimatePresence>
        {/* Flying score */}
        <AnimatePresence>
          {lastWordScore !== null && (
            <motion.div
              key={`score-${Date.now()}`}
              className="absolute top-0 left-1/2 -translate-x-1/2 font-neo-display font-black text-neo-lime text-3xl pointer-events-none z-20"
              initial={{ opacity: 1, y: 0, scale: 0.5 }}
              animate={{ opacity: 0, y: -60, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            >
              +{lastWordScore}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── The Wheel ── */}
      <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-neo-lime/20"
          style={{ boxShadow: '0 0 24px rgba(191,255,0,0.12), inset 0 0 24px rgba(191,255,0,0.06)' }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Inner decorative ring */}
        <div className="absolute inset-4 sm:inset-5 rounded-full border border-neo-cyan/10" />
        <div className="absolute inset-8 sm:inset-10 rounded-full border border-neo-cream/5" />

        {/* Center letter */}
        <WheelLetter
          letter={puzzle.centerLetter}
          isCenter
          onPress={(letter, _, el) => handleLetterPress(letter, -1, el)}
          isUsed={usedIndices.has(-1)}
          index={-1}
          dir={dir}
        />
        {/* Outer letters */}
        {outerLetters.map((letter, i) => (
          <WheelLetter
            key={`${letter}-${i}`}
            letter={letter}
            isCenter={false}
            angle={i * 45}
            radius={wheelRadius}
            onPress={(l, _, el) => handleLetterPress(l, i, el)}
            isUsed={usedIndices.has(i)}
            index={i}
            dir={dir}
          />
        ))}
      </div>

      {/* ── Center letter rule hint ── */}
      <p className="text-neo-cream/40 text-xs text-center">
        {t('wordWheel.centerLetterRule')} &middot; {t('wordWheel.minLetters').replace('{min}', '3')}
      </p>

      {/* ── Action Buttons ── */}
      <div className="flex items-center gap-3">
        {/* Clear */}
        <motion.button
          type="button"
          onClick={handleClear}
          disabled={builtLetters.length === 0}
          className={cn(
            'p-3 rounded-neo border-3 border-neo-black bg-neo-navy-light text-neo-cream shadow-hard',
            'hover:bg-neo-navy active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
            'disabled:opacity-30 disabled:cursor-not-allowed',
          )}
          whileTap={{ scale: 0.9 }}
          aria-label={t('wordWheel.clear')}
        >
          <RotateCcw className="w-5 h-5" />
        </motion.button>

        {/* Submit */}
        <motion.button
          type="button"
          onClick={handleSubmit}
          disabled={isValidating || builtWord.length < 3}
          className={cn(
            'px-8 py-3 rounded-neo border-3 border-neo-black font-neo-display font-black text-lg',
            builtWord.length >= 3
              ? 'bg-gradient-to-r from-neo-lime to-neo-cyan text-neo-black shadow-[3px_3px_0px_black,0_0_16px_rgba(191,255,0,0.3)] hover:shadow-[3px_3px_0px_black,0_0_22px_rgba(0,255,255,0.4)]'
              : 'bg-neo-navy-light text-neo-cream/40 shadow-hard-lg',
            'active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
            'disabled:cursor-not-allowed',
          )}
          whileTap={builtWord.length >= 3 ? { scale: 0.92 } : {}}
          animate={isValidating ? { opacity: [1, 0.6, 1] } : {}}
          transition={isValidating ? { duration: 0.6, repeat: Infinity } : {}}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {t('wordWheel.submit')}
          </div>
        </motion.button>

        {/* Shuffle */}
        <motion.button
          type="button"
          onClick={handleShuffle}
          className={cn(
            'p-3 rounded-neo border-3 border-neo-black bg-neo-navy-light text-neo-cream shadow-hard',
            'hover:bg-neo-navy active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
          )}
          whileTap={{ scale: 0.9, rotate: 180 }}
          transition={{ type: 'spring', stiffness: 300 }}
          aria-label={t('wordWheel.shuffle')}
        >
          <Shuffle className="w-5 h-5" />
        </motion.button>
      </div>

      {/* ── Found Words ── */}
      <AnimatePresence>
        {wordsFound.length > 0 && (
          <motion.div
            className="w-full"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <h3 className="text-neo-cream/50 text-xs font-bold uppercase mb-2">
              {t('wordWheel.foundWords')} ({wordsFound.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {wordsFound.map((word, i) => (
                <motion.span
                  key={word}
                  className="px-2.5 py-1 rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-cream text-xs font-semibold shadow-hard-xs"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, delay: i === wordsFound.length - 1 ? 0 : 0 }}
                >
                  {word} <span className="text-neo-lime font-black">+{scoreWord(word)}</span>
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WordWheelGame;
