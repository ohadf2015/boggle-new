'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Share2, Crown, Grid3X3, Grid2X2, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateRandomTable } from '@/utils/utils';
import { buildPuzzleShareUrl } from '@/utils/customPuzzle';
import type { Language } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { getGuestFingerprint } from '@/utils/dailyChallenge';
import { neoSuccessToast, neoErrorToast } from '@/components/NeoToast';
import { useLanguage } from '@/contexts/LanguageContext';

interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const CreateChallengeModal: React.FC<CreateChallengeModalProps> = ({ isOpen, onClose, language }) => {
  const [step, setStep] = useState<'config' | 'loading' | 'share'>('config');
  const [boardSize, setBoardSize] = useState<number>(5);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [shareCode, setShareCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const { profile, user } = useAuth();
  const { t } = useLanguage();

  const handleCreate = async () => {
    setStep('loading');
    try {
      // 1. Get random target word
      // Adjust lengths based on board size
      const minLen = boardSize === 5 ? 5 : 6;
      const maxLen = boardSize === 5 ? 8 : 10;
      
      const wordRes = await fetch(`/api/drills/random-words?count=1&minLength=${minLen}&maxLength=${maxLen}&language=${language}`);
      const wordData = await wordRes.json();
      
      if (!wordData.words || wordData.words.length === 0) {
        throw new Error('Failed to get target word');
      }
      
      const targetWord = wordData.words[0].toUpperCase();

      // 2. Generate grid with embedded word
      const grid = generateRandomTable(boardSize, boardSize, language, [targetWord]);

      // 3. Create puzzle on server
      const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Player';
      const guestFingerprint = !user ? await getGuestFingerprint() : undefined;

      const createRes = await fetch('/api/custom-puzzle/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language,
          targetWord,
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
      setShareCode(createData.puzzleCode);
      setStep('share');

    } catch (error) {
      console.error('Error creating challenge:', error);
      neoErrorToast('Failed to create challenge. Please try again.');
      setStep('config');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    neoSuccessToast('Link copied to clipboard!');
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
        console.error('Error sharing:', err);
      }
    } else {
      handleCopy();
    }
  };

  const reset = () => {
    setStep('config');
    setShareUrl('');
    setShareCode('');
  };

  const handleClose = () => {
    onClose();
    // Reset state after animation completes
    setTimeout(reset, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg max-h-[90vh] bg-neo-white border-neo-thick border-neo-black rounded-xl shadow-hard-lg z-[101] overflow-hidden"
          >
            {/* Header */}
            <div className="relative flex items-center justify-between p-4 sm:p-5 border-b-neo-thick border-neo-black bg-gradient-to-br from-neo-yellow to-neo-orange sticky top-0 z-10">
              <motion.div
                className="flex items-center gap-3"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="relative">
                  <Crown className="w-7 h-7 sm:w-8 sm:h-8 text-neo-black drop-shadow-sm" strokeWidth={2.5} />
                  <motion.div
                    className="absolute -top-1 -right-1"
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Sparkles className="w-4 h-4 text-neo-pink" fill="currentColor" />
                  </motion.div>
                </div>
                <h2 className="font-black text-xl sm:text-2xl uppercase tracking-tight text-neo-black drop-shadow-sm">
                  {t('daily.createChallengeTitle')}
                </h2>
              </motion.div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-neo-black/10 rounded-lg transition-all hover:scale-110 active:scale-95"
              >
                <X className="w-6 h-6 sm:w-7 sm:h-7 text-neo-black" strokeWidth={2.5} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-8 overflow-y-auto max-h-[calc(90vh-80px)]">
              {step === 'config' && (
                <motion.div
                  className="space-y-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {/* Board Size Selection */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg sm:text-xl font-black mb-2 text-neo-black uppercase tracking-tight">
                        {t('daily.chooseBoardSize')}
                      </h3>
                      <p className="text-sm text-gray-600">Pick your difficulty level</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <motion.button
                        onClick={() => setBoardSize(5)}
                        whileHover={{ scale: 1.05, y: -4 }}
                        whileTap={{ scale: 0.95, y: 0 }}
                        className={`relative p-5 sm:p-6 rounded-xl border-neo-thick transition-all flex flex-col items-center gap-3 ${
                          boardSize === 5
                            ? 'bg-neo-cyan text-neo-white border-neo-black shadow-hard-lg'
                            : 'bg-neo-white border-neo-black/30 hover:border-neo-cyan shadow-hard-sm hover:shadow-hard'
                        }`}
                      >
                        <div className={`p-3 rounded-lg ${boardSize === 5 ? 'bg-neo-white/20' : 'bg-neo-cyan/10'}`}>
                          <Grid2X2 className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={2.5} />
                        </div>
                        <div className="text-center">
                          <span className="font-black text-2xl sm:text-3xl block">5×5</span>
                          <span className="text-xs sm:text-sm font-bold uppercase tracking-wide">Classic</span>
                        </div>
                        {boardSize === 5 && (
                          <motion.div
                            className="absolute -top-2 -right-2"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1, rotate: 360 }}
                            transition={{ type: 'spring', bounce: 0.6 }}
                          >
                            <div className="bg-neo-pink border-3 border-neo-black rounded-full p-1 shadow-hard-sm">
                              <Check className="w-4 h-4 text-neo-white" strokeWidth={3} />
                            </div>
                          </motion.div>
                        )}
                      </motion.button>

                      <motion.button
                        onClick={() => setBoardSize(7)}
                        whileHover={{ scale: 1.05, y: -4 }}
                        whileTap={{ scale: 0.95, y: 0 }}
                        className={`relative p-5 sm:p-6 rounded-xl border-neo-thick transition-all flex flex-col items-center gap-3 ${
                          boardSize === 7
                            ? 'bg-neo-orange text-neo-white border-neo-black shadow-hard-lg'
                            : 'bg-neo-white border-neo-black/30 hover:border-neo-orange shadow-hard-sm hover:shadow-hard'
                        }`}
                      >
                        <div className={`p-3 rounded-lg ${boardSize === 7 ? 'bg-neo-white/20' : 'bg-neo-orange/10'}`}>
                          <Grid3X3 className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={2.5} />
                        </div>
                        <div className="text-center">
                          <span className="font-black text-2xl sm:text-3xl block">7×7</span>
                          <span className="text-xs sm:text-sm font-bold uppercase tracking-wide">Pro</span>
                        </div>
                        {boardSize === 7 && (
                          <motion.div
                            className="absolute -top-2 -right-2"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1, rotate: 360 }}
                            transition={{ type: 'spring', bounce: 0.6 }}
                          >
                            <div className="bg-neo-pink border-3 border-neo-black rounded-full p-1 shadow-hard-sm">
                              <Check className="w-4 h-4 text-neo-white" strokeWidth={3} />
                            </div>
                          </motion.div>
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Info Banner */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-neo-yellow/20 to-neo-orange/20 border-3 border-neo-black rounded-xl p-4 text-center"
                  >
                    <p className="text-sm sm:text-base font-bold text-neo-black">
                      {t('daily.boardWillBeGenerated', {
                        size: boardSize,
                        language: language === 'en' ? 'English' : language === 'he' ? 'Hebrew' : language === 'sv' ? 'Swedish' : 'Japanese'
                      })}
                    </p>
                  </motion.div>

                  {/* Generate Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Button
                      onClick={handleCreate}
                      className="relative w-full h-14 sm:h-16 text-lg sm:text-xl font-black bg-gradient-to-br from-neo-pink to-neo-pink/80 hover:from-neo-pink/90 hover:to-neo-pink/70 text-neo-white border-neo-thick border-neo-black shadow-hard-lg hover:shadow-hard-xl hover:-translate-y-1 active:translate-y-0 active:shadow-hard-sm rounded-xl transition-all uppercase tracking-wide overflow-hidden group"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        <Zap className="w-6 h-6" strokeWidth={2.5} fill="currentColor" />
                        {t('daily.generateChallenge')}
                      </span>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                      />
                    </Button>
                  </motion.div>
                </motion.div>
              )}

              {step === 'loading' && (
                <motion.div
                  className="flex flex-col items-center justify-center py-12 sm:py-16 space-y-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {/* Animated Loader */}
                  <div className="relative">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="relative"
                    >
                      <div className="w-20 h-20 sm:w-24 sm:h-24 border-neo-thick border-neo-pink rounded-full border-t-transparent" />
                    </motion.div>
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-neo-orange" strokeWidth={2.5} />
                    </motion.div>
                  </div>

                  {/* Loading Text */}
                  <div className="text-center space-y-2">
                    <motion.p
                      className="text-lg sm:text-xl font-black text-neo-black uppercase tracking-wide"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {t('daily.generatingPuzzle')}
                    </motion.p>
                    <motion.div
                      className="flex gap-1 justify-center"
                      initial="hidden"
                      animate="visible"
                    >
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
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
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {step === 'share' && (
                <motion.div
                  className="space-y-6 text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.4 }}
                >
                  {/* Success Icon with Animation */}
                  <div className="relative">
                    <motion.div
                      className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-neo-green to-emerald-400 rounded-full border-neo-thick border-neo-black flex items-center justify-center mx-auto shadow-hard-lg"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', bounce: 0.6, duration: 0.8 }}
                    >
                      <Check className="w-10 h-10 sm:w-12 sm:h-12 text-neo-white" strokeWidth={4} />
                    </motion.div>

                    {/* Confetti particles */}
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute top-1/2 left-1/2"
                        initial={{ scale: 0, x: 0, y: 0 }}
                        animate={{
                          scale: [0, 1, 0],
                          x: [0, (Math.cos((i * Math.PI) / 4) * 60)],
                          y: [0, (Math.sin((i * Math.PI) / 4) * 60)],
                        }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      >
                        <Sparkles
                          className={`w-4 h-4 ${
                            i % 3 === 0 ? 'text-neo-yellow' : i % 3 === 1 ? 'text-neo-pink' : 'text-neo-cyan'
                          }`}
                          fill="currentColor"
                        />
                      </motion.div>
                    ))}
                  </div>

                  {/* Success Message */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="font-black text-2xl sm:text-3xl mb-2 text-neo-black uppercase tracking-tight">
                      {t('daily.challengeCreated')}
                    </h3>
                    <p className="text-base text-gray-700 font-medium">{t('daily.challengeCreatedDesc')}</p>
                  </motion.div>

                  {/* Share URL Box */}
                  <motion.div
                    className="flex items-center gap-2 bg-neo-cream border-3 border-neo-black rounded-xl p-3 shadow-hard-sm"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs text-gray-500 font-bold uppercase mb-1">Your Challenge Link</p>
                      <p className="text-sm font-mono truncate text-neo-black font-bold">{shareUrl}</p>
                    </div>
                    <motion.button
                      onClick={handleCopy}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`shrink-0 p-3 rounded-lg border-3 border-neo-black transition-all ${
                        copied
                          ? 'bg-neo-green text-neo-white shadow-hard-sm'
                          : 'bg-neo-white hover:bg-neo-yellow shadow-hard-sm hover:shadow-hard'
                      }`}
                    >
                      {copied ? (
                        <Check className="w-5 h-5" strokeWidth={3} />
                      ) : (
                        <Copy className="w-5 h-5" strokeWidth={2.5} />
                      )}
                    </motion.button>
                  </motion.div>

                  {/* Share Button */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-3"
                  >
                    <Button
                      onClick={handleNativeShare}
                      className="w-full h-14 sm:h-16 text-lg sm:text-xl font-black bg-gradient-to-br from-neo-cyan to-blue-500 hover:from-neo-cyan/90 hover:to-blue-500/90 text-neo-white border-neo-thick border-neo-black shadow-hard-lg hover:shadow-hard-xl hover:-translate-y-1 active:translate-y-0 active:shadow-hard-sm rounded-xl transition-all uppercase tracking-wide"
                    >
                      <Share2 className="w-6 h-6 mr-2" strokeWidth={2.5} />
                      {t('daily.shareChallenge')}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={handleClose}
                      className="w-full text-base font-bold text-gray-600 hover:text-neo-black hover:bg-gray-100 rounded-lg py-3"
                    >
                      {t('daily.close')}
                    </Button>
                  </motion.div>

                  {/* Footer Hint */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="pt-4 border-t-3 border-gray-200"
                  >
                    <p className="text-sm text-gray-500 font-medium flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4 text-neo-orange" />
                      {t('daily.canPlayYourself')}
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
