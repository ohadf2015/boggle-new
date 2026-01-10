'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Share2, Crown, Grid3X3, Grid2X2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateRandomTable } from '@/utils/utils';
import { buildPuzzleShareUrl } from '@/utils/customPuzzle';
import type { Language } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { getGuestFingerprint } from '@/utils/dailyChallenge';
import { neoSuccessToast, neoErrorToast } from '@/components/NeoToast';

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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-neo-cream border-4 border-neo-black rounded-neo shadow-hard-lg z-[101] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b-4 border-neo-black bg-neo-purple text-neo-white">
              <div className="flex items-center gap-2">
                <Crown className="w-6 h-6" />
                <h2 className="font-black text-xl uppercase tracking-tight">Create Challenge</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-neo-black/20 rounded transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {step === 'config' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-lg font-bold mb-4">Choose Board Size</p>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setBoardSize(5)}
                        className={`p-4 rounded-neo border-3 transition-all flex flex-col items-center gap-2 ${
                          boardSize === 5
                            ? 'bg-neo-blue text-neo-white border-neo-black shadow-hard-sm'
                            : 'bg-white border-gray-300 hover:border-neo-blue text-gray-400 hover:text-neo-blue'
                        }`}
                      >
                        <Grid2X2 className="w-8 h-8" />
                        <span className="font-black text-xl">5x5</span>
                      </button>

                      <button
                        onClick={() => setBoardSize(7)}
                        className={`p-4 rounded-neo border-3 transition-all flex flex-col items-center gap-2 ${
                          boardSize === 7
                            ? 'bg-neo-blue text-neo-white border-neo-black shadow-hard-sm'
                            : 'bg-white border-gray-300 hover:border-neo-blue text-gray-400 hover:text-neo-blue'
                        }`}
                      >
                        <Grid3X3 className="w-8 h-8" />
                        <span className="font-black text-xl">7x7</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-amber-100 border-2 border-amber-300 rounded-lg p-3 text-sm text-center text-amber-900">
                    A unique {boardSize}x{boardSize} board will be generated using {language === 'en' ? 'English' : language === 'he' ? 'Hebrew' : language.toUpperCase()} dictionary.
                  </div>

                  <Button
                    onClick={handleCreate}
                    className="w-full h-12 text-lg font-black bg-neo-green hover:bg-neo-green-light text-neo-black border-3 border-neo-black shadow-hard rounded-neo"
                  >
                    Generate Challenge
                  </Button>
                </div>
              )}

              {step === 'loading' && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 className="w-12 h-12 text-neo-blue" />
                  </motion.div>
                  <p className="font-bold text-gray-500">Generating unique puzzle...</p>
                </div>
              )}

              {step === 'share' && (
                <div className="space-y-6 text-center">
                  <div className="w-16 h-16 bg-neo-green rounded-full border-3 border-neo-black flex items-center justify-center mx-auto shadow-hard-sm">
                    <Check className="w-8 h-8 text-neo-black" strokeWidth={4} />
                  </div>
                  
                  <div>
                    <h3 className="font-black text-2xl mb-1">Challenge Created!</h3>
                    <p className="text-gray-600">Share this link with friends to challenge them.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 border-2 border-gray-300 rounded-lg px-3 py-2 text-sm font-mono truncate text-gray-600">
                      {shareUrl}
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleCopy}
                      className={`shrink-0 border-2 rounded-lg transition-colors ${
                        copied ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-gray-300'
                      }`}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={handleNativeShare}
                      className="w-full h-12 text-lg font-bold bg-neo-blue hover:bg-neo-blue-light text-neo-white border-3 border-neo-black shadow-hard rounded-neo gap-2"
                    >
                      <Share2 className="w-5 h-5" />
                      Share Challenge
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={handleClose}
                      className="text-gray-500 hover:text-gray-900"
                    >
                      Close
                    </Button>
                  </div>
                  
                  <div className="text-xs text-gray-400 pt-2 border-t border-gray-200">
                     You can play this challenge yourself too if you follow the link!
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
