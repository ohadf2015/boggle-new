'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wand2, Share2, Check, Copy, ArrowRight, AlertCircle, Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/Loader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getGuestFingerprint } from '@/utils/dailyChallenge';
import { buildPuzzleShareUrl } from '@/utils/customPuzzle';
import type { LetterGrid, Language } from '@/types';
import DailyWordHuntSurvival from '@/components/daily/DailyWordHuntSurvival';
import type { SurvivalGameResult } from '@/components/daily/survival';
import { cn } from '@/lib/utils';

import {
  validateCustomPuzzleWord,
  MIN_WORD_LENGTH,
  MAX_WORD_LENGTH,
  type ValidationStatus,
} from './customPuzzleValidation';

// ==========================================
// Types
// ==========================================

interface CustomPuzzleCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

type CreatorPhase = 'enter-word' | 'play' | 'share';

// ==========================================
// Component
// ==========================================

const CustomPuzzleCreator: React.FC<CustomPuzzleCreatorProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<CreatorPhase>('enter-word');
  const [inputWord, setInputWord] = useState('');
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [generatedGrid, setGeneratedGrid] = useState<LetterGrid | null>(null);
  const [puzzleCode, setPuzzleCode] = useState<string | null>(null);
  const [creatorResult, setCreatorResult] = useState<SurvivalGameResult | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get fingerprint for guest users
  useEffect(() => {
    if (!user) {
      getGuestFingerprint().then(setFingerprint);
    }
  }, [user]);

  // Get display name
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Creator';

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && phase === 'enter-word') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, phase]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPhase('enter-word');
      setInputWord('');
      setValidationStatus('idle');
      setSelectedWord(null);
      setGeneratedGrid(null);
      setPuzzleCode(null);
      setCreatorResult(null);
    }
  }, [isOpen]);

  // Handle input change with synchronous regex validation
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setInputWord(value);

    // Validate using regex-based validation (no dictionary lookup)
    const result = validateCustomPuzzleWord(value);
    setValidationStatus(result.status);
  }, []);

  // Generate grid with target word embedded (always 7x7 for custom puzzles)
  const generateGrid = useCallback(async (targetWord: string): Promise<LetterGrid | null> => {
    try {
      const response = await fetch('/api/grid/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          targetWord,
          gridSize: { rows: 7, cols: 7 },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to generate grid:', response.status, errorData);
        return null;
      }

      const data = await response.json();
      if (!data.grid || !Array.isArray(data.grid)) {
        console.error('Invalid grid data received:', data);
        return null;
      }
      return data.grid;
    } catch (error) {
      console.error('Grid generation error:', error);
      return null;
    }
  }, [language]);

  // Handle create puzzle button
  const handleCreatePuzzle = useCallback(async () => {
    if (validationStatus !== 'valid' || !inputWord) return;

    setSelectedWord(inputWord);
    setIsCreating(true);

    const grid = await generateGrid(inputWord);
    if (grid) {
      setGeneratedGrid(grid);
      setPhase('play');
    }

    setIsCreating(false);
  }, [inputWord, validationStatus, generateGrid]);

  // Handle creator's game completion
  const handleCreatorComplete = useCallback(async (result: SurvivalGameResult) => {
    setCreatorResult(result);

    if (!selectedWord || !generatedGrid) return;

    try {
      // Safely get wordsDiscovered count with fallback
      const wordsDiscoveredCount = Array.isArray(result.wordsDiscovered)
        ? result.wordsDiscovered.length
        : 0;

      const response = await fetch('/api/custom-puzzle/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          targetWord: selectedWord,
          grid: generatedGrid,
          displayName,
          guestFingerprint: user ? null : fingerprint,
          creatorSolved: result.solved ?? false,
          creatorAttemptsUsed: result.attemptsUsed ?? 0,
          creatorWordsDiscovered: wordsDiscoveredCount,
          creatorLifeRemaining: result.lifeRemaining ?? 0,
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
    setPhase('enter-word');
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
    const shareText = t('customPuzzle.shareText');

    if (navigator.share) {
      try {
        await navigator.share({
          title: t('customPuzzle.title'),
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

  // Get validation message
  const getValidationMessage = (): string | null => {
    switch (validationStatus) {
      case 'valid':
        return t('customPuzzle.wordValid');
      case 'invalid':
        return t('customPuzzle.invalidCharacters');
      case 'too-short':
        return t('customPuzzle.wordTooShort');
      case 'too-long':
        return t('customPuzzle.wordTooLong');
      default:
        return null;
    }
  };

  // Get validation styling for Neo-Brutalist design
  const getValidationStyles = (): { text: string; bg: string; border: string } => {
    switch (validationStatus) {
      case 'valid':
        return {
          text: 'text-neo-lime',
          bg: 'bg-neo-lime/20',
          border: 'border-neo-lime',
        };
      case 'invalid':
      case 'too-short':
      case 'too-long':
        return {
          text: 'text-neo-pink',
          bg: 'bg-neo-pink/20',
          border: 'border-neo-pink',
        };
      default:
        return {
          text: 'text-neo-cream/70',
          bg: 'bg-neo-navy/50',
          border: 'border-neo-cream/30',
        };
    }
  };

  const validationStyles = getValidationStyles();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-neo-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Word Input Phase */}
        {phase === 'enter-word' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="bg-neo-cream border-4 border-neo-black rounded-neo shadow-hard-lg max-w-md w-full overflow-hidden"
          >
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-neo-pink to-neo-orange border-b-4 border-neo-black px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    className="w-10 h-10 bg-neo-cream border-3 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm"
                  >
                    <Wand2 className="w-5 h-5 text-neo-pink" />
                  </motion.div>
                  <h2 className="text-xl font-black text-neo-cream drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                    {t('customPuzzle.createTitle')}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 bg-neo-cream border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm hover:bg-neo-lime transition-colors"
                  aria-label={t('common.close')}
                >
                  <X className="w-4 h-4 text-neo-black" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Instructions */}
              <p className="text-neo-black/80 text-center font-medium">
                {t('customPuzzle.enterWord')}
              </p>

              {/* Word Input */}
              <div className="space-y-3">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputWord}
                    onChange={handleInputChange}
                    placeholder={t('customPuzzle.enterWordPlaceholder')}
                    className={cn(
                      "w-full px-4 py-4 text-2xl font-black text-center uppercase tracking-widest",
                      "bg-neo-white border-4 border-neo-black rounded-neo shadow-hard-sm",
                      "focus:outline-none focus:shadow-hard focus:-translate-y-0.5 transition-all",
                      "placeholder:text-neo-black/30 placeholder:lowercase placeholder:font-normal placeholder:tracking-normal placeholder:text-base",
                      validationStatus === 'valid' && "border-neo-lime bg-neo-lime/10",
                      (validationStatus === 'invalid' || validationStatus === 'too-short' || validationStatus === 'too-long') && "border-neo-pink bg-neo-pink/10 animate-shake"
                    )}
                    maxLength={MAX_WORD_LENGTH + 2}
                    disabled={isCreating}
                  />

                  {/* Validation icon */}
                  <motion.div
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    key={validationStatus}
                  >
                    {validationStatus === 'valid' && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="w-8 h-8 bg-neo-lime border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm"
                      >
                        <Check className="w-5 h-5 text-neo-black" strokeWidth={3} />
                      </motion.div>
                    )}
                    {(validationStatus === 'invalid' || validationStatus === 'too-short' || validationStatus === 'too-long') && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-8 h-8 bg-neo-pink border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm"
                      >
                        <AlertCircle className="w-5 h-5 text-neo-cream" strokeWidth={3} />
                      </motion.div>
                    )}
                  </motion.div>
                </div>

                {/* Validation message */}
                <AnimatePresence mode="wait">
                  {getValidationMessage() && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className={cn(
                        "text-sm text-center font-bold py-2 px-3 rounded-neo border-2",
                        validationStyles.text,
                        validationStyles.bg,
                        validationStyles.border
                      )}
                    >
                      {getValidationMessage()}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Character count indicator */}
                <div className="flex justify-center gap-1">
                  {Array.from({ length: MAX_WORD_LENGTH }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{
                        scale: 1,
                        backgroundColor: i < inputWord.length
                          ? (validationStatus === 'valid' ? '#A3E635' : validationStatus === 'idle' ? '#FFE135' : '#FF1493')
                          : i < MIN_WORD_LENGTH ? '#374151' : '#6B7280'
                      }}
                      transition={{ delay: i * 0.02 }}
                      className={cn(
                        "w-3 h-3 rounded-full border-2 border-neo-black",
                        i < MIN_WORD_LENGTH && i >= inputWord.length && "opacity-50"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Create Button */}
              <motion.div
                whileHover={validationStatus === 'valid' && !isCreating ? { scale: 1.02 } : {}}
                whileTap={validationStatus === 'valid' && !isCreating ? { scale: 0.98 } : {}}
              >
                <Button
                  onClick={handleCreatePuzzle}
                  disabled={validationStatus !== 'valid' || isCreating}
                  className={cn(
                    "w-full py-4 text-xl font-black uppercase border-4 rounded-neo transition-all",
                    validationStatus === 'valid' && !isCreating
                      ? "bg-gradient-to-r from-neo-lime to-neo-cyan text-neo-black border-neo-black shadow-hard hover:shadow-hard-lg hover:-translate-y-1 active:translate-y-0 active:shadow-hard-pressed"
                      : "bg-neo-black/20 text-neo-black/40 border-neo-black/30 cursor-not-allowed shadow-none"
                  )}
                >
                  {isCreating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader size="md" />
                      {t('customPuzzle.generating')}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="w-6 h-6" />
                      {t('customPuzzle.createPuzzle')}
                    </span>
                  )}
                </Button>
              </motion.div>

              {/* Hint text */}
              <p className="text-xs text-center text-neo-black/50">
                {t('customPuzzle.createDescription')}
              </p>
            </div>
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
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="bg-neo-cream border-4 border-neo-black rounded-neo shadow-hard-lg max-w-md w-full overflow-hidden"
          >
            {/* Success Header */}
            <div className="bg-gradient-to-r from-neo-lime to-neo-cyan border-b-4 border-neo-black p-6 text-center relative overflow-hidden">
              {/* Confetti-like decorations */}
              <motion.div
                className="absolute top-2 left-4 text-2xl"
                animate={{ rotate: [0, 15, -15, 0], y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🎉
              </motion.div>
              <motion.div
                className="absolute top-4 right-6 text-xl"
                animate={{ rotate: [0, -15, 15, 0], y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              >
                ✨
              </motion.div>

              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 10, delay: 0.2 }}
                className="w-20 h-20 bg-neo-cream border-4 border-neo-black rounded-full flex items-center justify-center mx-auto mb-3 shadow-hard"
              >
                <Trophy className="w-10 h-10 text-neo-lime" />
              </motion.div>
              <h2 className="text-2xl font-black text-neo-black drop-shadow-[1px_1px_0px_white]">
                {t('customPuzzle.created')}
              </h2>
              <p className="text-neo-black/70 mt-1 font-medium">
                {t('customPuzzle.shareWithFriends')}
              </p>
            </div>

            <div className="p-5 space-y-4">
              {/* Score Display */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-neo-lime border-3 border-neo-black rounded-neo p-4 shadow-hard text-center"
              >
                <p className="text-sm text-neo-black/70 font-bold uppercase tracking-wide mb-1">
                  {t('customPuzzle.yourScore')}
                </p>
                <p className="text-5xl font-black text-neo-black">{Math.round(creatorResult.efficiencyScore)}</p>
              </motion.div>

              {/* Share URL */}
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-neo-navy border-3 border-neo-black rounded-neo p-3 flex items-center gap-2 shadow-hard-sm"
              >
                <code className="flex-1 text-sm truncate text-neo-cream font-mono">
                  {buildPuzzleShareUrl(puzzleCode, language)}
                </code>
                <motion.button
                  onClick={handleCopyLink}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "w-10 h-10 rounded-neo border-2 border-neo-cream/50 flex items-center justify-center transition-all",
                    copied ? "bg-neo-lime border-neo-lime" : "bg-neo-navy-light hover:bg-neo-cream/20"
                  )}
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-neo-black" strokeWidth={3} />
                  ) : (
                    <Copy className="w-5 h-5 text-neo-cream" />
                  )}
                </motion.button>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="space-y-3 pt-2"
              >
                <Button
                  onClick={handleShare}
                  className="w-full py-4 text-lg font-black uppercase bg-gradient-to-r from-neo-pink to-neo-orange text-neo-cream border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-1 active:translate-y-0 active:shadow-hard-pressed transition-all"
                >
                  <Share2 className="w-5 h-5 me-2" />
                  {t('customPuzzle.share')}
                </Button>

                <Button
                  variant="outline"
                  onClick={onClose}
                  className="w-full py-3 text-lg font-bold bg-neo-white text-neo-black border-3 border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed transition-all"
                >
                  {t('common.done')}
                  <ArrowRight className="w-5 h-5 ms-2" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default CustomPuzzleCreator;
