'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { cn } from '@/lib/utils';
import { normalizeWord } from '@/shared/utils/wordNormalization';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import GridComponent from '@/components/GridComponent';
import { generateRandomTable } from '@/utils/utils';
import { pickRichestBoardClient } from '@/lib/boardSelection';
import { DIFFICULTIES } from '@/utils/consts';
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle,
  Star,
  Trophy,
  Lightbulb,
  Eye,
  EyeOff
} from 'lucide-react';
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
  const { t, language: uiLanguage } = useLanguage();
  const { playWordAcceptedSound, setGameActive } = useSoundEffects();
  const isRTL = uiLanguage === 'he';

  // Enable sound gate
  useEffect(() => {
    setGameActive(true);
    return () => setGameActive(false);
  }, [setGameActive]);

  // Get vocabulary words that can be integrated (normalized for comparison)
  const vocabularyWords = useMemo(() =>
    words.filter((w) => w.canIntegrate).map((w) => normalizeWord(w.word, language)),
    [words, language]
  );

  // Generate initial board with vocabulary words embedded
  const generateBoard = useCallback(() => {
    const config = DIFFICULTIES[difficulty];
    return pickRichestBoardClient(
      () => generateRandomTable(
        config.rows,
        config.cols,
        language,
        language !== 'ja' ? vocabularyWords : []
      ),
      language
    );
  }, [difficulty, language, vocabularyWords]);

  const [grid, setGrid] = useState<LetterGrid>(() => generateBoard());
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
              {t('education.practice.complete')}
            </h2>

            <div className="my-6 space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Star className="w-6 h-6 text-neo-yellow" />
                <span className="text-3xl font-neo-display text-neo-cyan">{score}</span>
                <span className="text-slate-400">{t('education.practice.points')}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-neo-black/30 rounded-neo">
                  <p className="text-2xl font-neo-display text-neo-white">{foundWords.length}</p>
                  <p className="text-xs text-slate-400">
                    {t('education.practice.wordsFound')}
                  </p>
                </div>
                <div className="p-3 bg-neo-pink/10 rounded-neo">
                  <p className="text-2xl font-neo-display text-neo-pink">
                    {vocabularyFound.length}/{vocabularyWords.length}
                  </p>
                  <p className="text-xs text-slate-400">
                    {t('education.practice.vocabulary')}
                  </p>
                </div>
              </div>
            </div>

            {/* XP Session Summary */}
            {xpSessionData && (
              <div className="mb-4 pt-4 border-t border-neo-black/30">
                {xpSessionData.sessionMasteryMessage && (
                  <p className="font-neo-display text-lg text-neo-yellow mb-2">
                    {xpSessionData.sessionMasteryMessage}
                  </p>
                )}
                <p className="text-neo-white font-neo-body">
                  +{xpSessionData.sessionXpEarned} {t('education.xp.xpGained')}
                </p>
              </div>
            )}

            {/* Vocabulary words found */}
            {vocabularyFound.length > 0 && (
              <div className="bg-neo-black/30 rounded-neo p-4 mb-6 max-h-32 overflow-y-auto">
                <p className="text-xs text-slate-400 mb-2">{t('education.practice.vocabularyWordsFound')}</p>
                <div className="flex flex-wrap gap-2">
                  {vocabularyFound.map((word) => (
                    <span
                      key={word}
                      className="px-2 py-1 bg-neo-pink/20 text-neo-pink text-sm rounded font-neo-body"
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
                  'flex-1 bg-neo-pink text-neo-black font-bold',
                  'border-neo border-neo-black shadow-hard hover:shadow-hard-pressed'
                )}
              >
                <RotateCcw className="w-4 h-4 me-2" />
                {t('common.retry')}
              </Button>
              <Button
                variant="outline"
                onClick={onBack}
                className="border-slate-400 text-slate-400 hover:bg-slate-400/20"
              >
                {t('common.back')}
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
            aria-label={t('common.back')}
            className="text-slate-400 hover:text-neo-white"
          >
            <ArrowLeft className={cn('w-5 h-5', isRTL && 'rotate-180')} />
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
        <Card className="border-neo border-neo-black shadow-hard bg-neo-pink/10 mb-4">
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

        {/* Game grid - container needs proper dimensions for absolute-positioned inner grid */}
        <div className="mb-4 flex items-center justify-center">
          <div className="w-full max-w-[min(100%,calc(100vh-350px))]" style={{ aspectRatio: '1/1' }}>
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
            'w-full bg-neo-pink text-neo-black font-bold',
            'border-neo border-neo-black shadow-hard hover:shadow-hard-pressed'
          )}
        >
          {t('education.practice.finish')}
        </Button>
      </div>
    </div>
  );
}
