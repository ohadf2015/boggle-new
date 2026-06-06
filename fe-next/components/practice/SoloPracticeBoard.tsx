'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { cn } from '@/lib/utils';
import { normalizeWord } from '@/shared/utils/wordNormalization';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import GridComponent from '@/components/GridComponent';
import WordFormingArea from '@/components/game/WordFormingArea';
import { useWordSubmission } from '@/hooks/useWordSubmission';
import { generateRandomTable } from '@/utils/utils';
import { pickRichestBoardClient } from '@/lib/boardSelection';
import { DIFFICULTIES } from '@/utils/consts';
import { m } from 'framer-motion';
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle,
  Star,
  Trophy,
  Target
} from 'lucide-react';
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
  const { t, language: uiLanguage } = useLanguage();
  const { playWordAcceptedSound, playWordRejectedSound, setGameActive } = useSoundEffects();
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
    setGrid(generateBoard());
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

  // Completion screen
  if (showComplete) {
    return (
      <div className="min-h-screen bg-neo-navy p-4 sm:p-6 flex items-center justify-center" translate="no">
        <m.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="border-3 border-black rounded-neo shadow-hard-lg bg-neo-navy/90 max-w-md w-full overflow-hidden"
        >
          {/* Celebration header stripe */}
          <div className="h-2 bg-linear-to-r from-neo-cyan via-neo-yellow to-neo-pink" />

          <div className="p-8 text-center">
            <m.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: [0, 8, -5, 3, 0] }}
              transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.2 }}
            >
              <Trophy className="w-16 h-16 mx-auto text-neo-yellow mb-4" />
            </m.div>

            <m.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-neo-display font-black text-neo-white uppercase mb-2"
            >
              {t('education.practice.complete')}
            </m.h2>

            <div className="my-6 space-y-4">
              <m.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.4 }}
                className="flex items-center justify-center gap-2"
              >
                <Star className="w-6 h-6 text-neo-yellow" />
                <span className="text-4xl font-neo-display font-black text-neo-cyan tabular-nums">{score}</span>
                <span className="text-neo-white font-bold">{t('education.practice.points')}</span>
              </m.div>

              <m.div
                className="grid grid-cols-2 gap-4 text-center"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.1, delayChildren: 0.5 } } }}
              >
                <m.div
                  variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                  className="p-3 bg-neo-yellow/10 rounded-neo border-2 border-black shadow-hard-sm"
                >
                  <p className="text-2xl font-neo-display font-black text-neo-white tabular-nums">{validWordCount}</p>
                  <p className="text-xs text-neo-white font-bold">
                    {t('education.practice.wordsFound')}
                  </p>
                </m.div>
                <m.div
                  variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                  className="p-3 bg-neo-cyan/10 rounded-neo border-2 border-black shadow-hard-sm"
                >
                  <p className="text-2xl font-neo-display font-black text-neo-cyan tabular-nums">{vocabularyFound.length}</p>
                  <p className="text-xs text-neo-white font-bold">
                    {t('education.practice.vocabularyWords')}
                  </p>
                </m.div>
              </m.div>
            </div>

            {/* XP Session Summary */}
            {xpSessionData && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mb-4 pt-4 border-t-2 border-black/20"
              >
                {xpSessionData.sessionMasteryMessage && (
                  <p className="font-neo-display text-lg text-neo-yellow mb-2">
                    {xpSessionData.sessionMasteryMessage}
                  </p>
                )}
                <m.p
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ delay: 0.9, duration: 0.4 }}
                  className="text-neo-white font-neo-body font-bold"
                >
                  +{xpSessionData.sessionXpEarned} {t('education.xp.xpGained')}
                </m.p>
              </m.div>
            )}

            {/* Vocabulary words found */}
            {vocabularyFound.length > 0 && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="bg-black/20 rounded-neo border-2 border-black/30 p-4 mb-6 max-h-32 overflow-y-auto"
              >
                <p className="text-xs text-neo-white font-bold mb-2">{t('education.practice.vocabularyWordsFound')}</p>
                <div className="flex flex-wrap gap-2">
                  {vocabularyFound.map((word, i) => (
                    <m.span
                      key={word}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.9 + i * 0.05, type: 'spring', stiffness: 400, damping: 15 }}
                      className="px-2 py-1 bg-neo-cyan/20 text-neo-cyan text-sm rounded-neo border border-neo-cyan/30 font-neo-body font-bold"
                    >
                      {word}
                    </m.span>
                  ))}
                </div>
              </m.div>
            )}

            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="flex gap-3"
            >
              <Button
                onClick={() => {
                  setShowComplete(false);
                  handleRegenerate();
                }}
                className={cn(
                  'flex-1 bg-neo-cyan text-neo-black font-black uppercase',
                  'border-3 border-neo-black shadow-hard hover:shadow-hard-pressed'
                )}
              >
                <RotateCcw className="w-4 h-4 me-2" />
                {t('common.retry')}
              </Button>
              <Button
                onClick={onBack}
                className="border-3 border-neo-pink text-neo-pink bg-neo-pink/10 hover:bg-neo-pink/20 font-black uppercase"
              >
                {t('common.back')}
              </Button>
            </m.div>
          </div>
        </m.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo-navy p-4 sm:p-6" translate="no">
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
        <WordFormingArea word={formingWord} letterCount={formingLetterCount} feedback={currentFeedback} compact className="mb-3 justify-center" />

        {/* Game grid - container needs proper dimensions for absolute-positioned inner grid */}
        <div className="mb-4 flex items-center justify-center">
          <div className="w-full max-w-[min(100%,calc(100vh-400px))]" style={{ aspectRatio: '1/1' }}>
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
          <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/80 mb-4">
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
            'w-full bg-neo-cyan text-neo-black font-bold',
            'border-neo border-neo-black shadow-hard hover:shadow-hard-pressed'
          )}
        >
          {t('education.practice.finish')}
        </Button>
      </div>
    </div>
  );
}
