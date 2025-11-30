'use client';

import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaThumbsUp, FaThumbsDown, FaTimes } from 'react-icons/fa';
import Avatar from '../Avatar';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Avatar data interface
 */
interface AvatarData {
  emoji?: string;
  color?: string;
  profilePictureUrl?: string;
}

/**
 * WordFeedbackModal Props
 */
interface WordFeedbackModalProps {
  isOpen: boolean;
  word: string;
  submittedBy: string;
  submitterAvatar?: AvatarData;
  timeoutSeconds?: number;
  onVote: (voteType: 'like' | 'dislike') => void;
  onSkip: () => void;
  onTimeout: () => void;
}

/**
 * Witty sentences for the modal - will be selected randomly
 */
const getWittySentences = (t: (key: string, params?: Record<string, string>) => string) => [
  t('wordFeedback.witty1'),
  t('wordFeedback.witty2'),
  t('wordFeedback.witty3'),
  t('wordFeedback.witty4'),
  t('wordFeedback.witty5'),
];

/**
 * WordFeedbackModal - Neo-Brutalist styled modal for crowd-sourced word validation
 * Shows one non-dictionary word and asks players to vote if it's a real word
 */
const WordFeedbackModal = memo<WordFeedbackModalProps>(({
  isOpen,
  word,
  submittedBy,
  submitterAvatar,
  timeoutSeconds = 10,
  onVote,
  onSkip,
  onTimeout
}) => {
  const { t, dir } = useLanguage();
  const [remainingTime, setRemainingTime] = useState(timeoutSeconds);
  const [hasVoted, setHasVoted] = useState(false);
  const [wittySentence, setWittySentence] = useState('');
  const prevWordRef = useRef<string | null>(null);

  // Select random witty sentence when modal opens with a new word
  useEffect(() => {
    if (isOpen && word !== prevWordRef.current) {
      prevWordRef.current = word;
      const sentences = getWittySentences(t);
      const validSentences = sentences.filter(s => s && s !== 'wordFeedback.witty1');
      if (validSentences.length > 0) {
        const randomIndex = Math.floor(Math.random() * validSentences.length);
        setWittySentence(validSentences[randomIndex]);
      } else {
        // Fallback if translations aren't loaded
        setWittySentence(`${submittedBy} claims "${word}" is totally a word...`);
      }
      setRemainingTime(timeoutSeconds);
      setHasVoted(false);
    }
    if (!isOpen) {
      prevWordRef.current = null;
    }
  }, [isOpen, word, submittedBy, timeoutSeconds, t]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || hasVoted) return;

    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, hasVoted, onTimeout]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !hasVoted) {
        onSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasVoted, onSkip]);

  const handleVote = useCallback((voteType: 'like' | 'dislike') => {
    if (hasVoted) return;
    setHasVoted(true);
    onVote(voteType);
  }, [hasVoted, onVote]);

  // Timer bar width percentage
  const timerProgress = (remainingTime / timeoutSeconds) * 100;

  // Timer bar color based on remaining time
  const getTimerColor = () => {
    if (remainingTime <= 3) return 'bg-neo-red';
    if (remainingTime <= 6) return 'bg-neo-pink';
    return 'bg-neo-cyan';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        dir={dir}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-neo-black/60"
          onClick={onSkip}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotate: -1 }}
          exit={{ opacity: 0, scale: 0.9, y: -30, rotate: 3 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20
          }}
          className="
            relative w-full max-w-md
            bg-neo-cream
            border-4 border-neo-black
            rounded-neo-lg
            shadow-hard-xl
            overflow-hidden
          "
        >
          {/* Header */}
          <div className="
            bg-neo-purple
            border-b-4 border-neo-black
            px-4 py-3
            flex items-center justify-between
          ">
            <h2 className="text-xl font-black uppercase tracking-tight text-neo-cream flex items-center gap-2">
              <span>⚖️</span>
              {t('wordFeedback.title') || 'Word Jury Duty'}
            </h2>
            <button
              onClick={onSkip}
              className="
                text-neo-cream hover:text-neo-yellow
                transition-colors p-1
              "
              aria-label="Close"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Question */}
            <p className="text-center text-neo-black font-bold text-lg">
              {t('wordFeedback.question') || 'Is this a real word?'}
            </p>

            {/* Word Card */}
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
              className="
                bg-neo-yellow
                border-3 border-neo-black
                rounded-neo-lg
                shadow-hard-lg
                p-6
                text-center
              "
              style={{ transform: 'rotate(1deg)' }}
            >
              <p className="text-4xl font-black uppercase tracking-wide text-neo-black mb-4">
                {word}
              </p>
              <div className="flex items-center justify-center gap-2">
                <Avatar
                  profilePictureUrl={submitterAvatar?.profilePictureUrl}
                  avatarEmoji={submitterAvatar?.emoji || '🎮'}
                  avatarColor={submitterAvatar?.color || '#4ECDC4'}
                  size="sm"
                />
                <span className="text-sm font-semibold text-neo-black/80">
                  {t('wordFeedback.submittedBy') || 'Submitted by'} @{submittedBy}
                </span>
              </div>
            </motion.div>

            {/* Witty Sentence */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center text-neo-black/70 italic text-sm px-4"
            >
              &ldquo;{wittySentence.replace('{player}', submittedBy).replace('{word}', word)}&rdquo;
            </motion.p>

            {/* Voting Buttons */}
            {!hasVoted ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex gap-4 justify-center"
              >
                {/* Thumbs Down */}
                <button
                  onClick={() => handleVote('dislike')}
                  className="
                    flex-1 max-w-32
                    bg-neo-red text-neo-cream
                    border-3 border-neo-black
                    rounded-neo-lg
                    shadow-hard
                    px-4 py-3
                    font-bold uppercase text-sm
                    flex flex-col items-center gap-2
                    hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg
                    active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm
                    transition-all duration-150
                  "
                >
                  <FaThumbsDown size={24} />
                  <span>{t('wordFeedback.thumbsDown') || 'Nope'}</span>
                </button>

                {/* Thumbs Up */}
                <button
                  onClick={() => handleVote('like')}
                  className="
                    flex-1 max-w-32
                    bg-neo-lime text-neo-black
                    border-3 border-neo-black
                    rounded-neo-lg
                    shadow-hard
                    px-4 py-3
                    font-bold uppercase text-sm
                    flex flex-col items-center gap-2
                    hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg
                    active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm
                    transition-all duration-150
                  "
                >
                  <FaThumbsUp size={24} />
                  <span>{t('wordFeedback.thumbsUp') || 'Legit!'}</span>
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-center py-4"
              >
                <span className="text-2xl font-black text-neo-purple">
                  ✓ {t('wordFeedback.thankYou') || 'Thanks for voting!'}
                </span>
              </motion.div>
            )}

            {/* Timer Bar */}
            <div className="space-y-2">
              <div className="
                h-2
                bg-neo-black/10
                border-2 border-neo-black
                rounded-neo
                overflow-hidden
              ">
                <motion.div
                  className={`h-full ${getTimerColor()} transition-colors duration-300`}
                  initial={{ width: '100%' }}
                  animate={{ width: `${timerProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center text-xs text-neo-black/60">
                <span>
                  {t('wordFeedback.skipHint') || 'Press ESC to skip'}
                </span>
                <span className="font-mono font-bold">
                  {remainingTime}s
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

WordFeedbackModal.displayName = 'WordFeedbackModal';

export default WordFeedbackModal;
