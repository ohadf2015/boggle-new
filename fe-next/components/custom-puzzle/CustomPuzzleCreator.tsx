'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Share2, Check, Copy, ArrowRight, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getGuestFingerprint } from '@/utils/dailyChallenge';
import { buildPuzzleShareUrl } from '@/utils/customPuzzle';
import type { LetterGrid, Language } from '@/types';
import DailyWordHuntSurvival from '@/components/daily/DailyWordHuntSurvival';
import type { SurvivalGameResult } from '@/components/daily/survival';
import { cn } from '@/lib/utils';
import { NeoPanel } from '@/components/ui/panel';
import PuzzleWordEditor from './PuzzleWordEditor';

import {
  validateCustomPuzzleWord,
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

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setInputWord(value);
    const result = validateCustomPuzzleWord(value);
    setValidationStatus(result.status);
  }, []);

  // Generate grid mutation
  const generateGridMutation = useMutation({
    mutationFn: async (targetWord: string): Promise<LetterGrid | null> => {
      const response = await fetch('/api/grid/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, targetWord, gridSize: { rows: 7, cols: 7 } }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (!data.grid || !Array.isArray(data.grid)) return null;
      return data.grid;
    },
  });

  // Create puzzle mutation
  const createPuzzleMutation = useMutation({
    mutationFn: async (params: {
      targetWord: string;
      grid: LetterGrid;
      result: SurvivalGameResult;
    }) => {
      const wordsDiscoveredCount = Array.isArray(params.result.wordsDiscovered)
        ? params.result.wordsDiscovered.length : 0;

      const response = await fetch('/api/custom-puzzle/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          targetWord: params.targetWord,
          grid: params.grid,
          displayName,
          guestFingerprint: user ? null : fingerprint,
          creatorSolved: params.result.solved ?? false,
          creatorAttemptsUsed: params.result.attemptsUsed ?? 0,
          creatorWordsDiscovered: wordsDiscoveredCount,
          creatorLifeRemaining: params.result.lifeRemaining ?? 0,
        }),
      });
      return response.json();
    },
  });

  const handleCreatePuzzle = useCallback(async () => {
    if (validationStatus !== 'valid' || !inputWord) return;
    setSelectedWord(inputWord);
    setIsCreating(true);
    const grid = await generateGridMutation.mutateAsync(inputWord);
    if (grid) {
      setGeneratedGrid(grid);
      setPhase('play');
    }
    setIsCreating(false);
  }, [inputWord, validationStatus, generateGridMutation]);

  const handleCreatorComplete = useCallback(async (result: SurvivalGameResult) => {
    setCreatorResult(result);
    if (!selectedWord || !generatedGrid) return;

    try {
      const data = await createPuzzleMutation.mutateAsync({
        targetWord: selectedWord,
        grid: generatedGrid,
        result,
      });
      if (data.success) {
        setPuzzleCode(data.puzzleCode);
        setPhase('share');
      }
    } catch (error) {
      console.error('Error creating puzzle:', error);
    }
  }, [selectedWord, generatedGrid, createPuzzleMutation]);

  const handleQuit = useCallback(() => {
    setPhase('enter-word');
    setSelectedWord(null);
    setGeneratedGrid(null);
  }, []);

  const handleCopyLink = useCallback(async () => {
    if (!puzzleCode) return;
    const shareUrl = buildPuzzleShareUrl(puzzleCode, language);
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [puzzleCode, language]);

  const handleShare = useCallback(async () => {
    if (!puzzleCode) return;
    const shareUrl = buildPuzzleShareUrl(puzzleCode, language);
    const shareText = t('customPuzzle.shareText');

    if (navigator.share) {
      try {
        await navigator.share({ title: t('customPuzzle.title'), text: shareText, url: shareUrl });
      } catch {
        await handleCopyLink();
      }
    } else {
      await handleCopyLink();
    }
  }, [puzzleCode, language, t, handleCopyLink]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-neo-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0 duration-300"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Word Input Phase */}
        {phase === 'enter-word' && (
          <PuzzleWordEditor
            inputWord={inputWord}
            validationStatus={validationStatus}
            isCreating={isCreating}
            inputRef={inputRef}
            onInputChange={handleInputChange}
            onCreatePuzzle={handleCreatePuzzle}
            onClose={onClose}
          />
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
          <div
            className="bg-neo-cream border-4 border-neo-black rounded-neo shadow-hard-lg max-w-md w-full overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300"
          >
            {/* Success Header */}
            <div className="bg-linear-to-r from-neo-lime to-neo-cyan border-b-4 border-neo-black p-6 text-center relative overflow-hidden">
              <AdaptiveMotion.div
                className="absolute top-2 left-4 text-2xl"
                animate={{ rotate: [0, 15, -15, 0], y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🎉
              </AdaptiveMotion.div>
              <AdaptiveMotion.div
                className="absolute top-4 right-6 text-xl"
                animate={{ rotate: [0, -15, 15, 0], y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              >
                ✨
              </AdaptiveMotion.div>

              <div
                className="w-20 h-20 bg-neo-cream border-4 border-neo-black rounded-full flex items-center justify-center mx-auto mb-3 shadow-hard animate-in zoom-in-50 duration-300"
                style={{ animationDelay: '0.2s' }}
              >
                <Trophy className="w-10 h-10 text-neo-lime" />
              </div>
              <h2 className="text-2xl font-black text-neo-black ltr:drop-shadow-[1px_1px_0px_white] rtl:drop-shadow-[-1px_1px_0px_white]">
                {t('customPuzzle.created')}
              </h2>
              <p className="text-neo-black/70 mt-1 font-medium">
                {t('customPuzzle.shareWithFriends')}
              </p>
            </div>

            <div className="p-5 space-y-4">
              {/* Score Display */}
              <div
                className="bg-neo-lime border-3 border-neo-black rounded-neo p-4 shadow-hard text-center animate-in fade-in-0 zoom-in-95 duration-300"
                style={{ animationDelay: '0.3s' }}
              >
                <p className="text-sm text-neo-black/70 font-bold uppercase tracking-wide mb-1">
                  {t('customPuzzle.yourScore')}
                </p>
                <p className="text-5xl font-black text-neo-black">{Math.round(creatorResult.efficiencyScore)}</p>
              </div>

              {/* Share URL */}
              <NeoPanel asChild tone="navy" shadow="sm" className="p-3 flex items-center gap-2">
              <div
                className="animate-in fade-in-0 zoom-in-95 duration-300"
                style={{ animationDelay: '0.4s' }}
              >
                <code className="flex-1 text-sm truncate text-neo-white font-mono">
                  {buildPuzzleShareUrl(puzzleCode, language)}
                </code>
                <button
                  onClick={handleCopyLink}
                  className={cn(
                    "w-10 h-10 rounded-neo border-2 border-neo-cream/50 flex items-center justify-center transition-all",
                    copied ? "bg-neo-lime border-neo-lime" : "bg-neo-navy-light hover:bg-neo-cream/20"
                  )}
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-neo-black" strokeWidth={3} />
                  ) : (
                    <Copy className="w-5 h-5 text-neo-white" />
                  )}
                </button>
              </div>
              </NeoPanel>

              {/* Actions */}
              <div
                className="space-y-3 pt-2 animate-in fade-in-0 zoom-in-95 duration-300"
                style={{ animationDelay: '0.5s' }}
              >
                <Button
                  onClick={handleShare}
                  className="w-full py-4 text-lg font-black uppercase bg-linear-to-r from-neo-pink to-neo-orange text-neo-white border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-1 active:translate-y-0 active:shadow-hard-pressed transition-all"
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
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CustomPuzzleCreator;
