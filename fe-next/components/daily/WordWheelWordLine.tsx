import React, { useState, type ReactNode } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { scoreWord } from '@/utils/dailyChallenge/wordWheelScoring';
import { classifyLetterCoverage } from '@/lib/wheelRush/letterCoverage';
import { praiseFor } from '@/lib/wordWheel/rankLadder';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface BuiltLetter { letter: string; wheelIndex: number }

interface WordWheelWordLineProps {
  t: T;
  letters: BuiltLetter[];
  centerLetter: string;
  allLetters: string[];
  dir: 'ltr' | 'rtl';
  onRemove: (index: number) => void;
  onSubmit: () => void;
  isValidating: boolean;
  /** A released word still waiting on the server; the wheel is already clear for the next swipe. */
  pendingWord?: string | null;
  shake: boolean;
  feedback: { message: string; type: 'success' | 'error' } | null;
  acceptedWord: string | null;
  acceptedPoints?: number | null;
  acceptedId: number;
  reducedMotion?: boolean;
  /** How-to line beside the caret; only before the player's first word. */
  hint?: boolean;
  /** Letter under a finger that has not joined the word yet. */
  pending?: string | null;
  /** A coverage banner is carrying the praise for this word. */
  celebrating?: boolean;
  /** Coverage banner, laid over the line once the scored word has flown off it. */
  banner?: ReactNode;
  /** What the loaded dictionary says about the word being built: a new word, a non-word, or one already found. */
  live?: 'word' | 'no' | 'found' | null;
  className?: string;
}

const POP = { type: 'spring', stiffness: 640, damping: 17 } as const;

function PendingLetter({ letter, reducedMotion }: { letter: string; reducedMotion: boolean }) {
  return (
    <m.span
      data-testid="word-pending-letter"
      aria-hidden
      className="notranslate font-neo-display font-black uppercase leading-none text-[40px] sm:text-5xl tall:text-[52px] short:text-3xl px-[1px] text-neo-lime [text-shadow:0_0_16px_rgba(191,255,0,0.6)]"
      initial={reducedMotion ? false : { y: 12, scale: 0.4 }}
      animate={{ y: 0, scale: 1 }}
      transition={POP}
    >
      {letter}
    </m.span>
  );
}

export default function WordWheelWordLine({
  t, letters, centerLetter, allLetters, dir, onRemove, onSubmit, isValidating, pendingWord = null, shake, feedback,
  acceptedWord, acceptedPoints, acceptedId, reducedMotion = false, hint = false, pending = null,
  celebrating = false, banner, live = null, className,
}: WordWheelWordLineProps) {
  const word = letters.map(l => l.letter).join('');
  const [lastBuilt, setLastBuilt] = useState('');
  if (word && word !== lastBuilt) setLastBuilt(word);
  const riding = letters.length === 0 && !!pendingWord;
  const shown = riding ? [...pendingWord].map(letter => ({ letter, wheelIndex: -2 })) : letters;
  const checking = riding || (isValidating && letters.length > 0);
  const isWord = live === 'word' && word.length >= 3 && !checking;
  const preview = isWord ? scoreWord(word) : 0;
  const isError = feedback?.type === 'error';
  const accepted = feedback?.type === 'success' && acceptedWord ? acceptedWord : null;
  const fullWheel = accepted ? classifyLetterCoverage(accepted, allLetters) === 'all' : false;
  const rejected = isError && letters.length === 0 && lastBuilt ? lastBuilt : null;

  return (
    <m.div
      data-testid="word-builder"
      data-state={checking ? 'checking' : isError ? 'rejected' : accepted ? 'accepted' : 'idle'}
      data-live={live ?? 'unknown'}
      className={cn('relative z-20 w-full mt-2 short:mt-1 h-[60px] sm:h-[76px] tall:h-[88px] short:h-[46px] flex items-center justify-center', className)}
      animate={shake ? { x: [-10, 10, -7, 7, -3, 0] } : { x: 0 }}
      transition={shake ? { duration: 0.38 } : { duration: 0 }}
    >
      <AnimatePresence>
        {feedback && !(celebrating && !isError) && (
          <m.div
            key={`${feedback.type}-${feedback.message}-${acceptedId}`}
            data-testid="word-feedback"
            data-kind={feedback.type}
            dir="auto"
            className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 flex items-center whitespace-nowrap pointer-events-none z-30"
            initial={reducedMotion ? { opacity: 0 } : { scale: 0.4, y: 14 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { scale: 0.7, y: -16, opacity: 0 }}
            transition={reducedMotion ? { duration: 0.15 } : POP}
          >
            {accepted ? (
              <>
                <span
                  className={cn(
                    'px-3.5 py-1 rounded-full border-[3px] border-neo-black font-neo-display font-black text-base shadow-[3px_3px_0_#000]',
                    fullWheel ? 'bg-neo-pink text-neo-white' : 'bg-neo-white text-neo-black',
                  )}
                >
                  {t(`wordWheel.praise.${praiseFor(accepted, fullWheel)}`)}
                </span>
                <span className="-ms-1.5 px-2.5 py-1 rounded-full border-[3px] border-neo-black bg-neo-lime text-neo-black font-neo-display font-black text-base tabular-nums shadow-[3px_3px_0_#000]">
                  +{acceptedPoints ?? scoreWord(accepted)}
                </span>
              </>
            ) : isError ? (
              <span className="px-3.5 py-1 rounded-full border-[3px] border-neo-black bg-neo-red text-neo-white font-bold text-sm shadow-[3px_3px_0_#000]">
                {feedback.message}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full border-[3px] border-neo-black bg-neo-lime text-neo-black font-black text-sm">
                {feedback.message}
              </span>
            )}
          </m.div>
        )}
      </AnimatePresence>

      {accepted && !reducedMotion && (
        <m.span
          key={`fly-${acceptedId}`}
          data-testid="accepted-word-fly"
          aria-hidden
          dir={dir}
          className="absolute inset-0 flex items-center justify-center font-neo-display font-black text-[40px] sm:text-5xl tall:text-[52px] tracking-[0.06em] text-neo-lime pointer-events-none [text-shadow:0_0_18px_rgba(191,255,0,0.7)]"
          initial={{ y: 0, scale: 1, opacity: 1 }}
          animate={{ y: -110, scale: 0.42, opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.3, 0, 0.2, 1] }}
        >
          {accepted}
        </m.span>
      )}

      {rejected && (
        <m.span
          key={`rejected-${acceptedId}-${feedback?.message}`}
          data-testid="rejected-word"
          aria-hidden
          dir={dir}
          className="absolute inset-0 flex items-center justify-center font-neo-display font-black uppercase text-[40px] sm:text-5xl tall:text-[52px] tracking-[0.06em] text-neo-red pointer-events-none [text-shadow:0_0_14px_rgba(255,59,48,0.55)]"
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={reducedMotion ? { opacity: 0 } : { x: [0, -12, 10, -6, 0], y: [0, 0, 0, 4, 34], opacity: [1, 1, 1, 0.9, 0] }}
          transition={{ duration: reducedMotion ? 0.3 : 0.75, times: [0, 0.15, 0.3, 0.5, 1], ease: 'easeOut' }}
        >
          {rejected}
        </m.span>
      )}

      {shown.length === 0 && !pending && banner}

      <div dir={dir} className="flex items-center justify-center gap-0.5 max-w-full">
        {shown.length === 0 && pending ? (
          <PendingLetter key={`pending-${pending}`} letter={pending} reducedMotion={reducedMotion} />
        ) : shown.length === 0 ? (
          <span className="flex items-center gap-2 text-neo-white/45 font-semibold text-sm sm:text-base">
            <m.span
              data-testid="word-caret"
              aria-hidden
              className={cn('inline-block w-[3px] h-7 rounded-full bg-neo-lime', rejected && 'invisible')}
              animate={reducedMotion ? undefined : { opacity: [1, 0, 1] }}
              transition={{ duration: 1.05, repeat: Infinity, ease: 'linear' }}
            />
            {hint && !accepted && !rejected && t('wordWheel.firstHint', { letter: centerLetter })}
          </span>
        ) : (
          <>
            {shown.map((bl, i) => (
              <m.button
                key={`${bl.wheelIndex}-${i}`}
                type="button"
                translate="no"
                data-testid={riding ? 'pending-letter-tile' : 'built-letter-tile'}
                data-center={bl.wheelIndex === -1 ? 'true' : 'false'}
                aria-label={`${bl.letter}. ${t('wordWheel.tapToRemove')}`}
                onClick={() => { if (!riding) onRemove(i); }}
                className={cn(
                  'notranslate relative font-neo-display font-black uppercase leading-none text-[40px] sm:text-5xl tall:text-[52px] short:text-3xl px-[1px] touch-manipulation cursor-pointer',
                  'before:absolute before:-inset-y-2 before:inset-x-0 before:content-[""]',
                  isError ? 'text-neo-red' : checking ? 'text-neo-cyan' : isWord ? 'text-neo-lime [text-shadow:0_0_18px_rgba(191,255,0,0.6)]' : live === 'found' ? 'text-neo-white/45' : bl.wheelIndex === -1 ? 'text-neo-lime' : 'text-neo-white',
                )}
                initial={reducedMotion ? false : { y: 14, scale: 0.5 }}
                animate={checking && !reducedMotion ? { y: [0, -10, 0], scale: [1, 1.12, 1] } : { y: 0, scale: 1 }}
                transition={checking && !reducedMotion
                  ? { duration: 0.42, delay: i * 0.05, repeat: Infinity, ease: 'easeInOut' }
                  : POP}
              >
                {bl.letter}
              </m.button>
            ))}
            {pending && <PendingLetter key={`pending-${pending}`} letter={pending} reducedMotion={reducedMotion} />}
            <m.span
              aria-hidden
              className={cn('inline-block w-[3px] h-9 sm:h-11 ms-1 rounded-full', isError ? 'bg-neo-red' : 'bg-neo-lime')}
              animate={reducedMotion ? undefined : { opacity: [1, 0, 1] }}
              transition={{ duration: 1.05, repeat: Infinity, ease: 'linear' }}
            />
            {preview > 0 && !isError && (
              <m.span
                key={preview}
                data-testid="word-points-preview"
                className="ms-2 px-2 py-0.5 rounded-full border-2 border-neo-black bg-neo-lime text-neo-black shadow-hard-sm font-neo-display font-black text-sm tabular-nums"
                initial={reducedMotion ? false : { scale: 1.6 }}
                animate={{ scale: 1 }}
                transition={POP}
              >
                +{preview}
              </m.span>
            )}
            <button
              type="button"
              data-testid="inline-submit-chip"
              onClick={onSubmit}
              disabled={isValidating}
              aria-label={t('wordWheel.submit')}
              className={cn(
                'relative ms-2 w-10 h-10 rounded-full border-[3px] border-neo-black grid place-items-center touch-manipulation',
                'before:absolute before:-inset-2 before:content-[""] active:translate-y-px',
                isWord
                  ? 'bg-neo-lime text-neo-black shadow-[2px_2px_0_#000,0_0_14px_rgba(191,255,0,0.55)]'
                  : 'bg-neo-navy-light text-neo-white/70 shadow-[2px_2px_0_#000]',
              )}
            >
              {checking ? (
                <m.span
                  data-testid="submit-pending"
                  aria-hidden
                  className="w-3 h-3 rounded-full bg-neo-black"
                  animate={reducedMotion ? undefined : { scale: [0.6, 1.1, 0.6], opacity: [0.45, 1, 0.45] }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}
                />
              ) : (
                <CornerDownLeft className="w-5 h-5" strokeWidth={3} aria-hidden />
              )}
            </button>
          </>
        )}
      </div>
    </m.div>
  );
}
