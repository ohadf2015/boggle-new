import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
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
  shake: boolean;
  feedback: { message: string; type: 'success' | 'error' } | null;
  acceptedWord: string | null;
  acceptedPoints?: number | null;
  acceptedId: number;
  reducedMotion?: boolean;
  className?: string;
}

const POP = { type: 'spring', stiffness: 640, damping: 17 } as const;

export default function WordWheelWordLine({
  t, letters, allLetters, dir, onRemove, onSubmit, isValidating, shake, feedback,
  acceptedWord, acceptedPoints, acceptedId, reducedMotion = false, className,
}: WordWheelWordLineProps) {
  const word = letters.map(l => l.letter).join('');
  const preview = word.length >= 3 ? scoreWord(word) : 0;
  const isError = feedback?.type === 'error';
  const accepted = feedback?.type === 'success' && acceptedWord ? acceptedWord : null;
  const fullWheel = accepted ? classifyLetterCoverage(accepted, allLetters) === 'all' : false;

  return (
    <m.div
      data-testid="word-builder"
      className={cn('relative z-20 w-full mt-2 short:mt-1 h-[60px] sm:h-[76px] short:h-[46px] flex items-center justify-center', className)}
      animate={shake ? { x: [-10, 10, -7, 7, -3, 0] } : { x: 0 }}
      transition={shake ? { duration: 0.38 } : { duration: 0 }}
    >
      <AnimatePresence>
        {feedback && (
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
          className="absolute inset-0 flex items-center justify-center font-neo-display font-black text-[40px] sm:text-5xl tracking-[0.06em] text-neo-lime pointer-events-none [text-shadow:0_0_18px_rgba(191,255,0,0.7)]"
          initial={{ y: 0, scale: 1, opacity: 1 }}
          animate={{ y: -110, scale: 0.42, opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.3, 0, 0.2, 1] }}
        >
          {accepted}
        </m.span>
      )}

      <div dir={dir} className="flex items-center justify-center gap-0.5 max-w-full">
        {letters.length === 0 ? (
          <span className="flex items-center gap-2 text-neo-white/45 font-semibold text-sm sm:text-base">
            <m.span
              data-testid="word-caret"
              aria-hidden
              className="inline-block w-[3px] h-7 rounded-full bg-neo-lime"
              animate={reducedMotion ? undefined : { opacity: [1, 0, 1] }}
              transition={{ duration: 1.05, repeat: Infinity, ease: 'linear' }}
            />
            {!accepted && t('wordWheel.tapLetters')}
          </span>
        ) : (
          <>
            {letters.map((bl, i) => (
              <m.button
                key={`${bl.wheelIndex}-${i}`}
                type="button"
                translate="no"
                data-testid="built-letter-tile"
                data-center={bl.wheelIndex === -1 ? 'true' : 'false'}
                aria-label={`${bl.letter}. ${t('wordWheel.tapToRemove')}`}
                onClick={() => onRemove(i)}
                className={cn(
                  'notranslate relative font-neo-display font-black uppercase leading-none text-[40px] sm:text-5xl short:text-3xl px-[1px] touch-manipulation cursor-pointer',
                  'before:absolute before:-inset-y-2 before:inset-x-0 before:content-[""]',
                  isError ? 'text-neo-red' : bl.wheelIndex === -1 ? 'text-neo-lime' : 'text-neo-white',
                )}
                initial={reducedMotion ? false : { y: 14, scale: 0.5 }}
                animate={{ y: 0, scale: 1 }}
                transition={POP}
              >
                {bl.letter}
              </m.button>
            ))}
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
                className="ms-2 px-2 py-0.5 rounded-full border-2 border-neo-lime/70 text-neo-lime font-neo-display font-black text-sm tabular-nums"
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
                word.length >= 3
                  ? 'bg-neo-lime text-neo-black shadow-[2px_2px_0_#000,0_0_14px_rgba(191,255,0,0.55)]'
                  : 'bg-neo-navy-light text-neo-white/70 shadow-[2px_2px_0_#000]',
              )}
            >
              <Check className="w-5 h-5" strokeWidth={3} aria-hidden />
            </button>
          </>
        )}
      </div>
    </m.div>
  );
}
