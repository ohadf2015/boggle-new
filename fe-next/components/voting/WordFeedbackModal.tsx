'use client';

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { m } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Book, CheckCircle, HelpCircle } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import Avatar from '../Avatar';
import { useLanguage } from '../../contexts/LanguageContext';
import { applyHebrewFinalLetters } from '../../utils/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';

/**
 * Avatar data interface
 */
interface AvatarData {
  emoji?: string;
  color?: string;

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
const getWittySentences = (t: (key: string, params?: Record<string, string>) => string, word: string, player: string) => {
  const displayWord = applyHebrewFinalLetters(word);
  return [
    t('wordFeedback.witty1', { player, word: displayWord }) || `Real word or bluff?`,
    t('wordFeedback.witty2', { player, word: displayWord }),
    t('wordFeedback.witty5', { player, word: displayWord }),
    t('wordFeedback.witty6', { player, word: displayWord }) || `Genius or madness?`,
    t('wordFeedback.witty7', { player, word: displayWord }) || `Legit or legend?`,
  ];
};

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
  const [_votedWords, setVotedWords] = useState<Set<string>>(new Set());
  const prevWordRef = useRef<string | null>(null);

  // Get current word from queue or fall back to single word prop
  const currentWord = (wordQueue.length > 0 ? wordQueue[currentWordIndex] : undefined) ?? { word, submittedBy, submitterAvatar, voteInfo };
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
        setEncouragementSentence(validSentences[randomIndex] ?? '');
      } else {
        setEncouragementSentence(`Real word or bluff?`);
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

  // Handle "I don't know" - skip without voting
  const handleDontKnow = useCallback(() => {
    if (hasVoted) return;
    moveToNextWord();
  }, [hasVoted, moveToNextWord]);

  // Timer bar width percentage
  const timerProgress = (remainingTime / timeoutSeconds) * 100;

  // Timer bar color based on remaining time
  const getTimerColor = () => {
    if (remainingTime <= 3) return 'bg-neo-red';
    if (remainingTime <= 6) return 'bg-neo-pink';
    return 'bg-neo-cyan';
  };

  // Get vote info for current word
  // Words need 6 points to be prominently valid (added to dictionary)
  // This matches the database is_potentially_valid threshold
  const PROMINENT_THRESHOLD = 6;
  const wordVoteInfo = currentWord.voteInfo;
  const votesNeeded = wordVoteInfo?.votesNeeded ?? PROMINENT_THRESHOLD;
  const progressPercent = wordVoteInfo ? Math.min(100, ((PROMINENT_THRESHOLD - votesNeeded) / PROMINENT_THRESHOLD) * 100) : 0;
  const isValidForScoring = wordVoteInfo?.isValidForScoring || false;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onSkip()}>
      <DialogContent
        noDescription
        className="bg-neo-cream border-4 border-neo-black max-w-md overflow-hidden"
        dir={dir}
      >
        <Reveal
          key={currentWord.word}
        >
          <DialogHeader
            variant="pink"
            className="flex-row items-center justify-between"
          >
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Book className="w-5 h-5 text-neo-yellow" />
              {t('wordFeedback.dictionaryTitle')}
            </DialogTitle>
            {/* Word counter for multi-word queue */}
            {totalWords > 1 && (
              <span className="text-neo-white text-sm font-bold">
                {currentWordIndex + 1}/{totalWords}
              </span>
            )}
          </DialogHeader>

          <DialogBody className="space-y-4">
            {/* Encouragement - Dictionary focused */}
            <p
              className="text-center text-neo-pink font-bold text-sm animate-in fade-in-0 duration-300 slide-in-from-bottom-1"
            >
              {encouragementSentence}
            </p>
            {/* Submitter Info */}
            {currentWord.submittedBy && (
              <Reveal
                className="flex flex-col items-center gap-1"
              >
                <Avatar
                  userId={currentWord.submittedBy}
                  size="xl"
                />
                <span className="text-xs text-neo-white font-semibold">
                  {currentWord.submittedBy}
                </span>
              </Reveal>
            )}

            {/* Word Card - Cleaner, focused on the word */}
            <Reveal
              key={currentWord.word}
              className="
                bg-neo-lime
                border-3 border-neo-black
                rounded-neo-lg
                shadow-hard-lg
                p-6
                text-center
              "
              style={{ transform: 'rotate(1deg)' }}
            >
              <p className="text-4xl font-black uppercase tracking-wide text-neo-black">
                {applyHebrewFinalLetters(currentWord.word)}
              </p>

              {/* Vote Progress Bar - Simplified */}
              {wordVoteInfo && (
                <div className="mt-4 space-y-1">
                  <div className="h-2 bg-neo-black/20 rounded-full overflow-hidden">
                    <m.div
                      className={`h-full ${isValidForScoring ? 'bg-neo-cyan' : 'bg-neo-lime'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-xs font-semibold text-neo-gray flex items-center justify-center gap-1">
                    <CheckCircle className={`w-3 h-3 ${isValidForScoring ? 'text-neo-cyan' : 'text-neo-lime'}`} />
                    {votesNeeded > 0
                      ? `${votesNeeded} ${t('wordFeedback.votesNeededShort')}`
                      : (t('wordFeedback.almostApproved'))}
                  </p>
                </div>
              )}
            </Reveal>

            {/* Voting Buttons */}
            {!hasVoted ? (
              <Reveal
                className="flex gap-3 justify-center"
              >
                {/* Thumbs Down */}
                <button
                  onClick={() => handleVote('dislike')}
                  className="
                    flex-1 max-w-28
                    bg-neo-red text-neo-white
                    border-3 border-neo-black
                    rounded-neo-lg
                    shadow-hard
                    px-3 py-3
                    font-bold uppercase text-xs
                    flex flex-col items-center gap-2
                    hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg
                    active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm
                    transition-all duration-150
                  "
                >
                  <ThumbsDown className="w-5 h-5" />
                  <span>{t('wordFeedback.notAWord')}</span>
                </button>

                {/* I Don't Know */}
                <button
                  onClick={handleDontKnow}
                  className="
                    flex-1 max-w-28
                    bg-neo-gray text-neo-white
                    border-3 border-neo-black
                    rounded-neo-lg
                    shadow-hard
                    px-3 py-3
                    font-bold uppercase text-xs
                    flex flex-col items-center gap-2
                    hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg
                    active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm
                    transition-all duration-150
                  "
                >
                  <HelpCircle className="w-5 h-5" />
                  <span>{t('wordFeedback.dontKnow')}</span>
                </button>

                {/* Thumbs Up */}
                <button
                  onClick={() => handleVote('like')}
                  className="
                    flex-1 max-w-28
                    bg-neo-lime text-neo-black
                    border-3 border-neo-black
                    rounded-neo-lg
                    shadow-hard
                    px-3 py-3
                    font-bold uppercase text-xs
                    flex flex-col items-center gap-2
                    hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg
                    active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm
                    transition-all duration-150
                  "
                >
                  <ThumbsUp className="w-5 h-5" />
                  <span>{t('wordFeedback.realWord')}</span>
                </button>
              </Reveal>
            ) : (
              <Reveal
                noSlide
                className="text-center py-4"
              >
                <span className="text-2xl font-black text-neo-pink flex items-center justify-center gap-2">
                  <CheckCircle className="w-6 h-6 text-neo-lime" />
                  {hasMoreWords
                    ? (t('wordFeedback.nextWord'))
                    : (t('wordFeedback.thankYou'))
                  }
                </span>
              </Reveal>
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
                <m.div
                  className={`h-full ${getTimerColor()} transition-colors duration-300`}
                  initial={{ width: '100%' }}
                  animate={{ width: `${timerProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center text-xs text-neo-gray">
                <span>
                  {t('wordFeedback.skipHint')}
                </span>
                <span className="font-mono font-bold">
                  {remainingTime}s
                </span>
              </div>
            </div>
          </DialogBody>
        </Reveal>
      </DialogContent>
    </Dialog>
  );
});

WordFeedbackModal.displayName = 'WordFeedbackModal';

export default WordFeedbackModal;
