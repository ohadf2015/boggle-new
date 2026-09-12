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
import { useWordSubmission } from '@/hooks/useWordSubmission';
import { DIFFICULTIES } from '@/utils/consts';
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle,
  Star,
  Target
} from 'lucide-react';
import PracticeResultsCard from './PracticeResultsCard';
import { PracticeInsufficientData } from './PracticeInsufficientData';
import { DRILL_ROOT_CLASS } from './drillLayout';
import { generatePlayablePracticeBoard } from '@/lib/education/practiceBoard';
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
}: SoloPracticeBoardProps) {
  const { t } = useLanguage();
  const { playWordAcceptedSound, playWordRejectedSound, setGameActive } = useSoundEffects();

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
    const next = generateBoard();
    setBoard(next);
    if (next) setGrid(next.grid);
    setVocabularyFound([]);
    resetSubmission();
    setFormingWord('');
    setFormingLetterCount(0);
  }, [generateBoard, resetSubmission]);

  // Handle finish practice
  const handleFinish = useCallback(() => {
    setShowComplete(true);
    onComplete({
      wordsFound: validWords,
      vocabularyWordsFound: vocabularyFound,
      score,
    });
  }, [validWords, vocabularyFound, score, onComplete]);

  if (!board) {
    return <PracticeInsufficientData onBack={onBack} />;
  }

  // Completion screen
  if (showComplete) {
    return (
      <div className={cn(DRILL_ROOT_CLASS, 'items-center justify-center p-4 sm:p-6')} translate="no">
        <PracticeResultsCard
          correct={vocabularyFound.length}
          total={Math.max(vocabularyWords.length, validWordCount)}
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
    <div className={cn(DRILL_ROOT_CLASS, 'p-4 sm:p-6')} translate="no">
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
            <h1 className="text-xl font-neo-display text-neo-white">
              {t('education.practice.soloBoard')}
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
                    {validWordCount} {t('education.practice.wordCount')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-neo-orange" />
                <span className="text-sm text-slate-400">
                  {vocabularyFound.length}/{vocabularyWords.length} {t('education.practice.vocab')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Word forming area with feedback */}
        <WordFormingArea word={formingWord} letterCount={formingLetterCount} feedback={currentFeedback} compact className="mb-3 justify-center shrink-0" />

        {/* Game grid scales to leftover height on a phone viewport */}
        <div className="mb-4 flex-1 min-h-0 flex items-center justify-center">
          <div className="aspect-square h-full max-w-full w-auto">
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
        </div>

        {/* Found words */}
        {validWords.length > 0 && (
          <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/80 mb-4 shrink-0">
            <CardContent className="py-3">
              <p className="text-xs text-slate-400 mb-2">{t('education.practice.foundWordsLabel')}</p>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {validWords.map((word) => (
                  <span
                    key={word}
                    className={cn(
                      'px-2 py-1 text-sm rounded font-neo-body',
                      isVocabularyWordCheck(word)
                        ? 'bg-neo-cyan/20 text-neo-cyan'
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
            'w-full bg-neo-cyan text-neo-black font-bold shrink-0',
            'border-neo border-neo-black shadow-hard hover:shadow-hard-pressed'
          )}
        >
          {t('education.practice.finish')}
        </Button>
      </div>
    </div>
  );
}
