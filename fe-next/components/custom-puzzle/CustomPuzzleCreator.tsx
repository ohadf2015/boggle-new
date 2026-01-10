'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wand2, Share2, Check, Copy, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getGuestFingerprint } from '@/utils/dailyChallenge';
import { buildPuzzleShareUrl } from '@/utils/customPuzzle';
import type { LetterGrid, Language } from '@/types';
import DailyWordHuntSurvival from '@/components/daily/DailyWordHuntSurvival';
import type { SurvivalGameResult } from '@/components/daily/survival';
import { cn } from '@/lib/utils';

// Validation constants
const MIN_WORD_LENGTH = 3;
const MAX_WORD_LENGTH = 8;
const DEBOUNCE_MS = 300;

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid' | 'too-short' | 'too-long';

interface CustomPuzzleCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

type CreatorPhase = 'enter-word' | 'play' | 'share';

const CustomPuzzleCreator: React.FC<CustomPuzzleCreatorProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

  // Validate word against dictionary
  const validateWord = useCallback(async (word: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/validate-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, language }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      return data.isValid === true;
    } catch (error) {
      console.error('Word validation error:', error);
      return false;
    }
  }, [language]);

  // Handle input change with debounced validation
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setInputWord(value);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Check length first
    if (value.length === 0) {
      setValidationStatus('idle');
      return;
    }

    if (value.length < MIN_WORD_LENGTH) {
      setValidationStatus('too-short');
      return;
    }

    if (value.length > MAX_WORD_LENGTH) {
      setValidationStatus('too-long');
      return;
    }

    // Set validating status and debounce API call
    setValidationStatus('validating');

    debounceRef.current = setTimeout(async () => {
      const isValid = await validateWord(value);
      setValidationStatus(isValid ? 'valid' : 'invalid');
    }, DEBOUNCE_MS);
  }, [validateWord]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Generate grid with target word embedded
  const generateGrid = useCallback(async (targetWord: string): Promise<LetterGrid | null> => {
    try {
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

  // Get validation message
  const getValidationMessage = (): string | null => {
    switch (validationStatus) {
      case 'validating':
        return t('customPuzzle.validating') || 'Checking...';
      case 'valid':
        return t('customPuzzle.wordValid') || 'Valid word!';
      case 'invalid':
        return t('customPuzzle.wordInvalid') || 'Word not in dictionary';
      case 'too-short':
        return t('customPuzzle.wordTooShort') || 'Minimum 3 letters';
      case 'too-long':
        return t('customPuzzle.wordTooLong') || 'Maximum 8 letters';
      default:
        return null;
    }
  };

  // Get validation color
  const getValidationColor = (): string => {
    switch (validationStatus) {
      case 'valid':
        return 'text-green-500';
      case 'invalid':
      case 'too-short':
      case 'too-long':
        return 'text-red-500';
      case 'validating':
        return 'text-neo-yellow';
      default:
        return 'text-gray-500';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      >
        {/* Word Input Phase */}
        {phase === 'enter-word' && (
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
              {t('customPuzzle.enterWord') || 'Enter your target word'}
            </p>

            {/* Word Input */}
            <div className="space-y-3 mb-6">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputWord}
                  onChange={handleInputChange}
                  placeholder={t('customPuzzle.enterWordPlaceholder') || 'Type a word...'}
                  className={cn(
                    "w-full px-4 py-3 text-xl font-bold text-center uppercase tracking-wider",
                    "bg-white dark:bg-neo-navy border-3 border-neo-black rounded-neo",
                    "focus:outline-none focus:ring-2 focus:ring-neo-pink focus:ring-offset-2",
                    "placeholder:text-gray-400 placeholder:lowercase placeholder:font-normal placeholder:tracking-normal",
                    validationStatus === 'valid' && "border-green-500 ring-1 ring-green-500",
                    (validationStatus === 'invalid' || validationStatus === 'too-short' || validationStatus === 'too-long') && "border-red-500 ring-1 ring-red-500"
                  )}
                  maxLength={MAX_WORD_LENGTH + 2}
                  disabled={isCreating}
                />

                {/* Validation icon */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {validationStatus === 'validating' && (
                    <Loader2 className="w-5 h-5 text-neo-yellow animate-spin" />
                  )}
                  {validationStatus === 'valid' && (
                    <Check className="w-5 h-5 text-green-500" />
                  )}
                  {(validationStatus === 'invalid' || validationStatus === 'too-short' || validationStatus === 'too-long') && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>

              {/* Validation message */}
              {getValidationMessage() && (
                <p className={cn("text-sm text-center font-medium", getValidationColor())}>
                  {getValidationMessage()}
                </p>
              )}
            </div>

            {/* Create Button */}
            <Button
              onClick={handleCreatePuzzle}
              disabled={validationStatus !== 'valid' || isCreating}
              className={cn(
                "w-full py-3 text-lg font-black uppercase border-3 rounded-neo transition-all",
                validationStatus === 'valid' && !isCreating
                  ? "bg-gradient-to-r from-neo-pink to-neo-orange text-white border-neo-black shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5"
                  : "bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed"
              )}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t('customPuzzle.generating') || 'Generating puzzle...'}
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  {t('customPuzzle.createPuzzle') || 'Create Puzzle'}
                </>
              )}
            </Button>
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
