'use client';

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { Copy, Check, Share2, Crown, Grid3X3, Grid2X2, Sparkles, Zap, X, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { generateCustomChallengeGrid } from '@/utils/customChallengeGrid';
import { buildPuzzleShareUrl } from '@/utils/customPuzzle';
import type { Language } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { getGuestFingerprint } from '@/utils/dailyChallenge';
import { neoSuccessToast, neoErrorToast } from '@/components/NeoToast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mascot } from '@/components/ui/Mascot';
import { CustomChallengeStats } from '@/components/daily/CustomChallengeStats';

interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const CreateChallengeModal: React.FC<CreateChallengeModalProps> = ({ isOpen, onClose, language }) => {
  const [step, setStep] = useState<'config' | 'loading' | 'share' | 'stats'>('config');
  const [boardSize, setBoardSize] = useState<number>(5);
  const [targetWord, setTargetWord] = useState<string>('');
  const [wordError, setWordError] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [puzzleCode, setPuzzleCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const { profile, user } = useAuth();
  const { t } = useLanguage();

  // Language-specific letter validation patterns
  const getLetterPattern = (lang: Language): RegExp => {
    switch (lang) {
      case 'he':
        // Hebrew letters only (aleph to tav, including final forms)
        return /^[\u05D0-\u05EA]+$/;
      case 'en':
        // English letters only
        return /^[A-Za-z]+$/;
      case 'sv':
        // Swedish letters (including å, ä, ö)
        return /^[A-Za-zÅÄÖåäö]+$/;
      case 'ja':
        // Japanese (Hiragana, Katakana, Kanji)
        return /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]+$/;
      case 'es':
        // Spanish letters (including ñ, accented vowels)
        return /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+$/;
      default:
        return /^[A-Za-z]+$/;
    }
  };

  const validateWord = (word: string): string | null => {
    if (!word || word.trim().length === 0) {
      return t('daily.errorWordRequired');
    }

    const trimmed = word.trim();
    // Custom challenges accept 4-8 letter words regardless of board size
    const minLen = 4;
    const maxLen = 8;

    if (trimmed.length < minLen) {
      return t('daily.errorWordTooShort', { minLen });
    }

    if (trimmed.length > maxLen) {
      return t('daily.errorWordTooLong', { maxLen });
    }

    const pattern = getLetterPattern(language);
    if (!pattern.test(trimmed)) {
      return t('daily.errorInvalidLetters');
    }

    return null;
  };

  const handleCreate = async () => {
    // Validate word before proceeding
    const error = validateWord(targetWord);
    if (error) {
      setWordError(error);
      return;
    }

    setWordError('');
    setStep('loading');
    try {
      // Use the user-provided word
      const word = targetWord.trim().toUpperCase();

      // Generate grid with GUARANTEED embedded word
      // This uses the proven algorithm that always places the target word
      const grid = generateCustomChallengeGrid(boardSize, boardSize, language, word);

      // Create puzzle on server
      const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Player';
      const guestFingerprint = !user ? await getGuestFingerprint() : undefined;

      const createRes = await fetch('/api/custom-puzzle/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language,
          targetWord: word,
          grid,
          displayName,
          guestFingerprint,
          // No creator stats as we haven't played
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok) {
        throw new Error(createData.error || 'Failed to create puzzle');
      }

      const url = buildPuzzleShareUrl(createData.puzzleCode, language);
      setShareUrl(url);
      setPuzzleCode(createData.puzzleCode);
      setStep('share');

    } catch (error) {
      console.error('Error creating challenge:', error);
      neoErrorToast(t('daily.createChallengeFailed'));
      setStep('config');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    neoSuccessToast(t('daily.linkCopied'));
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: 'Custom Boggle Challenge',
      text: `Can you solve my ${boardSize}x${boardSize} challenge?`,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User canceled the share - this is expected behavior, not an error
        if (err instanceof Error && err.name === 'AbortError') {
          // Silently handle user cancellation
          return;
        }
        // Only log actual errors (not user cancellations)
        console.error('Error sharing:', err);
      }
    } else {
      handleCopy();
    }
  };

  const reset = () => {
    setStep('config');
    setTargetWord('');
    setWordError('');
    setShareUrl('');
  };

  const handleClose = () => {
    onClose();
    // Reset state after animation completes
    setTimeout(reset, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        noDescription
        hideCloseButton
        className="w-[calc(100%-2rem)] max-w-lg p-0 overflow-hidden bg-neo-white border-neo-thick border-neo-black rounded-xl shadow-hard-lg"
      >
        {/* Visually hidden title for accessibility */}
        <VisuallyHidden.Root>
          <DialogTitle>{t('daily.createChallengeTitle')}</DialogTitle>
        </VisuallyHidden.Root>

        <div className="max-h-[90vh] overflow-y-auto">
          {/* Header */}
            <div className="relative flex items-center justify-between p-3 sm:p-4 border-b-neo-thick border-neo-black bg-linear-to-br from-neo-lime to-neo-pink sticky top-0 z-10">
              <m.div
                className="flex items-center gap-3"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26, delay: 0.2 }}
              >
                <div className="relative">
                  <Crown className="w-7 h-7 sm:w-8 sm:h-8 text-neo-black drop-shadow-xs" strokeWidth={2.5} />
                  <m.div
                    className="absolute -top-1 -right-1"
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
                    transition={{ type: 'tween', repeat: Infinity, duration: 2 }}
                  >
                    <Sparkles className="w-4 h-4 text-neo-pink" fill="currentColor" />
                  </m.div>
                </div>
                <h2 className="font-bold text-xl sm:text-2xl uppercase tracking-tight text-neo-black drop-shadow-xs">
                  {t('daily.createChallengeTitle')}
                </h2>
              </m.div>
              <button
                onClick={handleClose}
                aria-label={t('common.close')}
                className="p-2 hover:bg-neo-black/10 rounded-lg transition-all hover:scale-110 active:scale-95"
              >
                <X className="w-6 h-6 sm:w-7 sm:h-7 text-neo-black" strokeWidth={2.5} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {step === 'config' && (
                <m.div
                  className="space-y-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.1 }}
                >
                  {/* Board Size Selection */}
                  <div className="space-y-3">
                    <div className="text-center">
                      <h3 className="text-lg sm:text-xl font-bold mb-1 text-neo-black dark:text-neo-white uppercase tracking-tight">
                        {t('daily.chooseBoardSize')}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">{t('daily.pickDifficulty')}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <m.button
                        onClick={() => setBoardSize(5)}
                        whileHover={{ scale: 1.05, y: -4 }}
                        whileTap={{ scale: 0.95, y: 0 }}
                        className={`relative p-4 sm:p-5 rounded-xl border-neo-thick transition-all flex flex-col items-center gap-2 ${
                          boardSize === 5
                            ? 'bg-neo-cyan text-neo-black border-neo-black shadow-hard-lg'
                            : 'bg-neo-white text-neo-black border-neo-black/30 hover:border-neo-cyan hover:text-neo-cyan shadow-hard-sm hover:shadow-hard'
                        }`}
                      >
                        <div className={`p-3 rounded-lg ${boardSize === 5 ? 'bg-neo-white/20' : 'bg-neo-cyan/10'}`}>
                          <Grid2X2 className={`w-8 h-8 sm:w-10 sm:h-10 ${boardSize === 5 ? 'text-neo-black' : 'text-neo-cyan'}`} strokeWidth={2.5} />
                        </div>
                        <div className="text-center">
                          <span className="font-black text-2xl sm:text-3xl block">5×5</span>
                          <span className="text-xs sm:text-sm font-bold uppercase tracking-wide">{t('daily.classic')}</span>
                        </div>
                        {boardSize === 5 && (
                          <m.div
                            className="absolute -top-2 -right-2"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1, rotate: 360 }}
                            transition={{ type: 'spring', bounce: 0.6 }}
                          >
                            <div className="bg-neo-pink border-3 border-neo-black rounded-full p-1 shadow-hard-sm">
                              <Check className="w-4 h-4 text-neo-white" strokeWidth={3} />
                            </div>
                          </m.div>
                        )}
                      </m.button>

                      <m.button
                        onClick={() => setBoardSize(7)}
                        whileHover={{ scale: 1.05, y: -4 }}
                        whileTap={{ scale: 0.95, y: 0 }}
                        className={`relative p-4 sm:p-5 rounded-xl border-neo-thick transition-all flex flex-col items-center gap-2 ${
                          boardSize === 7
                            ? 'bg-neo-pink text-neo-black border-neo-black shadow-hard-lg'
                            : 'bg-neo-white text-neo-black border-neo-black/30 hover:border-neo-pink hover:text-neo-pink shadow-hard-sm hover:shadow-hard'
                        }`}
                      >
                        <div className={`p-3 rounded-lg ${boardSize === 7 ? 'bg-neo-white/20' : 'bg-neo-pink/10'}`}>
                          <Grid3X3 className={`w-8 h-8 sm:w-10 sm:h-10 ${boardSize === 7 ? 'text-neo-black' : 'text-neo-pink'}`} strokeWidth={2.5} />
                        </div>
                        <div className="text-center">
                          <span className="font-black text-2xl sm:text-3xl block">7×7</span>
                          <span className="text-xs sm:text-sm font-bold uppercase tracking-wide">{t('daily.pro')}</span>
                        </div>
                        {boardSize === 7 && (
                          <m.div
                            className="absolute -top-2 -right-2"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1, rotate: 360 }}
                            transition={{ type: 'spring', bounce: 0.6 }}
                          >
                            <div className="bg-neo-pink border-3 border-neo-black rounded-full p-1 shadow-hard-sm">
                              <Check className="w-4 h-4 text-neo-white" strokeWidth={3} />
                            </div>
                          </m.div>
                        )}
                      </m.button>
                    </div>
                  </div>

                  {/* Word Input */}
                  <m.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.2 }}
                    className="space-y-2"
                  >
                    <label htmlFor="target-word" className="block text-sm sm:text-base font-black text-neo-black dark:text-neo-white uppercase tracking-tight">
                      {t('daily.enterTargetWord')}
                    </label>
                    <input
                      id="target-word"
                      type="text"
                      value={targetWord}
                      onChange={(e) => {
                        setTargetWord(e.target.value);
                        if (wordError) setWordError('');
                      }}
                      placeholder={t('daily.wordPlaceholder', {
                        min: 4,
                        max: 8
                      })}
                      className={`w-full px-4 py-3 text-lg font-bold text-neo-black border-neo-thick rounded-xl shadow-hard-sm focus:shadow-hard focus:outline-hidden transition-all ${
                        wordError
                          ? 'border-red-500 bg-red-50'
                          : 'border-neo-black bg-neo-white focus:border-neo-cyan'
                      } ${language === 'he' ? 'text-right' : 'text-left'}`}
                      dir={language === 'he' ? 'rtl' : 'ltr'}
                    />
                    {wordError && (
                      <m.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm font-bold text-red-600 flex items-center gap-2"
                      >
                        <span className="inline-block w-1 h-1 rounded-full bg-red-600" />
                        {wordError}
                      </m.p>
                    )}
                  </m.div>

                  {/* Generate Button */}
                  <m.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.4 }}
                  >
                    <Button
                      onClick={handleCreate}
                      className="relative w-full max-w-btn h-14 sm:h-16 text-lg sm:text-xl font-black bg-linear-to-br from-neo-pink to-neo-pink/80 hover:from-neo-pink/90 hover:to-neo-pink/70 text-neo-white border-neo-thick border-neo-black shadow-hard-lg hover:shadow-hard-xl hover:-translate-y-1 active:translate-y-0 active:shadow-hard-sm rounded-xl transition-all uppercase tracking-wide overflow-hidden group"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        <Zap className="w-6 h-6" strokeWidth={2.5} fill="currentColor" />
                        {t('daily.generateChallenge')}
                      </span>
                      <m.div
                        className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                      />
                    </Button>
                  </m.div>
                </m.div>
              )}

              {step === 'loading' && (
                <m.div
                  className="flex flex-col items-center justify-center py-12 sm:py-16 space-y-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {/* Animated Loader */}
                  <div className="relative">
                    <m.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="relative"
                    >
                      <div className="w-20 h-20 sm:w-24 sm:h-24 border-neo-thick border-neo-pink rounded-full border-t-transparent" />
                    </m.div>
                    <m.div
                      className="absolute inset-0 flex items-center justify-center"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ type: 'tween', duration: 1.5, repeat: Infinity }}
                    >
                      <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-neo-pink" strokeWidth={2.5} />
                    </m.div>
                  </div>

                  {/* Loading Text */}
                  <div className="text-center space-y-2">
                    <m.p
                      className="text-lg sm:text-xl font-black text-neo-black dark:text-neo-white uppercase tracking-wide"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {t('daily.generatingPuzzle')}
                    </m.p>
                    <m.div
                      className="flex gap-1 justify-center"
                      initial="hidden"
                      animate="visible"
                    >
                      {[0, 1, 2].map((i) => (
                        <m.div
                          key={`dot-${i}`}
                          className="w-2 h-2 bg-neo-pink rounded-full"
                          variants={{
                            hidden: { opacity: 0.3, scale: 0.8 },
                            visible: { opacity: 1, scale: 1 },
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.8,
                            delay: i * 0.2,
                            repeatType: 'reverse',
                          }}
                        />
                      ))}
                    </m.div>
                  </div>
                </m.div>
              )}

              {step === 'share' && (
                <m.div
                  className="space-y-6 text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.4 }}
                >
                  {/* Success Mascot with 3D effect */}
                  <div className="relative flex items-center justify-center h-32 sm:h-40">
                    {/* Background circle */}
                    <m.div
                      className="absolute w-24 h-24 sm:w-32 sm:h-32 bg-linear-to-br from-neo-lime to-neo-pink rounded-full border-neo-thick border-neo-black shadow-hard-lg"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', bounce: 0.6, duration: 0.6 }}
                    />

                    {/* Mascot popping out of circle (3D effect) */}
                    <m.div
                      initial={{ opacity: 0, scale: 0.95, rotate: -180, y: 20 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0, y: -8 }}
                      transition={{ type: 'spring', bounce: 0.6, duration: 0.8, delay: 0.1 }}
                      className="relative z-10"
                    >
                      <Mascot
                        variant="happy"
                        size="2xl"
                        animated={true}
                        className="drop-shadow-2xl"
                        clipBorder="none"
                      />
                    </m.div>

                    {/* Confetti particles */}
                    {[...Array(8)].map((_, i) => (
                      <m.div
                        key={`confetti-${i}`}
                        className="absolute top-1/2 left-1/2"
                        initial={{ scale: 0.95, x: 0, y: 0 }}
                        animate={{
                          scale: [0, 1, 0],
                          x: [0, (Math.cos((i * Math.PI) / 4) * 60)],
                          y: [0, (Math.sin((i * Math.PI) / 4) * 60)],
                        }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      >
                        <Sparkles
                          className={`w-4 h-4 ${
                            i % 3 === 0 ? 'text-neo-lime' : i % 3 === 1 ? 'text-neo-pink' : 'text-neo-cyan'
                          }`}
                          fill="currentColor"
                        />
                      </m.div>
                    ))}
                  </div>

                  {/* Success Message */}
                  <m.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.3 }}
                  >
                    <h3 className="font-black text-2xl sm:text-3xl mb-2 text-neo-black dark:text-neo-white uppercase tracking-tight">
                      {t('daily.challengeCreated')}
                    </h3>
                    <p className="text-base text-slate-700 dark:text-slate-300 font-medium">{t('daily.challengeCreatedDesc')}</p>
                  </m.div>

                  {/* Share URL Box */}
                  <m.div
                    className="flex items-center gap-2 bg-neo-cream border-3 border-neo-black rounded-xl p-3 shadow-hard-sm"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.4 }}
                  >
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase mb-1">{t('daily.challengeLink')}</p>
                      <p className="text-sm font-mono truncate text-neo-black font-bold">{shareUrl}</p>
                    </div>
                    <m.button
                      onClick={handleCopy}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`shrink-0 p-3 rounded-lg border-3 border-neo-black transition-all ${
                        copied
                          ? 'bg-neo-lime text-neo-black shadow-hard-sm'
                          : 'bg-neo-white hover:bg-neo-lime shadow-hard-sm hover:shadow-hard'
                      }`}
                    >
                      {copied ? (
                        <Check className="w-5 h-5 text-neo-white" strokeWidth={3} />
                      ) : (
                        <Copy className="w-5 h-5 text-neo-black" strokeWidth={2.5} />
                      )}
                    </m.button>
                  </m.div>

                  {/* Share Button */}
                  <m.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.5 }}
                    className="space-y-3"
                  >
                    <Button
                      onClick={handleNativeShare}
                      className="w-full max-w-btn h-14 sm:h-16 text-lg sm:text-xl font-black bg-linear-to-br from-neo-cyan to-blue-500 hover:from-neo-cyan/90 hover:to-blue-500/90 text-neo-white border-neo-thick border-neo-black shadow-hard-lg hover:shadow-hard-xl hover:-translate-y-1 active:translate-y-0 active:shadow-hard-sm rounded-xl transition-all uppercase tracking-wide"
                    >
                      <Share2 className="w-6 h-6 me-2" strokeWidth={2.5} />
                      {t('daily.shareChallenge')}
                    </Button>

                    <Button
                      onClick={() => setStep('stats')}
                      className="w-full max-w-btn h-14 sm:h-16 text-lg sm:text-xl font-black bg-linear-to-br from-neo-purple to-purple-600 hover:from-neo-purple/90 hover:to-purple-600/90 text-neo-white border-neo-thick border-neo-black shadow-hard-lg hover:shadow-hard-xl hover:-translate-y-1 active:translate-y-0 active:shadow-hard-sm rounded-xl transition-all uppercase tracking-wide"
                    >
                      <BarChart3 className="w-6 h-6 me-2" strokeWidth={2.5} />
                      {t('daily.viewStats')}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={handleClose}
                      className="w-full max-w-btn text-base font-bold text-slate-600 dark:text-slate-300 hover:text-neo-black hover:bg-gray-100 dark:hover:bg-neo-navy-light rounded-lg py-3"
                    >
                      {t('daily.close')}
                    </Button>
                  </m.div>

                  {/* Footer Hint */}
                  <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.6 }}
                    className="pt-4 border-t-3 border-gray-200"
                  >
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4 text-neo-pink" />
                      {t('daily.canPlayYourself')}
                    </p>
                  </m.div>
                </m.div>
              )}

              {step === 'stats' && puzzleCode && (
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <CustomChallengeStats
                    puzzleCode={puzzleCode}
                    onClose={() => setStep('share')}
                  />
                </m.div>
              )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
