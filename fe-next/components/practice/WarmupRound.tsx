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
import PracticeResultsCard from './PracticeResultsCard';
import { PracticeInsufficientData } from './PracticeInsufficientData';
import { DRILL_ROOT_CLASS } from './drillLayout';
import { generatePlayablePracticeBoard } from '@/lib/education/practiceBoard';
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
}: WarmupRoundProps) {
  const { t } = useLanguage();
  const { playWordAcceptedSound, setGameActive } = useSoundEffects();

  // Enable sound gate
  useEffect(() => {
    setGameActive(true);
    return () => setGameActive(false);
  }, [setGameActive]);

  const vocabularyWords = useMemo(
    () => normalizePracticeWords(words).map((entry) => normalizeWord(entry.word, language)),
    [words, language],
  );

  const generateBoard = useCallback(() => {
    const config = DIFFICULTIES[difficulty];
    return generatePlayablePracticeBoard({
      words: vocabularyWords,
      language,
      rows: config.rows,
      cols: config.cols,
    });
  }, [difficulty, language, vocabularyWords]);

  const [board, setBoard] = useState(() => generateBoard());
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
    const next = generateBoard();
    setBoard(next);
    if (next) setGrid(next.grid);
    setFoundWords([]);
    setVocabularyFound([]);
    setScore(0);
  }, [generateBoard]);

  // Handle finish practice
  const handleFinish = useCallback(() => {
    setShowComplete(true);
    onComplete({
      wordsFound: foundWords,
      vocabularyWordsFound: vocabularyFound,
      score,
    });
  }, [foundWords, vocabularyFound, score, onComplete]);

  if (!board) {
    return <PracticeInsufficientData onBack={onBack} />;
  }

  // Completion screen
  if (showComplete) {
    return (
      <div className={cn(DRILL_ROOT_CLASS, 'items-center justify-center p-4 sm:p-6')}>
        <PracticeResultsCard
          correct={vocabularyFound.length}
          total={Math.max(vocabularyWords.length, foundWords.length)}
          xpEarned={xpSessionData?.sessionXpEarned}
          masteryMessage={xpSessionData?.sessionMasteryMessage ?? undefined}
          onRestart={() => {
            setShowComplete(false);
            handleRegenerate();
          }}
          onBack={onBack}
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
            className="text-slate-400 hover:text-neo-white"
          >
            <DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-neo-display text-neo-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-neo-pink" />
              {t('education.practice.warmup')}
            </h1>
            <p className="text-sm text-slate-400">{lessonName}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            aria-label={t('common.refresh')}
            className="text-slate-400 hover:text-neo-white"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Hints panel */}
        <Card className="border-neo border-neo-black shadow-hard bg-neo-pink/10 mb-4 shrink-0">
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
                className="text-slate-400 hover:text-neo-white p-1"
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
                  <span className="px-2 py-1 text-slate-500 text-sm">
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
        <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/80 mb-4 shrink-0">
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
                  <span className="text-sm text-slate-400">
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
          <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/80 mb-4">
            <CardContent className="py-3">
              <p className="text-xs text-slate-400 mb-2">{t('education.practice.foundWordsLabel')}</p>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {foundWords.map((word) => (
                  <span
                    key={word}
                    className={cn(
                      'px-2 py-1 text-sm rounded font-neo-body',
                      isVocabularyWord(word)
                        ? 'bg-neo-pink/20 text-neo-pink'
                        : 'bg-neo-black/30 text-slate-400'
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
            'border-neo border-neo-black shadow-hard hover:shadow-hard-pressed'
          )}
        >
          {t('education.practice.finish')}
        </Button>
      </div>
    </div>
  );
}
