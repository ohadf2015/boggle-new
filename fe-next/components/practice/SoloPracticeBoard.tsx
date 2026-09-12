'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { cn } from '@/lib/utils';
import { normalizeWord } from '@/shared/utils/wordNormalization';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import GridComponent from '@/components/GridComponent';
import WordFormingArea from '@/components/game/WordFormingArea';
import { useContainerDimensions } from '@/hooks/useContainerDimensions';
import { useWordSubmission } from '@/hooks/useWordSubmission';
import { DIFFICULTIES } from '@/utils/consts';
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle,
  Star,
  Target
} from 'lucide-react';
import PracticeCompletionMoment from '@/components/education/practice/PracticeCompletionMoment';
import BeatTheClock from '@/components/education/practice/BeatTheClock';
import { PracticeInsufficientData } from './PracticeInsufficientData';
import { generatePlayablePracticeBoard, PRACTICE_BOARD_MAX_ATTEMPTS } from '@/lib/education/practiceBoard';
import { normalizePracticeWords } from '@/lib/education/normalizePracticeWords';
import type { LetterGrid, Language, DifficultyLevel } from '@/types';
import type { VocabularyWord } from '@/lib/supabase/education';

interface SoloPracticeBoardProps {
  lessonName: string;
  words: VocabularyWord[];
  language: Language;
  difficulty?: DifficultyLevel;
  onComplete: (results: { wordsFound: string[]; vocabularyWordsFound: string[]; score: number }) => void;
  onBack: () => void;
  onWordFound?: (word: string, isVocabularyWord: boolean) => void;
  /** Jump straight into the next ready mode, when the lesson offers one. */
  onNext?: () => void;
  /** Human name of that next mode, for the button label. */
  nextLabel?: string;
  /** XP session data to display on results screen (optional) */
  xpSessionData?: {
    sessionXpEarned: number;
    sessionMasteryMessage: string | null;
  };
}

export default function SoloPracticeBoard({
  lessonName,
  words,
  language,
  difficulty = 'MEDIUM',
  onComplete,
  onBack,
  onWordFound,
  xpSessionData,
  onNext,
  nextLabel,
}: SoloPracticeBoardProps) {
  const { t } = useLanguage();
  const { playWordAcceptedSound, playWordRejectedSound, setGameActive } = useSoundEffects();

  // Measure the grid's flex-1 area and render the largest square that fits
  // both axes. Percentage + aspect-ratio chains resolve to 0 inside the
  // fixed-viewport drill root on phones, which pushed the board's last row
  // off-screen (dogfood-found on 390x844, 2026-09-12).
  const { containerRef: gridAreaRef, dimensions: gridArea, isReady: gridAreaReady } =
    useContainerDimensions(50);
  const gridSize =
    gridAreaReady && gridArea ? Math.min(gridArea.width, gridArea.height) : 0;

  // Enable sound gate
  useEffect(() => {
    setGameActive(true);
    return () => setGameActive(false);
  }, [setGameActive]);

  // Get vocabulary words that can be integrated (normalized for comparison),
  // after the teacher's list has been trimmed, de-duplicated and stripped of
  // blanks — a board cannot hide a word that is an empty string.
  const vocabularyWords = useMemo(() =>
    normalizePracticeWords(words)
      .filter((w) => w.canIntegrate)
      .map((w) => normalizeWord(w.word, language)),
    [words, language]
  );

  /*
    A random grid is not necessarily a PLAYABLE one: the old generator took one
    roll and shipped it, so a lesson whose words never landed handed the student
    a board with nothing of theirs on it — and a `?mode=` deep link skips the
    picker's readiness check, so the drill is the only thing standing there.
    This retries seeds (capped, deterministic) until a lesson word is actually
    on the board, and returns null when none of them can ever fit.
  */
  const generateBoard = useCallback((seed: number) => {
    const config = DIFFICULTIES[difficulty];
    return generatePlayablePracticeBoard({
      words: vocabularyWords,
      language,
      rows: config.rows,
      cols: config.cols,
      seed,
    });
  }, [difficulty, language, vocabularyWords]);

  /*
    The generator is deterministic per seed, so AGAIN has to ASK for a new one
    — without this the student who tapped "play again" got the grid they had
    just finished, letter for letter. Each regenerate steps a whole attempt
    window past the last, so the retry never lands on a seed the previous run
    already rejected.
  */
  const [boardSeed, setBoardSeed] = useState(1);
  const [board, setBoard] = useState(() => generateBoard(1));
  const [grid, setGrid] = useState<LetterGrid>(() => board?.grid ?? []);
  const [vocabularyFound, setVocabularyFound] = useState<string[]>([]);
  const [showComplete, setShowComplete] = useState(false);

  // Word forming state (tracked via GridComponent's onWordChange)
  const [formingWord, setFormingWord] = useState('');
  const [formingLetterCount, setFormingLetterCount] = useState(0);

  // Check if word is a vocabulary word (using language-aware normalization)
  const isVocabularyWordCheck = useCallback((word: string) => {
    const normalizedWord = normalizeWord(word, language);
    return vocabularyWords.includes(normalizedWord);
  }, [vocabularyWords, language]);

  // Word submission with dictionary validation and feedback
  const {
    foundWords: hookFoundWords,
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
    onWordAccepted: (word) => {
      playWordAcceptedSound();
      const isVocab = isVocabularyWordCheck(word);
      if (isVocab) {
        setVocabularyFound((prev) => [...prev, word]);
      }
      onWordFound?.(word, isVocab);
    },
    onWordRejected: () => {
      playWordRejectedSound();
    },
  });

  // Derive score and valid word list from hook
  const score = useMemo(() =>
    hookFoundWords.filter(w => w.isValid === true).reduce((sum, w) => sum + w.score, 0),
    [hookFoundWords]
  );

  const validWords = useMemo(() =>
    hookFoundWords.filter(w => w.isValid === true).map(w => w.word),
    [hookFoundWords]
  );

  // Handle word forming change from GridComponent
  const handleWordChange = useCallback((word: string, letterCount: number) => {
    setFormingWord(word);
    setFormingLetterCount(letterCount);
  }, []);

  // Handle regenerate board
  const handleRegenerate = useCallback(() => {
    const nextSeed = boardSeed + PRACTICE_BOARD_MAX_ATTEMPTS;
    setBoardSeed(nextSeed);
    const next = generateBoard(nextSeed);
    setBoard(next);
    if (next) setGrid(next.grid);
    setVocabularyFound([]);
    resetSubmission();
    setFormingWord('');
    setFormingLetterCount(0);
  }, [generateBoard, boardSeed, resetSubmission]);

  // Handle finish practice
  const handleFinish = useCallback(() => {
    setShowComplete(true);
    onComplete({
      wordsFound: validWords,
      vocabularyWordsFound: vocabularyFound,
      score,
    });
  }, [validWords, vocabularyFound, score, onComplete]);

  /*
    The board used to end on its own bespoke card — a trophy glyph, a score and
    two buttons, with no confetti, no sound and no stars. It now lands on the
    same completion moment every other practice mode uses, scored on how much of
    the teacher's vocabulary the student actually dug out of the grid.
  */
  if (!board) {
    return <PracticeInsufficientData onBack={onBack} />;
  }

  if (showComplete) {
    return (
      <div className="flex min-h-full items-center justify-center bg-neo-navy p-4" translate="no">
        <PracticeCompletionMoment
          correct={vocabularyFound.length}
          total={vocabularyWords.length}
          xpEarned={xpSessionData?.sessionXpEarned}
          stats={[
            { key: 'score', label: t('student.practiceFun.points'), value: `${score}` },
            { key: 'words', label: t('education.practice.wordsFound'), value: `${validWordCount}` },
          ]}
          onAgain={() => {
            setShowComplete(false);
            handleRegenerate();
          }}
          onBack={onBack}
          onNext={onNext}
          nextLabel={nextLabel}
        />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-neo-navy p-4 sm:p-6" translate="no">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            aria-label={t('common.back')}
            className="text-neo-cream hover:text-neo-white"
          >
            <DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-neo-display text-neo-white">
              {t('education.practice.soloBoard')}
            </h1>
            <p className="text-sm text-neo-cream">{lessonName}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            aria-label={t('common.refresh')}
            className="text-neo-cream hover:text-neo-white"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats bar */}
        <Card className="border-[3px] border-neo-black shadow-hard bg-neo-navy/80 mb-4">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-neo-yellow" />
                  <span className="font-neo-display text-neo-white">{score}</span>
                </div>
                <div className="h-4 w-px bg-neo-black/30" />
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-neo-cyan" />
                  <span className="text-sm text-neo-cream">
                    {validWordCount} {t('education.practice.wordCount')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-neo-orange" />
                <span className="text-sm text-neo-cream">
                  {vocabularyFound.length}/{vocabularyWords.length} {t('education.practice.vocab')}
                </span>
              </div>
            </div>

            {/*
              The board had no time pressure of any kind. It does now, on by
              default, and the student can switch it off in one tap if they
              would rather browse the grid.
            */}
            <BeatTheClock
              mode="solo_board"
              wordCount={vocabularyWords.length}
              defaultOn
              active={!showComplete}
              onExpire={handleFinish}
              className="mt-3 border-t-[2px] border-black/30 pt-3"
            />
          </CardContent>
        </Card>

        {/* Word forming area with feedback */}
        <WordFormingArea word={formingWord} letterCount={formingLetterCount} feedback={currentFeedback} compact className="mb-3 justify-center" />

        {/* Game grid: largest square that fits the measured leftover area.
            Percentage/aspect-ratio chains collapse to 0 inside the flex
            drill root on phones — measure and pin explicit px instead. */}
        <div ref={gridAreaRef} className="mb-4 flex-1 min-h-0 flex items-center justify-center">
          {gridSize > 0 && (
            <div style={{ width: gridSize, height: gridSize }}>
              <GridComponent
                grid={grid}
                interactive
                onWordSubmit={submitWord}
                onWordChange={handleWordChange}
                hideWordPreview
                language={language}
                animateOnMount
              />
            </div>
          )}
        </div>

        {/* Found words */}
        {validWords.length > 0 && (
          <Card className="border-[3px] border-neo-black shadow-hard bg-neo-navy/80 mb-4">
            <CardContent className="py-3">
              <p className="text-xs text-neo-cream mb-2">{t('education.practice.foundWordsLabel')}</p>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {validWords.map((word) => (
                  <span
                    key={word}
                    className={cn(
                      'px-2 py-1 text-sm rounded font-neo-body',
                      isVocabularyWordCheck(word)
                        ? 'bg-neo-cyan/20 text-neo-cyan'
                        : 'bg-neo-black/30 text-neo-cream'
                    )}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Finish button */}
        <Button
          onClick={handleFinish}
          className={cn(
            'w-full bg-neo-cyan text-neo-black font-bold',
            'border-[3px] border-neo-black shadow-hard hover:shadow-hard-pressed'
          )}
        >
          {t('education.practice.finish')}
        </Button>
      </div>
    </div>
  );
}
