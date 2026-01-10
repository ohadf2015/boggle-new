'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wand2, Share2, Check, Copy, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getGuestFingerprint } from '@/utils/dailyChallenge';
import { buildPuzzleShareUrl } from '@/utils/customPuzzle';
import type { LetterGrid, Language } from '@/types';
import DailyWordHuntSurvival from '@/components/daily/DailyWordHuntSurvival';
import type { SurvivalGameResult } from '@/components/daily/survival';

// Sample target words per language (curated list of interesting words)
const SAMPLE_WORDS: Record<Language, string[]> = {
  en: ['PUZZLE', 'MAGIC', 'QUEST', 'BRAVE', 'SWIFT', 'CROWN', 'SPARK', 'DREAM', 'FLAME', 'FROST', 'OCEAN', 'STORM'],
  he: ['חידה', 'קסם', 'מסע', 'אמיץ', 'מהיר', 'כתר', 'ניצוץ', 'חלום', 'להבה', 'קרח', 'אוקיינוס', 'סערה'],
  sv: ['PUSSEL', 'MAGI', 'SAGAN', 'MODIG', 'SNABB', 'KRONA', 'GNISTA', 'DROM', 'FLAMMA', 'FROST', 'HAVET', 'STORM'],
  ja: ['パズル', 'マジック', 'クエスト', 'ブレイブ', 'スイフト', 'クラウン', 'スパーク', 'ドリーム', 'フレイム', 'フロスト', 'オーシャン', 'ストーム'],
  es: ['PUZZLE', 'MAGIA', 'BUSCA', 'BRAVO', 'RAPIDO', 'CORONA', 'CHISPA', 'SUENO', 'LLAMA', 'HIELO', 'OCEANO', 'TORMENTA'],
  fr: ['PUZZLE', 'MAGIE', 'QUETE', 'BRAVE', 'RAPIDE', 'COURONNE', 'ETINCELLE', 'REVE', 'FLAMME', 'GIVRE', 'OCEAN', 'TEMPETE'],
  de: ['PUZZLE', 'MAGIE', 'SUCHE', 'TAPFER', 'SCHNELL', 'KRONE', 'FUNKE', 'TRAUM', 'FLAMME', 'FROST', 'OZEAN', 'STURM'],
};

interface CustomPuzzleCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

type CreatorPhase = 'select-word' | 'play' | 'share';

const CustomPuzzleCreator: React.FC<CustomPuzzleCreatorProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  const [phase, setPhase] = useState<CreatorPhase>('select-word');

  // Get fingerprint for guest users
  useEffect(() => {
    if (!user) {
      getGuestFingerprint().then(setFingerprint);
    }
  }, [user]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [generatedGrid, setGeneratedGrid] = useState<LetterGrid | null>(null);
  const [puzzleCode, setPuzzleCode] = useState<string | null>(null);
  const [creatorResult, setCreatorResult] = useState<SurvivalGameResult | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get display name
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Creator';

  // Get random selection of words (shuffled once on mount or language change)
  const [wordOptions, setWordOptions] = useState<string[]>([]);
  useEffect(() => {
    const words = SAMPLE_WORDS[language] || SAMPLE_WORDS.en;
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setWordOptions(shuffled.slice(0, 8));
  }, [language]);

  // Generate grid with target word embedded
  const generateGrid = useCallback(async (targetWord: string): Promise<LetterGrid | null> => {
    try {
      // Call API to generate grid
      const response = await fetch('/api/grid/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          targetWord,
          gridSize: { rows: 4, cols: 4 },
        }),
      });

      if (!response.ok) {
        console.error('Failed to generate grid');
        return null;
      }

      const data = await response.json();
      return data.grid;
    } catch (error) {
      console.error('Grid generation error:', error);
      return null;
    }
  }, [language]);

  // Handle word selection
  const handleWordSelect = useCallback(async (word: string) => {
    setSelectedWord(word);
    setIsCreating(true);

    const grid = await generateGrid(word);
    if (grid) {
      setGeneratedGrid(grid);
      setPhase('play');
    }

    setIsCreating(false);
  }, [generateGrid]);

  // Handle creator's game completion
  const handleCreatorComplete = useCallback(async (result: SurvivalGameResult) => {
    setCreatorResult(result);

    if (!selectedWord || !generatedGrid) return;

    // Create puzzle on server
    try {
      const response = await fetch('/api/custom-puzzle/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          targetWord: selectedWord,
          grid: generatedGrid,
          displayName,
          guestFingerprint: user ? null : fingerprint,
          creatorSolved: result.solved,
          creatorAttemptsUsed: result.attemptsUsed,
          creatorWordsDiscovered: result.wordsDiscovered.length,
          creatorLifeRemaining: result.lifeRemaining,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPuzzleCode(data.puzzleCode);
        setPhase('share');
      }
    } catch (error) {
      console.error('Error creating puzzle:', error);
    }
  }, [selectedWord, generatedGrid, language, displayName, user, fingerprint]);

  // Handle quit during play
  const handleQuit = useCallback(() => {
    setPhase('select-word');
    setSelectedWord(null);
    setGeneratedGrid(null);
  }, []);

  // Copy share link
  const handleCopyLink = useCallback(async () => {
    if (!puzzleCode) return;

    const shareUrl = buildPuzzleShareUrl(puzzleCode, language);
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [puzzleCode, language]);

  // Share puzzle
  const handleShare = useCallback(async () => {
    if (!puzzleCode) return;

    const shareUrl = buildPuzzleShareUrl(puzzleCode, language);
    const shareText = t('customPuzzle.shareText') ||
      `I created a custom word puzzle. Can you beat my score? ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: t('customPuzzle.title') || 'Custom Puzzle',
          text: shareText,
          url: shareUrl,
        });
      } catch {
        await handleCopyLink();
      }
    } else {
      await handleCopyLink();
    }
  }, [puzzleCode, language, t, handleCopyLink]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      >
        {/* Word Selection Phase */}
        {phase === 'select-word' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-neo-navy-light border-3 border-neo-black rounded-neo shadow-hard max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-neo-pink" />
                {t('customPuzzle.createTitle') || 'Create Your Own Puzzle'}
              </h2>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {t('customPuzzle.selectWord') || 'Select a target word for your puzzle:'}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {wordOptions.map((word) => (
                <Button
                  key={word}
                  variant="outline"
                  onClick={() => handleWordSelect(word)}
                  disabled={isCreating}
                  className="h-12 text-lg font-bold hover:bg-neo-pink/20"
                >
                  {word}
                </Button>
              ))}
            </div>

            {isCreating && (
              <div className="text-center py-4">
                <div className="animate-spin w-8 h-8 border-3 border-neo-pink border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {t('customPuzzle.generating') || 'Generating puzzle...'}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Play Phase (Full Screen) */}
        {phase === 'play' && selectedWord && generatedGrid && (
          <div className="fixed inset-0 z-50 bg-white dark:bg-neo-navy">
            <DailyWordHuntSurvival
              grid={generatedGrid}
              puzzleNumber={0}
              language={language}
              targetWord={selectedWord}
              onComplete={handleCreatorComplete}
              onQuit={handleQuit}
            />
          </div>
        )}

        {/* Share Phase */}
        {phase === 'share' && puzzleCode && creatorResult && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-neo-navy-light border-3 border-neo-black rounded-neo shadow-hard max-w-md w-full p-6"
          >
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 bg-neo-green rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Check className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold">
                {t('customPuzzle.created') || 'Puzzle Created!'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                {t('customPuzzle.shareWithFriends') || 'Share with friends to challenge them!'}
              </p>
            </div>

            {/* Score Display */}
            <div className="bg-neo-yellow/20 border-2 border-neo-yellow rounded-neo p-4 mb-4 text-center">
              <p className="text-sm text-gray-500 mb-1">
                {t('customPuzzle.yourScore') || 'Your Score to Beat'}
              </p>
              <p className="text-3xl font-bold">{creatorResult.efficiencyScore}</p>
            </div>

            {/* Share URL */}
            <div className="bg-gray-100 dark:bg-neo-navy rounded-neo p-3 mb-4 flex items-center gap-2">
              <code className="flex-1 text-sm truncate">
                {buildPuzzleShareUrl(puzzleCode, language)}
              </code>
              <Button variant="ghost" size="sm" onClick={handleCopyLink}>
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleShare}
                className="w-full bg-neo-pink hover:bg-neo-pink/90 text-white"
              >
                <Share2 className="w-4 h-4 mr-2" />
                {t('customPuzzle.share') || 'Share Puzzle'}
              </Button>

              <Button
                variant="outline"
                onClick={onClose}
                className="w-full"
              >
                {t('common.done') || 'Done'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default CustomPuzzleCreator;
