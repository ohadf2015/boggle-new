import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * AI Validation Progress Component
 * Shows a convincing "behind the scenes" animation while AI validates words
 * Features: Cycling validation stages, word display, progress simulation
 */
const AIValidationProgress = ({ foundWords = [], t }) => {
  // Stage of the validation process
  const [stage, setStage] = useState(0);
  // Current word being "validated"
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  // Simulated progress percentage
  const [progress, setProgress] = useState(0);

  // Validation stages with messages
  const validationStages = useMemo(() => [
    { key: 'scanning', icon: '🔍', fallback: 'Scanning words...' },
    { key: 'checking', icon: '📚', fallback: 'Checking dictionary...' },
    { key: 'verifying', icon: '🤖', fallback: 'AI verifying...' },
    { key: 'scoring', icon: '⚡', fallback: 'Calculating scores...' },
    { key: 'finalizing', icon: '✨', fallback: 'Finalizing results...' },
  ], []);

  // Get safe words list (extract word string from object if needed)
  const words = useMemo(() => {
    if (!foundWords || foundWords.length === 0) return [];
    return foundWords.slice(0, 15).map(w => typeof w === 'string' ? w : w.word).filter(Boolean);
  }, [foundWords]);

  // Cycle through validation stages
  useEffect(() => {
    const stageInterval = setInterval(() => {
      setStage(prev => (prev + 1) % validationStages.length);
    }, 3500);

    return () => clearInterval(stageInterval);
  }, [validationStages.length]);

  // Cycle through words being validated
  useEffect(() => {
    if (words.length === 0) return;

    const wordInterval = setInterval(() => {
      setCurrentWordIndex(prev => (prev + 1) % words.length);
    }, 800);

    return () => clearInterval(wordInterval);
  }, [words.length]);

  // Simulate progress
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return 30 + Math.random() * 30; // Reset to keep it moving
        return Math.min(95, prev + Math.random() * 15);
      });
    }, 600);

    return () => clearInterval(progressInterval);
  }, []);

  const currentStage = validationStages[stage];
  const currentWord = words[currentWordIndex];

  return (
    <div className="space-y-4">
      {/* Main validation message */}
      <div className="bg-neo-black text-neo-white px-6 py-4 font-black uppercase text-2xl md:text-3xl tracking-wider shadow-hard border-4 border-neo-black">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center gap-3"
          >
            <span>{currentStage.icon}</span>
            <span>{t(`playerView.validation.${currentStage.key}`) || currentStage.fallback}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="relative h-4 bg-neo-cream border-3 border-neo-black overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-neo-cyan"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* Animated stripes */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)',
            animation: 'stripe-move 1s linear infinite',
          }}
        />
      </div>

      {/* Current word being validated */}
      {currentWord && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-neo-black font-bold text-sm uppercase tracking-wide">
            {t('playerView.validatingWord') || 'Checking:'}
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={currentWord}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="bg-neo-purple text-neo-white px-3 py-1 font-black text-lg uppercase border-3 border-neo-black shadow-hard-sm"
            >
              {currentWord}
            </motion.span>
          </AnimatePresence>
        </div>
      )}

      {/* Processing indicators */}
      <div className="flex gap-3 justify-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
              borderRadius: ['0%', '50%', '0%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
            className="w-4 h-4 bg-neo-black border-2 border-neo-black"
          />
        ))}
      </div>

      {/* Add CSS for stripe animation */}
      <style jsx>{`
        @keyframes stripe-move {
          0% { background-position: 0 0; }
          100% { background-position: 40px 0; }
        }
      `}</style>
    </div>
  );
};

export default AIValidationProgress;
