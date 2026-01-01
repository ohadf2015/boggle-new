'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface FoundWord {
  word: string;
  isValid?: boolean | null;
  score?: number;
  duplicate?: boolean;
  timestamp?: number;
}

interface ValidationStage {
  key: string;
  icon: string;
}

interface ValidationModalProps {
  isOpen: boolean;
  t: (path: string, params?: Record<string, string | number>) => string;
  foundWords?: FoundWord[] | string[];
}

/**
 * ValidationModal - Shows AI validation progress as a modal overlay
 * Displays cycling validation stages with animated progress
 */
const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  t,
  foundWords = [],
}) => {
  const [stage, setStage] = useState<number>(0);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);

  // Validation stages with messages
  const validationStages = useMemo<ValidationStage[]>(() => [
    { key: 'scanning', icon: '🔍' },
    { key: 'checking', icon: '📚' },
    { key: 'verifying', icon: '🤖' },
    { key: 'scoring', icon: '⚡' },
    { key: 'finalizing', icon: '✨' },
  ], []);

  // Get safe words list (extract word string from object if needed)
  const words = useMemo<string[]>(() => {
    if (!foundWords || foundWords.length === 0) return [];
    return foundWords.slice(0, 15).map(w => typeof w === 'string' ? w : (w as FoundWord).word).filter(Boolean);
  }, [foundWords]);

  // Cycle through validation stages
  useEffect(() => {
    if (!isOpen) return;
    const stageInterval = setInterval(() => {
      setStage(prev => (prev + 1) % validationStages.length);
    }, 2000);
    return () => clearInterval(stageInterval);
  }, [isOpen, validationStages.length]);

  // Cycle through words being validated
  useEffect(() => {
    if (!isOpen || words.length === 0) return;
    const wordInterval = setInterval(() => {
      setCurrentWordIndex(prev => (prev + 1) % words.length);
    }, 800);
    return () => clearInterval(wordInterval);
  }, [isOpen, words.length]);

  // Simulate progress
  useEffect(() => {
    if (!isOpen) return;
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return 30 + Math.random() * 30;
        return Math.min(95, prev + Math.random() * 15);
      });
    }, 600);
    return () => clearInterval(progressInterval);
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStage(0);
      setCurrentWordIndex(0);
      setProgress(0);
    }
  }, [isOpen]);

  const currentStage = validationStages[stage] ?? validationStages[0]!;
  const currentWord = words[currentWordIndex];

  return (
    <Dialog open={isOpen} modal>
      <DialogContent
        className="bg-neo-yellow border-4 border-neo-black shadow-hard-lg p-0 max-w-sm sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        <DialogTitle className="sr-only">
          {t('playerView.calculatingScores') || 'Calculating Scores'}
        </DialogTitle>
        <div className="p-4 sm:p-6">
          {/* Brain/Processing Animation */}
          <div className="mb-4 flex items-center justify-center">
            <div className="inline-block bg-neo-pink text-white border-4 border-neo-black shadow-hard p-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={stage}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="text-3xl sm:text-4xl"
                >
                  {currentStage.icon}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Main status message */}
          <div className="bg-neo-black text-neo-white px-4 py-3 font-black uppercase text-base sm:text-lg tracking-wider shadow-hard border-4 border-neo-black mb-3 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={stage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                {t(`playerView.validation.${currentStage.key}`) || currentStage.key}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="relative h-3 bg-neo-cream text-neo-black border-3 border-neo-black overflow-hidden mb-3">
            <motion.div
              className="absolute inset-y-0 left-0 bg-neo-cyan"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)',
                animation: 'stripe-move 1s linear infinite',
              }}
            />
          </div>

          {/* Current word being validated */}
          {words.length > 0 && (
            <div className="flex items-center justify-center gap-2 h-[36px]">
              <span className="text-neo-black font-bold text-xs uppercase tracking-wide">
                {t('playerView.validatingWord') || 'Checking:'}
              </span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentWord}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="bg-neo-purple text-neo-cream px-2 py-1 font-black text-sm sm:text-base uppercase border-3 border-neo-black shadow-hard-sm"
                >
                  {currentWord}
                </motion.span>
              </AnimatePresence>
            </div>
          )}

          {/* Processing indicators */}
          <div className="flex gap-2 mt-3 justify-center">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: 'easeInOut',
                }}
                className="w-2.5 h-2.5 bg-neo-black rounded-full"
              />
            ))}
          </div>
        </div>

        {/* CSS for stripe animation */}
        <style jsx>{`
          @keyframes stripe-move {
            0% { background-position: 0 0; }
            100% { background-position: 40px 0; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};

export default ValidationModal;
