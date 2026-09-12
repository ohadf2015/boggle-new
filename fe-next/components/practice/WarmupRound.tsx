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
import { DIFFICULTIES } from '@/utils/consts';
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle,
  Star,
  Lightbulb,
  Eye,
  EyeOff
} from 'lucide-react';
import PracticeCompletionMoment from '@/components/education/practice/PracticeCompletionMoment';
import { PracticeInsufficientData } from './PracticeInsufficientData';
import { DRILL_ROOT_CLASS } from './drillLayout';
import { generatePlayablePracticeBoard, PRACTICE_BOARD_MAX_ATTEMPTS } from '@/lib/education/practiceBoard';
import { normalizePracticeWords } from '@/lib/education/normalizePracticeWords';
import type { LetterGrid, Language, DifficultyLevel } from '@/types';
import type { VocabularyWord } from '@/lib/supabase/education';

interface WarmupRoundProps {
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

export default function WarmupRound({
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
}: WarmupRoundProps) {
  const { t } = useLanguage();
  const { playWordAcceptedSound, setGameActive } = useSoundEffects();

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
    Warmup's whole premise is "your teacher's words are hiding in here", so a
    grid that happens to contain none of them is not a warmup — it is a lie the
    hints panel then repeats. Retry seeds (capped, deterministic) until at
    least one lesson word is genuinely placeable; null means none ever can be,
    and the drill says so instead of dealing an unplayable board.
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
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [vocabularyFound, setVocabularyFound] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [showHints, setShowHints] = useState(true);

  // Check if word is a vocabulary word (using language-aware normalization)
  const isVocabularyWord = useCallback((word: string) => {
    const normalizedWord = normalizeWord(word, language);
    return vocabularyWords.includes(normalizedWord);
  }, [vocabularyWords, language]);

  // Get remaining vocabulary words to find
  const remainingVocabWords = useMemo(() => {
    return vocabularyWords.filter((w) => !vocabularyFound.includes(w));
  }, [vocabularyWords, vocabularyFound]);

  // Generate hint for vocabulary word
  const getHint = (word: string) => {
    if (word.length <= 2) return word;
    return word[0] + '_'.repeat(word.length - 1);
  };

  // Handle word submission
  const handleWordSubmit = useCallback((word: string) => {
    // Use language-aware normalization (handles Hebrew final letters, etc.)
    const normalizedWord = normalizeWord(word, language);

    // Skip if already found
    if (foundWords.includes(normalizedWord)) return;

    // Calculate score (longer words = more points)
    const wordScore = word.length * 10 + (word.length > 4 ? (word.length - 4) * 5 : 0);
    const isVocab = isVocabularyWord(normalizedWord);
    const bonusScore = isVocab ? 25 : 0;

    setFoundWords((prev) => [...prev, normalizedWord]);
    setScore((prev) => prev + wordScore + bonusScore);
    playWordAcceptedSound();

    if (isVocab) {
      setVocabularyFound((prev) => [...prev, normalizedWord]);
    }

    onWordFound?.(normalizedWord, isVocab);
  }, [foundWords, isVocabularyWord, language, onWordFound, playWordAcceptedSound]);

  // Handle regenerate board
  const handleRegenerate = useCallback(() => {
    const nextSeed = boardSeed + PRACTICE_BOARD_MAX_ATTEMPTS;
    setBoardSeed(nextSeed);
    const next = generateBoard(nextSeed);
    setBoard(next);
    if (next) setGrid(next.grid);
    setFoundWords([]);
    setVocabularyFound([]);
    setScore(0);
  }, [generateBoard, boardSeed]);

  // Handle finish practice
  const handleFinish = useCallback(() => {
    setShowComplete(true);
    onComplete({
      wordsFound: foundWords,
      vocabularyWordsFound: vocabularyFound,
      score,
    });
  }, [foundWords, vocabularyFound, score, onComplete]);

  /*
    Warmup was the last practice mode still ending on the old flat card — a
    trophy glyph, a score and two grey outline buttons. It now lands on the same
    completion moment as every other mode: stars scored on how much of the
    teacher's vocabulary the student dug out, a mascot that reacts, a stinger,
    and ONE big forward action instead of a retry/back pair.
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
            {
              key: 'words',
              label: t('education.practice.wordsFound'),
              value: `${foundWords.length}`,
            },
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
    <div className={cn(DRILL_ROOT_CLASS, 'p-4 sm:p-6')}>
      <div className="max-w-2xl mx-auto flex flex-col h-full min-h-0 w-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4 shrink-0">
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
            <h1 className="text-xl font-neo-display text-neo-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-neo-pink" />
              {t('education.practice.warmup')}
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

        {/* Hints panel */}
        <Card className="border-[3px] border-neo-black shadow-hard bg-neo-pink/10 mb-4 shrink-0">
          <CardContent className="py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-neo-pink" />
                <span className="text-sm font-neo-body text-neo-pink">
                  {t('education.practice.hints')}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHints((prev) => !prev)}
                className="text-neo-cream hover:text-neo-white p-1"
              >
                {showHints ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>

            {showHints && remainingVocabWords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {remainingVocabWords.slice(0, 6).map((word) => (
                  <span
                    key={word}
                    className="px-2 py-1 bg-neo-black/30 text-slate-300 text-sm rounded font-mono"
                  >
                    {getHint(word)}
                  </span>
                ))}
                {remainingVocabWords.length > 6 && (
                  <span className="px-2 py-1 text-neo-cream text-sm">
                    +{remainingVocabWords.length - 6} {t('education.practice.more')}
                  </span>
                )}
              </div>
            )}

            {showHints && remainingVocabWords.length === 0 && (
              <p className="text-sm text-neo-cyan">
                <CheckCircle className="w-4 h-4 inline me-1" />
                {t('education.practice.allVocabFound')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stats bar */}
        <Card className="border-[3px] border-neo-black shadow-hard bg-neo-navy/80 mb-4 shrink-0">
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
                    {foundWords.length} {t('education.practice.wordCount')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-neo-pink font-bold">
                  {vocabularyFound.length}/{vocabularyWords.length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* The grid takes the height left over, so it never pushes the finish
            button off a 390x844 phone. */}
        <div className="mb-4 flex-1 min-h-0 flex items-center justify-center">
          <div className="aspect-square h-full max-w-full w-auto">
            <GridComponent
              grid={grid}
              interactive
              onWordSubmit={handleWordSubmit}
              language={language}
              animateOnMount
            />
          </div>
        </div>

        {/* Found words */}
        {foundWords.length > 0 && (
          <Card className="border-[3px] border-neo-black shadow-hard bg-neo-navy/80 mb-4 shrink-0">
            <CardContent className="py-3">
              <p className="text-xs text-neo-cream mb-2">{t('education.practice.foundWordsLabel')}</p>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {foundWords.map((word) => (
                  <span
                    key={word}
                    className={cn(
                      'px-2 py-1 text-sm rounded font-neo-body',
                      isVocabularyWord(word)
                        ? 'bg-neo-pink/20 text-neo-pink'
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
            'w-full bg-neo-pink text-neo-black font-bold shrink-0',
            'border-[3px] border-neo-black shadow-hard hover:shadow-hard-pressed'
          )}
        >
          {t('education.practice.finish')}
        </Button>
      </div>
    </div>
  );
}
