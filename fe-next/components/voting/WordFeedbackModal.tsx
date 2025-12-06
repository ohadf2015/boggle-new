'use client';

import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaThumbsUp, FaThumbsDown, FaTimes, FaBook, FaCheckCircle } from 'react-icons/fa';
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
 * Vote info for showing progress toward validation
 */
interface VoteInfo {
  netScore?: number;
  totalVotes?: number;
  votesNeeded?: number;
  isValidForScoring?: boolean; // True if word has positive ratio (valid for scoring but not prominently validated)
  approvalCount?: number;
  disapprovalCount?: number;
  requiredApprovals?: number;
}

/**
 * Word data in the queue
 */
interface WordQueueItem {
  word: string;
  submittedBy: string;
  submitterAvatar?: AvatarData;
  voteInfo?: VoteInfo;
}

/**
 * WordFeedbackModal Props
 */
interface WordFeedbackModalProps {
  isOpen: boolean;
  word: string;
  submittedBy: string;
  submitterAvatar?: AvatarData;
  voteInfo?: VoteInfo;
  wordQueue?: WordQueueItem[];
  timeoutSeconds?: number;
  onVote: (voteType: 'like' | 'dislike', word?: string) => void;
  onSkip: () => void;
  onTimeout: () => void;
}

/**
 * Witty sentences about the word being validated
 * Makes voting fun with humorous commentary
 */
const getWittySentences = (t: (key: string, params?: Record<string, string>) => string, word: string, player: string) => [
  t('wordFeedback.witty1', { player, word }) || `${player} claims "${word}" is totally a word...`,
  t('wordFeedback.witty2', { player, word }) || 'Real word or creative genius? You decide!',
  t('wordFeedback.witty3', { player, word }) || `${player} found "${word}" in their brain dictionary`,
  t('wordFeedback.witty4', { player, word }) || `Webster called, they want to know about "${word}"`,
  t('wordFeedback.witty5', { player, word }) || 'Sounds legit... or does it?',
  t('wordFeedback.witty6', { player, word }) || `Is "${word}" a stroke of genius or madness?`,
  t('wordFeedback.witty7', { player, word }) || `${player} swears this is a real word!`,
  t('wordFeedback.witty8', { player, word }) || `The dictionary committee awaits your verdict on "${word}"`,
];

/**
 * WordFeedbackModal - Neo-Brutalist styled modal for crowd-sourced word validation
 * SELF-HEALING: Now focuses on dictionary building instead of judging players
 * Shows multiple words in sequence and displays progress toward validation
 */
const WordFeedbackModal = memo<WordFeedbackModalProps>(({
  isOpen,
  word,
  submittedBy,
  submitterAvatar,
  voteInfo,
  wordQueue = [],
  timeoutSeconds = 10,
  onVote,
  onSkip,
  onTimeout
}) => {
  const { t, dir } = useLanguage();
  const [remainingTime, setRemainingTime] = useState(timeoutSeconds);
  const [hasVoted, setHasVoted] = useState(false);
  const [encouragementSentence, setEncouragementSentence] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [votedWords, setVotedWords] = useState<Set<string>>(new Set());
  const prevWordRef = useRef<string | null>(null);

  // Get current word from queue or fall back to single word prop
  const currentWord = wordQueue.length > 0 ? wordQueue[currentWordIndex] : { word, submittedBy, submitterAvatar, voteInfo };
  const totalWords = wordQueue.length > 0 ? wordQueue.length : 1;
  const hasMoreWords = currentWordIndex < totalWords - 1;

  // Select random witty sentence when modal opens or word changes
  useEffect(() => {
    if (isOpen && currentWord.word !== prevWordRef.current) {
      prevWordRef.current = currentWord.word;
      const sentences = getWittySentences(t, currentWord.word, currentWord.submittedBy);
      const validSentences = sentences.filter(s => s && !s.startsWith('wordFeedback.'));
      if (validSentences.length > 0) {
        const randomIndex = Math.floor(Math.random() * validSentences.length);
        setEncouragementSentence(validSentences[randomIndex]);
      } else {
        setEncouragementSentence(`${currentWord.submittedBy} claims "${currentWord.word}" is totally a word...`);
      }
      setRemainingTime(timeoutSeconds);
      setHasVoted(false);
    }
    if (!isOpen) {
      prevWordRef.current = null;
      setCurrentWordIndex(0);
      setVotedWords(new Set());
    }
  }, [isOpen, currentWord.word, currentWord.submittedBy, timeoutSeconds, t]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || hasVoted) return;

    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Move to next word or close
          if (hasMoreWords) {
            setCurrentWordIndex(p => p + 1);
            setHasVoted(false);
            return timeoutSeconds;
          } else {
            onTimeout();
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, hasVoted, onTimeout, hasMoreWords, timeoutSeconds]);

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

  // Move to next word or close modal
  const moveToNextWord = useCallback(() => {
    if (hasMoreWords) {
      setCurrentWordIndex(prev => prev + 1);
      setHasVoted(false);
      setRemainingTime(timeoutSeconds);
    } else {
      onSkip();
    }
  }, [hasMoreWords, onSkip, timeoutSeconds]);

  const handleVote = useCallback((voteType: 'like' | 'dislike') => {
    if (hasVoted) return;
    setHasVoted(true);
    setVotedWords(prev => new Set(prev).add(currentWord.word));
    onVote(voteType, currentWord.word);

    // After a brief delay showing "Thanks!", move to next word
    setTimeout(() => {
      moveToNextWord();
    }, 800);
  }, [hasVoted, onVote, currentWord.word, moveToNextWord]);

  // Handle timeout - move to next word instead of closing
  const handleTimeout = useCallback(() => {
    if (hasMoreWords) {
      moveToNextWord();
    } else {
      onTimeout();
    }
  }, [hasMoreWords, moveToNextWord, onTimeout]);

  // Timer bar width percentage
  const timerProgress = (remainingTime / timeoutSeconds) * 100;

  // Timer bar color based on remaining time
  const getTimerColor = () => {
    if (remainingTime <= 3) return 'bg-neo-red';
    if (remainingTime <= 6) return 'bg-neo-pink';
    return 'bg-neo-cyan';
  };

  if (!isOpen) return null;

  // Get vote info for current word
  // Words need 10 points to be prominently valid (added to dictionary)
  const PROMINENT_THRESHOLD = 10;
  const wordVoteInfo = currentWord.voteInfo;
  const votesNeeded = wordVoteInfo?.votesNeeded ?? PROMINENT_THRESHOLD;
  const progressPercent = wordVoteInfo ? Math.min(100, ((PROMINENT_THRESHOLD - votesNeeded) / PROMINENT_THRESHOLD) * 100) : 0;
  const isValidForScoring = wordVoteInfo?.isValidForScoring || false;

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
          key={currentWord.word}
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
          {/* Header - Dictionary Building Focus */}
          <div className="
            bg-neo-purple
            border-b-4 border-neo-black
            px-4 py-3
            flex items-center justify-between
          ">
            <h2 className="text-xl font-black uppercase tracking-tight text-neo-cream flex items-center gap-2">
              <FaBook className="text-neo-yellow" />
              {t('wordFeedback.dictionaryTitle') || 'Build Our Dictionary'}
            </h2>
            <div className="flex items-center gap-2">
              {/* Word counter for multi-word queue */}
              {totalWords > 1 && (
                <span className="text-neo-cream/80 text-sm font-bold">
                  {currentWordIndex + 1}/{totalWords}
                </span>
              )}
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
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Encouragement - Dictionary focused */}
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-neo-purple font-bold text-sm"
            >
              {encouragementSentence}
            </motion.p>

            {/* Question */}
            <p className="text-center text-neo-black font-bold text-lg">
              {t('wordFeedback.question') || 'Is this a real word?'}
            </p>

            {/* Submitter Info - Shows who found this word */}
            {currentWord.submittedBy && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-center gap-2 text-neo-black/70"
              >
                {currentWord.submitterAvatar && (
                  <Avatar
                    avatarEmoji={currentWord.submitterAvatar.emoji}
                    avatarColor={currentWord.submitterAvatar.color}
                    profilePictureUrl={currentWord.submitterAvatar.profilePictureUrl}
                    size="sm"
                  />
                )}
                <span className="text-sm font-semibold">
                  {t('wordFeedback.submittedBy') || 'Submitted by'}: <span className="font-bold text-neo-purple">{currentWord.submittedBy}</span>
                </span>
              </motion.div>
            )}

            {/* Word Card - Cleaner, focused on the word */}
            <motion.div
              key={currentWord.word}
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
              <p className="text-4xl font-black uppercase tracking-wide text-neo-black">
                {currentWord.word}
              </p>

              {/* Vote Progress Bar - Shows how close word is to being approved */}
              {wordVoteInfo && (
                <div className="mt-4 space-y-1">
                  <div className="h-2 bg-neo-black/20 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${isValidForScoring ? 'bg-neo-cyan' : 'bg-neo-lime'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-xs font-semibold text-neo-black/70">
                    {isValidForScoring ? (
                      <>
                        <FaCheckCircle className="inline mr-1 text-neo-cyan" />
                        {t('wordFeedback.validForScoring') || 'Counts as valid! Help add it to dictionary.'}
                        {votesNeeded > 0 && (
                          <span className="text-neo-black/50 ml-1">
                            ({votesNeeded} {t('wordFeedback.moreForDictionary') || 'more for dictionary'})
                          </span>
                        )}
                      </>
                    ) : votesNeeded > 0 ? (
                      <>
                        <FaCheckCircle className="inline mr-1 text-neo-lime" />
                        {t('wordFeedback.votesNeeded', { count: String(votesNeeded) }) || `${votesNeeded} more votes to approve`}
                      </>
                    ) : (
                      <>
                        <FaCheckCircle className="inline mr-1 text-neo-lime" />
                        {t('wordFeedback.almostApproved') || 'Almost approved!'}
                      </>
                    )}
                  </p>
                </div>
              )}
            </motion.div>

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
                  <span>{t('wordFeedback.notAWord') || 'Not a word'}</span>
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
                  <span>{t('wordFeedback.realWord') || 'Real word!'}</span>
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-center py-4"
              >
                <span className="text-2xl font-black text-neo-purple flex items-center justify-center gap-2">
                  <FaCheckCircle className="text-neo-lime" />
                  {hasMoreWords
                    ? (t('wordFeedback.nextWord') || 'Next word...')
                    : (t('wordFeedback.thankYou') || 'Thanks for helping!')
                  }
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
