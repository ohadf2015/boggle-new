'use client';

import { useState, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import GridComponent from '@/components/GridComponent';
import { generateRandomTable } from '@/utils/utils';
import { DIFFICULTIES } from '@/utils/consts';
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle,
  Star,
  Trophy,
  Target
} from 'lucide-react';
import type { LetterGrid, Language, DifficultyLevel } from '@/types';
import type { VocabularyWord } from '@/lib/supabase/teacher';

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
  const { t, language: uiLanguage } = useLanguage();
  const isRTL = uiLanguage === 'he';

  // Get vocabulary words that can be integrated
  const vocabularyWords = useMemo(() =>
    words.filter((w) => w.canIntegrate).map((w) => w.word.toUpperCase()),
    [words]
  );

  // Generate initial board with vocabulary words embedded
  const generateBoard = useCallback(() => {
    const config = DIFFICULTIES[difficulty];
    return generateRandomTable(
      config.rows,
      config.cols,
      language,
      language !== 'ja' ? vocabularyWords : []
    );
  }, [difficulty, language, vocabularyWords]);

  const [grid, setGrid] = useState<LetterGrid>(() => generateBoard());
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [vocabularyFound, setVocabularyFound] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [showComplete, setShowComplete] = useState(false);

  // Check if word is a vocabulary word
  const isVocabularyWord = useCallback((word: string) => {
    return vocabularyWords.includes(word.toUpperCase());
  }, [vocabularyWords]);

  // Handle word submission
  const handleWordSubmit = useCallback((word: string) => {
    const upperWord = word.toUpperCase();

    // Skip if already found
    if (foundWords.includes(upperWord)) return;

    // Calculate score (longer words = more points)
    const wordScore = word.length * 10 + (word.length > 4 ? (word.length - 4) * 5 : 0);
    const isVocab = isVocabularyWord(upperWord);
    const bonusScore = isVocab ? 25 : 0;

    setFoundWords((prev) => [...prev, upperWord]);
    setScore((prev) => prev + wordScore + bonusScore);

    if (isVocab) {
      setVocabularyFound((prev) => [...prev, upperWord]);
    }

    onWordFound?.(upperWord, isVocab);
  }, [foundWords, isVocabularyWord, onWordFound]);

  // Handle regenerate board
  const handleRegenerate = useCallback(() => {
    setGrid(generateBoard());
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

  // Completion screen
  if (showComplete) {
    return (
      <div className="min-h-screen bg-neo-navy p-4 sm:p-6 flex items-center justify-center">
        <Card className="border-neo border-neo-black shadow-hard-lg bg-neo-navy/80 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Trophy className="w-16 h-16 mx-auto text-neo-yellow mb-4" />

            <h2 className="text-2xl font-neo-display text-neo-white mb-2">
              {t('education.practice.complete') || 'Practice Complete!'}
            </h2>

            <div className="my-6 space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Star className="w-6 h-6 text-neo-yellow" />
                <span className="text-3xl font-neo-display text-neo-cyan">{score}</span>
                <span className="text-slate-400">points</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-neo-black/30 rounded-neo">
                  <p className="text-2xl font-neo-display text-neo-white">{foundWords.length}</p>
                  <p className="text-xs text-slate-400">
                    {t('education.practice.wordsFound') || 'Words Found'}
                  </p>
                </div>
                <div className="p-3 bg-neo-cyan/10 rounded-neo">
                  <p className="text-2xl font-neo-display text-neo-cyan">{vocabularyFound.length}</p>
                  <p className="text-xs text-slate-400">
                    Vocabulary Words
                  </p>
                </div>
              </div>
            </div>

            {/* XP Session Summary - Mastery message shown FIRST (research requirement) */}
            {xpSessionData && (
              <div className="mb-4 pt-4 border-t border-neo-black/30">
                {xpSessionData.sessionMasteryMessage && (
                  <p className="font-neo-display text-lg text-neo-yellow mb-2">
                    {xpSessionData.sessionMasteryMessage}
                  </p>
                )}
                <p className="text-neo-white/80 font-neo-body">
                  +{xpSessionData.sessionXpEarned} {t('education.xp.xpGained') || 'XP'}
                </p>
              </div>
            )}

            {/* Vocabulary words found */}
            {vocabularyFound.length > 0 && (
              <div className="bg-neo-black/30 rounded-neo p-4 mb-6 max-h-32 overflow-y-auto">
                <p className="text-xs text-slate-400 mb-2">Vocabulary words found:</p>
                <div className="flex flex-wrap gap-2">
                  {vocabularyFound.map((word) => (
                    <span
                      key={word}
                      className="px-2 py-1 bg-neo-cyan/20 text-neo-cyan text-sm rounded font-neo-body"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowComplete(false);
                  handleRegenerate();
                }}
                className={cn(
                  'flex-1 bg-neo-cyan text-neo-black font-bold',
                  'border-neo border-neo-black shadow-hard hover:shadow-hard-pressed'
                )}
              >
                <RotateCcw className={cn('w-4 h-4', isRTL ? 'ml-2' : 'mr-2')} />
                {t('common.retry') || 'Play Again'}
              </Button>
              <Button
                variant="outline"
                onClick={onBack}
                className="border-neo-pink text-neo-pink hover:bg-neo-pink/20"
              >
                {t('common.back') || 'Back'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo-navy p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-slate-400 hover:text-neo-white"
          >
            <ArrowLeft className={cn('w-5 h-5', isRTL && 'rotate-180')} />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-neo-display text-neo-white">
              {t('education.practice.soloBoard') || 'Solo Practice'}
            </h1>
            <p className="text-sm text-slate-400">{lessonName}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            className="text-slate-400 hover:text-neo-white"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats bar */}
        <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/80 mb-4">
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
                    {foundWords.length} words
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-neo-orange" />
                <span className="text-sm text-slate-400">
                  {vocabularyFound.length}/{vocabularyWords.length} vocab
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Game grid */}
        <div className="mb-4">
          <GridComponent
            grid={grid}
            interactive
            onWordSubmit={handleWordSubmit}
            language={language}
            animateOnMount
          />
        </div>

        {/* Found words */}
        {foundWords.length > 0 && (
          <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/80 mb-4">
            <CardContent className="py-3">
              <p className="text-xs text-slate-400 mb-2">Found words:</p>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {foundWords.map((word) => (
                  <span
                    key={word}
                    className={cn(
                      'px-2 py-1 text-sm rounded font-neo-body',
                      isVocabularyWord(word)
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
            'w-full bg-neo-cyan text-neo-black font-bold',
            'border-neo border-neo-black shadow-hard hover:shadow-hard-pressed'
          )}
        >
          {t('education.practice.finish') || 'Finish Practice'}
        </Button>
      </div>
    </div>
  );
}
