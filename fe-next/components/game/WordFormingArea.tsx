'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import Avatar from '@/components/Avatar';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useCosyMode } from '@/contexts/AccessibilityContext';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

// How long the ✓/✗ note stays on screen after it arrives (ms).
// Rejected/duplicate get a SHORTER window so a bad word doesn't linger as a
// "stuck" pill while the player wants to keep moving. Reported in MP classic.
const FEEDBACK_VISIBLE_MS_ACCEPTED = 5000;
const FEEDBACK_VISIBLE_MS_REJECTED = 1500;
function feedbackVisibleMs(type: WordFeedback['type']): number {
  return type === 'rejected' || type === 'duplicate'
    ? FEEDBACK_VISIBLE_MS_REJECTED
    : FEEDBACK_VISIBLE_MS_ACCEPTED;
}
// How long the just-submitted word bridges the gap until async feedback lands.
// Covers the socket round-trip (50–200ms typ.). If nothing arrives by then the
// word was abandoned (deselected, never submitted) so the pill clears rather
// than linger forever.
const BRIDGE_VISIBLE_MS = 1500;
import { MIN_WORD_LENGTH } from '@/shared/constants/gameConstants';

// Hebrew final letters (sofit) mapping - non-final to final form
const HEBREW_FINAL_LETTERS: Record<string, string> = {
  'כ': 'ך', // kaf
  'מ': 'ם', // mem
  'נ': 'ן', // nun
  'פ': 'ף', // peh
  'צ': 'ץ', // tsadi
};

/**
 * Convert the last letter of a word to its Hebrew final form (sofit) if applicable
 */
function applyHebrewFinalLetter(word: string): string {
  if (!word || word.length === 0) return word;

  const lastChar = word[word.length - 1];
  const finalForm = HEBREW_FINAL_LETTERS[lastChar];

  if (finalForm) {
    return word.slice(0, -1) + finalForm;
  }

  return word;
}

export interface WordFeedback {
  id: string;
  type: 'accepted' | 'rejected' | 'duplicate' | 'foundByOther';
  word: string;
  score?: number;
  message?: string;
  fireRoundActive?: boolean;
  fireRoundBonus?: number;
  /** Golden letter bonus points */
  goldenBonus?: number;
  /** Rush-tile bonus points (recurring transient MP tiles) */
  rushBonus?: number;
  timestamp: number;
  /** Name of the player who found this word first (for foundByOther type) */
  foundBy?: string;
  /** Avatar of the first finder */
  foundByAvatar?: { customAvatar?: CustomAvatarConfig; avatarImage?: string } | null;
  /** Whether this word is from lesson vocabulary (classroom games) */
  fromLesson?: boolean;
  /** Word rarity classification for bonus display */
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic';
  /** Label for long word bonus display */
  longWordLabel?: string;
}

interface WordFormingAreaProps {
  word: string;
  letterCount: number;
  className?: string;
  /** Compact mode for inline layouts */
  compact?: boolean;
  /** Word validation feedback */
  feedback?: WordFeedback | null;
}

/**
 * WordFormingArea - Display area for word being formed with integrated validation feedback
 * Shows the word being formed, then smoothly MORPHS to show accept/reject/duplicate feedback
 * The element stays visible and transforms - no hide/show cycle
 * Memoized to prevent unnecessary re-renders
 */
const WordFormingArea = React.memo<WordFormingAreaProps>(({
  word,
  letterCount,
  className,
  compact = false,
  feedback,
}) => {
  const { t } = useLanguageSafe();
  // Cozy / Calm Mode swaps the energetic accept burst for one soft warm settle.
  const cosyMode = useCosyMode();
  const [visibleFeedback, setVisibleFeedback] = useState<WordFeedback | null>(null);
  const [lastWord, setLastWord] = useState<string>('');
  const [lastLetterCount, setLastLetterCount] = useState<number>(0);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bridgeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track the last word being formed (so we can show it during feedback)
  useEffect(() => {
    if (word.length > 0) {
      setLastWord(word);
      setLastLetterCount(letterCount);
    }
  }, [word, letterCount]);

  // Clear feedback when user starts forming a new word
  const isFormingWord = word.length > 0;
  useEffect(() => {
    if (isFormingWord && visibleFeedback) {
      setVisibleFeedback(null);
      // A fresh word starts a fresh cycle — kill the pending auto-clear so it
      // can't later wipe the new bridge word out from under the player.
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = null;
      }
    }
  }, [isFormingWord]); // eslint-disable-line react-hooks/exhaustive-deps -- Only trigger on forming state change

  // Handle feedback display - persists until new word is formed or timeout
  useEffect(() => {
    if (feedback) {
      setVisibleFeedback(feedback);
      // Clear any existing timeout
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      // Auto-clear feedback after the display window. Also drop the bridge word
      // so the pill returns to empty instead of lingering as a stale plain pill.
      feedbackTimeoutRef.current = setTimeout(() => {
        setVisibleFeedback(null);
        setLastWord('');
        feedbackTimeoutRef.current = null;
      }, feedbackVisibleMs(feedback.type));
    }

    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, [feedback]);

  // Async-validation bridge: on submit the selection word clears synchronously,
  // but the server's ✓/✗ lands a network round-trip later. Keep the just-formed
  // word on screen during that gap so the pill morphs into feedback instead of
  // flashing to the empty placeholder. Bounded: if no feedback arrives the word
  // was abandoned, so clear it rather than linger.
  useEffect(() => {
    // Only bridge when the player has just stopped forming and no feedback is up.
    if (word.length !== 0 || lastWord.length === 0 || visibleFeedback) return undefined;
    bridgeTimeoutRef.current = setTimeout(() => {
      setLastWord('');
      bridgeTimeoutRef.current = null;
    }, BRIDGE_VISIBLE_MS);
    return () => {
      if (bridgeTimeoutRef.current) {
        clearTimeout(bridgeTimeoutRef.current);
        bridgeTimeoutRef.current = null;
      }
    };
  }, [word, lastWord, visibleFeedback]);

  // Determine current state
  const isForming = word.length > 0;
  const showFeedback = visibleFeedback !== null;
  const showForming = isForming && !showFeedback;

  // Show content while forming, while feedback is on screen, OR during the
  // time-bounded async-validation bridge. lastWord is NOT a resting display:
  // the bridge / feedback effects clear it so a submitted word never lingers.
  const hasContent = showForming || showFeedback || lastWord.length > 0;

  // Get display word - forming word, feedback word, or last word.
  // Sofit (final-letter) form is applied ONLY to the settled/submitted word —
  // the in-progress forming word stays base-form (the board holds regular
  // letters; while tracing you're still entering input, not a final word).
  const rawDisplayWord = showForming ? word : (showFeedback ? visibleFeedback?.word : lastWord);
  const displayWord = (!showForming && rawDisplayWord) ? applyHebrewFinalLetter(rawDisplayWord) : rawDisplayWord;
  const displayLetterCount = showForming ? letterCount : lastLetterCount;

  // Container size classes - responsive min-width for small screens
  const containerClasses = cn(
    'flex items-center justify-center relative',
    compact
      ? 'h-10 min-h-[40px] min-w-[100px] xs:min-w-[120px]'
      : 'h-14 min-h-[56px] min-w-[120px] xs:min-w-[160px]',
    className
  );

  // Derive colors based on feedback state
  const { bgColor, textColor } = useMemo(() => {
    if (!showFeedback) return { bgColor: 'bg-neo-cyan', textColor: 'text-neo-black' };
    const type = visibleFeedback?.type;
    const bg = type === 'accepted' ? 'bg-neo-lime'
      : type === 'rejected' ? 'bg-neo-red'
      : type === 'duplicate' || type === 'foundByOther' ? 'bg-neo-pink'
      : 'bg-neo-cyan';
    return { bgColor: bg, textColor: type === 'rejected' ? 'text-neo-white' : 'text-neo-black' };
  }, [showFeedback, visibleFeedback?.type]);

  // Sparkle positions for accepted state
  const sparklePositions = useMemo(() =>
    [...Array(8)].map((_, i) => ({
      angle: (i * 45) * (Math.PI / 180),
      delay: i * 0.04,
    })), []
  );

  // Show empty placeholder only if we have no content at all
  const showEmpty = !hasContent;

  return (
    <div
      className={containerClasses}
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="wait">
        {showEmpty ? (
          /* Empty state - subtle placeholder */
          <m.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className={cn(
              'border-2 border-dashed border-neo-black/20 rounded-neo flex items-center justify-center',
              compact ? 'h-8 min-w-[80px] px-3' : 'h-10 min-w-[100px] px-4'
            )}
          >
            <span className={cn(
              'text-neo-black/30 font-medium',
              compact ? 'text-xs' : 'text-sm'
            )}>
              ···
            </span>
          </m.div>
        ) : (
          /* Main content - morphs between forming and feedback states */
          <m.div
            key="content"
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: showFeedback && (visibleFeedback?.type === 'rejected' || visibleFeedback?.type === 'duplicate' || visibleFeedback?.type === 'foundByOther')
                ? [0, -10, 10, 0] : 0,
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              layout: SPRING_PRESETS.snappy,
              opacity: { duration: 0.15 },
              scale: SPRING_PRESETS.snappy,
              x: { duration: 0.5, ease: 'easeInOut' }
            }}
            className={cn(
              'relative border-3 border-neo-black rounded-neo shadow-hard flex items-center gap-1.5 sm:gap-2 whitespace-nowrap overflow-visible',
              compact ? 'px-2 sm:px-3 py-1.5' : 'px-4 py-2',
              bgColor
            )}
          >
            {/* Status icon - only for feedback states */}
            <AnimatePresence mode="popLayout">
              {showFeedback && (
                <m.span
                  key={`icon-${visibleFeedback?.type}`}
                  initial={{ scale: 0, rotate: visibleFeedback?.type === 'accepted' ? -180 : 0 }}
                  animate={{
                    scale: 1,
                    rotate: (visibleFeedback?.type === 'rejected' || visibleFeedback?.type === 'duplicate' || visibleFeedback?.type === 'foundByOther')
                      ? [0, -15, 15, -15, 0] : 0
                  }}
                  exit={{ scale: 0 }}
                  transition={{
                    default: { type: 'tween' },
                    scale: SPRING_PRESETS.snappy,
                    rotate: { type: 'tween', duration: 0.4, ease: 'easeInOut' }
                  }}
                  className={cn(
                    'font-black',
                    compact ? 'text-base' : 'text-lg',
                    textColor
                  )}
                >
                  {visibleFeedback?.type === 'accepted' && <span aria-label={t('wordFeedback.accepted')}>✓</span>}
                  {visibleFeedback?.type === 'rejected' && <span aria-label={t('wordFeedback.rejected')}>✗</span>}
                  {visibleFeedback?.type === 'duplicate' && <span aria-label={t('wordFeedback.duplicateWord')}>⟳</span>}
                  {visibleFeedback?.type === 'foundByOther' && (
                    <Avatar
                      customAvatar={visibleFeedback?.foundByAvatar?.customAvatar}
                      avatarImage={visibleFeedback?.foundByAvatar?.avatarImage}
                      userId={visibleFeedback?.foundBy}
                      size="sm"
                    />
                  )}
                </m.span>
              )}
            </AnimatePresence>

            {/* Word display - no layout animation to prevent letter wrap during changes */}
            <span
              className={cn(
                'font-black uppercase tracking-wide',
                compact ? 'text-base' : 'text-xl',
                textColor
              )}
            >
              {showFeedback && visibleFeedback?.type === 'rejected'
                ? (visibleFeedback.message || t('wordFeedback.invalid'))
                : showFeedback && visibleFeedback?.type === 'duplicate'
                  ? (visibleFeedback.message || t('wordFeedback.duplicate'))
                  : showFeedback && visibleFeedback?.type === 'foundByOther'
                    ? (visibleFeedback.message || t('game.foundByOther', { player: visibleFeedback.foundBy || '' }))
                    : displayWord}
            </span>

            {/* Letter count - only once the word is long enough to be submittable.
                Below MIN_WORD_LENGTH (e.g. a lone "A") the badge reads as a
                Scrabble point value ("A 1"), so suppress it. */}
            <AnimatePresence mode="popLayout">
              {showForming && displayLetterCount >= MIN_WORD_LENGTH && (
                <m.span
                  key="letter-count"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={SPRING_PRESETS.snappy}
                  className={cn(
                    'font-bold bg-neo-black/15 rounded-md',
                    compact ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1',
                    textColor
                  )}
                >
                  {displayLetterCount}
                </m.span>
              )}
            </AnimatePresence>

            {/* Score badge - for accepted and foundByOther (partial credit) */}
            <AnimatePresence mode="popLayout">
              {showFeedback && (visibleFeedback?.type === 'accepted' || visibleFeedback?.type === 'foundByOther') && visibleFeedback.score !== undefined && visibleFeedback.score > 0 && (
                <m.span
                  key="score"
                  initial={{ scale: 0, y: 8 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ delay: 0.1, ...SPRING_PRESETS.snappy }}
                  className={cn(
                    'bg-neo-cyan text-neo-black font-black rounded-neo border-2 border-neo-black',
                    compact ? 'text-sm px-2 py-0.5' : 'text-base px-2.5 py-1'
                  )}
                >
                  +{visibleFeedback.score}
                </m.span>
              )}
            </AnimatePresence>

            {/* Rarity badge - for accepted feedback with non-common rarity */}
            <AnimatePresence mode="popLayout">
              {showFeedback && visibleFeedback?.type === 'accepted' && visibleFeedback.rarity && visibleFeedback.rarity !== 'common' && (
                <m.span
                  key="rarity"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ delay: 0.15, ...SPRING_PRESETS.snappy }}
                  className={cn(
                    'font-black rounded-neo border-2 border-neo-black uppercase',
                    compact ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-0.5',
                    visibleFeedback.rarity === 'uncommon' && 'bg-green-400 text-neo-black',
                    visibleFeedback.rarity === 'rare' && 'bg-blue-400 text-white',
                    visibleFeedback.rarity === 'epic' && 'bg-purple-500 text-white',
                  )}
                >
                  {visibleFeedback.rarity}
                </m.span>
              )}
            </AnimatePresence>

            {/* Lesson word indicator */}
            <AnimatePresence mode="popLayout">
              {showFeedback && visibleFeedback?.type === 'accepted' && visibleFeedback.fromLesson && (
                <m.span
                  key="lesson"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{
                    scale: 1,
                    rotate: 0,
                    y: [0, -3, 0]
                  }}
                  exit={{ scale: 0 }}
                  transition={{
                    scale: { delay: 0.15, ...SPRING_PRESETS.entrance },
                    rotate: { delay: 0.15, ...SPRING_PRESETS.entrance },
                    y: { delay: 0.4, duration: 0.6, repeat: Infinity, repeatDelay: 1 }
                  }}
                  className={cn(
                    'bg-linear-to-br from-neo-pink to-neo-purple text-white font-black rounded-neo border-2 border-neo-black',
                    compact ? 'text-sm px-2 py-0.5' : 'text-base px-2.5 py-1'
                  )}
                  title={t('wordFeedback.lessonWordTitle')}
                  aria-label={t('wordFeedback.lessonWordTitle')}
                >
                  📚
                </m.span>
              )}
            </AnimatePresence>

            {/* Fire round bonus indicator */}
            <AnimatePresence mode="popLayout">
              {showFeedback && visibleFeedback?.type === 'accepted' && visibleFeedback.fireRoundActive && (
                <m.span
                  key="fire"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ delay: 0.2, ...SPRING_PRESETS.snappy }}
                  className={cn(
                    'bg-linear-to-r from-orange-500 to-red-500 text-white font-black rounded-md border-2 border-neo-black',
                    compact ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-0.5'
                  )}
                >
                  {visibleFeedback.fireRoundBonus ? `🔥+${visibleFeedback.fireRoundBonus}` : '🔥2x'}
                </m.span>
              )}
            </AnimatePresence>

            {/* Golden letter bonus indicator */}
            <AnimatePresence mode="popLayout">
              {showFeedback && visibleFeedback?.type === 'accepted' && visibleFeedback.goldenBonus && visibleFeedback.goldenBonus > 0 && (
                <m.span
                  key="golden"
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ delay: 0.25, ...SPRING_PRESETS.snappy }}
                  className={cn(
                    'bg-linear-to-r from-yellow-400 to-amber-500 text-amber-900 font-black rounded-md border-2 border-amber-600/60 shadow-[0_0_10px_rgba(255,215,0,0.5)]',
                    compact ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-0.5'
                  )}
                >
                  ★+{visibleFeedback.goldenBonus}
                </m.span>
              )}
            </AnimatePresence>

            {/* Rush-tile bonus indicator (recurring transient MP tiles) */}
            <AnimatePresence mode="popLayout">
              {showFeedback && visibleFeedback?.type === 'accepted' && visibleFeedback.rushBonus && visibleFeedback.rushBonus > 0 && (
                <m.span
                  key="rush"
                  initial={{ scale: 0, rotate: 15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ delay: 0.25, ...SPRING_PRESETS.snappy }}
                  className={cn(
                    'bg-linear-to-r from-pink-400 to-pink-600 text-pink-50 font-black rounded-md border-2 border-pink-700/60 shadow-[0_0_10px_rgba(255,20,147,0.55)]',
                    compact ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-0.5'
                  )}
                >
                  ✦+{visibleFeedback.rushBonus}
                </m.span>
              )}
            </AnimatePresence>

            {/* Sparkle particles - for accepted (loud mode only) */}
            {!cosyMode && showFeedback && visibleFeedback?.type === 'accepted' && sparklePositions.map((pos, i) => (
              <m.div
                key={`sparkle-${i}`}
                className="absolute w-2 h-2 bg-neo-lime rounded-full left-1/2 top-1/2"
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1.2, 0],
                  x: [0, Math.cos(pos.angle) * 35],
                  y: [0, Math.sin(pos.angle) * 35],
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 0.5, delay: pos.delay }}
              />
            ))}

            {/* Burst ring - for accepted (loud mode only) */}
            {!cosyMode && showFeedback && visibleFeedback?.type === 'accepted' && (
              <m.div
                className="absolute inset-0 rounded-neo pointer-events-none"
                initial={{ scale: 0.8, opacity: 1 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 0.5 }}
                style={{ border: '3px solid var(--neo-lime)' }}
              />
            )}

            {/* Cozy / Calm accept — ONE soft warm settle instead of the burst.
                A gentle peach bloom that breathes once over the pill; satisfying
                without party noise. One-shot (animate-cosy-bloom) and hidden
                under reduced-motion. */}
            {cosyMode && showFeedback && visibleFeedback?.type === 'accepted' && (
              <m.div
                key={`cosy-glow-${visibleFeedback?.id}`}
                data-testid="cosy-accept-glow"
                aria-hidden="true"
                className="absolute inset-[-30%] rounded-full pointer-events-none bg-neo-cozy-light/40 animate-cosy-bloom motion-reduce:hidden"
              />
            )}

            {/* Red pulse - for rejected */}
            {showFeedback && visibleFeedback?.type === 'rejected' && (
              <m.div
                className="absolute inset-0 rounded-neo pointer-events-none bg-red-500/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0] }}
                transition={{ duration: 0.4 }}
              />
            )}

            {/* Pink pulse - for duplicate and foundByOther */}
            {showFeedback && (visibleFeedback?.type === 'duplicate' || visibleFeedback?.type === 'foundByOther') && (
              <m.div
                className="absolute inset-0 rounded-neo pointer-events-none bg-pink-500/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0.3] }}
                transition={{ duration: 0.4 }}
              />
            )}

          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
});

WordFormingArea.displayName = 'WordFormingArea';

export default WordFormingArea;
