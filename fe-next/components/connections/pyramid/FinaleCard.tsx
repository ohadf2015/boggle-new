'use client';

import { useEffect, useRef } from 'react';
import { m, AnimatePresence, useAnimationControls } from 'framer-motion';
import { ArrowRight, Flag, Check, Lightbulb } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';
import type { PyramidPuzzle } from '@/lib/connections/pyramid/types';
import { localeNeedsIME, MAX_GUESS_LEN, getKeyboardLetters, appendLetter, backspace } from '@/lib/connections/keyboard';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import ConnectionsKeyboard from '../ConnectionsKeyboard';

interface FinaleCardProps {
  bridges: string[];
  pyramid: PyramidPuzzle;
  input: string;
  wrongAttempts: number;
  hintRevealed: boolean;
  status: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onGiveUp: () => void;
  onRevealHint: () => void;
  isAdmin: boolean;
}

const CARD_SPRING = { type: 'spring' as const, stiffness: 320, damping: 26 };

const WORD_CHIP_VARIANTS = {
  initial: { opacity: 0, scale: 0.75, y: 10 },
  animate: (delay: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 20, delay },
  }),
  exit: { opacity: 0, scale: 0.85, transition: { duration: 0.12 } },
};

/**
 * Finale stage: the 3 solved bridges are displayed as big clue chips,
 * and the player must find the word that pairs with all of them.
 */
export default function FinaleCard({
  bridges,
  pyramid,
  input,
  wrongAttempts,
  hintRevealed,
  status,
  onInputChange,
  onSubmit,
  onGiveUp,
  onRevealHint,
  isAdmin,
}: FinaleCardProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const shakeControls = useAnimationControls();
  const prevStatus = useRef(status);

  const isCorrect = status === 'won';
  const isWrong = status === 'wrong';
  const isGaveUp = status === 'gaveUp';
  const isResolved = isCorrect || isGaveUp;
  const isDisabled = isResolved;

  const keyboardLetters = getKeyboardLetters(language);
  const needsIME = localeNeedsIME(language);
  const handleLetter = (letter: string) => onInputChange(appendLetter(input, letter));
  const handleBackspace = () => onInputChange(backspace(input));
  const bufferDisplay = isRTL ? applyHebrewFinalLetters(input) : input;

  // Rewarded-ad gate for hint
  const revealHintAd = useRewardedFeatureUnlock({
    placement: 'connections_reveal_hint',
    surface: 'hint',
    onUnlock: onRevealHint,
    disabled: isAdmin || hintRevealed || isDisabled || !pyramid.metaHint,
    context: { pyramidId: pyramid.id },
  });

  // Rewarded-ad gate for give-up
  const revealAnswerAd = useRewardedFeatureUnlock({
    placement: 'connections_reveal_answer',
    surface: 'hint',
    onUnlock: onGiveUp,
    disabled: isAdmin || isDisabled,
    context: { pyramidId: pyramid.id },
  });

  useEffect(() => {
    if (status === 'wrong' && prevStatus.current !== 'wrong') {
      shakeControls.start({
        x: [0, -14, 14, -11, 11, -7, 7, -3, 3, 0],
        transition: { duration: 0.5, ease: 'easeInOut' },
      });
    }
    prevStatus.current = status;
  }, [status, wrongAttempts, shakeControls]);

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={pyramid.id}
        animate={shakeControls}
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.97, transition: { duration: 0.18 } }}
        transition={CARD_SPRING}
        viewport={{ once: true }}
        className={[
          'relative rounded-neo border-neo-thick shadow-hard',
          isCorrect ? 'border-neo-lime' : isWrong ? 'border-neo-red' : 'border-neo-purple',
          isCorrect ? 'bg-neo-lime/10' : isWrong ? 'bg-neo-red/10' : 'bg-neo-navy-light/80',
          'px-4 pb-5 pt-5 transition-colors duration-200',
        ].join(' ')}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Finale prompt */}
        <div className="mb-4 text-center">
          <h2 className="font-neo-display text-lg font-black text-neo-white">
            {t('connections.pyramid.finalePrompt')}
          </h2>
          <p className="text-neo-white/50 text-sm font-neo-body mt-1">
            {t('connections.pyramid.cluesLabel')}
          </p>
        </div>

        {/* 3 bridge clues */}
        <AnimatePresence mode="wait">
          <div key="bridges" className="flex items-center justify-center gap-2 mb-4 flex-wrap">
            {bridges.map((bridge, idx) => (
              <m.span
                key={`bridge-${idx}`}
                custom={idx * 0.08}
                variants={WORD_CHIP_VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                className="font-neo-display text-xl font-bold text-neo-white px-3 py-1.5 rounded-neo border border-neo-white/20 bg-neo-navy shadow-hard-sm"
              >
                {bridge}
              </m.span>
            ))}
          </div>
        </AnimatePresence>

        {/* Hint display */}
        <AnimatePresence mode="wait">
          {hintRevealed && pyramid.metaHint && (
            <m.p
              key="hint"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="text-neo-yellow text-sm text-center mb-4 inline-flex items-center justify-center gap-2 w-full"
            >
              <Lightbulb className="w-4 h-4" aria-hidden="true" />
              {pyramid.metaHint}
            </m.p>
          )}

          {isCorrect && (
            <m.p
              key="correct"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 350, damping: 14 }}
              className="text-neo-lime text-center text-lg font-bold mb-4 inline-flex items-center justify-center gap-2 w-full"
            >
              {t('connections.correct')}
              <Check className="w-5 h-5" aria-hidden="true" />
            </m.p>
          )}

          {isWrong && (
            <m.p
              key="wrong"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-neo-red text-center text-sm mb-4"
            >
              {t('connections.wrong')}
            </m.p>
          )}

          {isGaveUp && (
            <m.p
              key="gaveUp"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              className="text-neo-red text-center text-sm font-bold mb-4"
            >
              {t('connections.solutionIs')}: <span className="text-neo-white">{pyramid.metaAnswer}</span>
            </m.p>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div className="flex flex-col gap-3" dir={isRTL ? 'rtl' : 'ltr'}>
          {needsIME ? (
            !isDisabled && (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  lang={language}
                  inputMode="text"
                  enterKeyHint="done"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label={t('connections.placeholder')}
                  value={input}
                  onChange={(e) => onInputChange(e.target.value.slice(0, MAX_GUESS_LEN))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && input.trim().length > 0) {
                      e.preventDefault();
                      onSubmit();
                    }
                  }}
                  placeholder={t('connections.placeholder')}
                  className={[
                    'min-h-[3.25rem] w-full rounded-neo border-neo bg-neo-navy px-4 py-3 text-lg shadow-hard',
                    'font-neo-display font-bold text-neo-white placeholder:text-neo-white/40 placeholder:font-neo-body placeholder:font-normal',
                    'outline-none focus:border-neo-cyan transition-colors duration-200',
                    isCorrect ? 'border-neo-lime' : isWrong ? 'border-neo-red bg-neo-red/10' : 'border-neo-white/20',
                  ].join(' ')}
                />
                <m.button
                  type="button"
                  onClick={onSubmit}
                  whileTap={{ scale: 0.97 }}
                  disabled={input.trim().length === 0}
                  className="rounded-neo border-neo-thick border-neo-cyan bg-neo-cyan px-4 py-2.5 font-neo-display font-black text-neo-navy shadow-hard disabled:opacity-40"
                >
                  {t('connections.submit')}
                </m.button>
              </div>
            )
          ) : (
            <>
              <div
                aria-live="polite"
                aria-label={t('connections.placeholder')}
                className={[
                  'min-h-[3.25rem] rounded-neo border-neo bg-neo-navy px-4 py-3 text-lg shadow-hard',
                  'flex items-center font-neo-display font-bold tracking-[0.2em] transition-colors duration-200',
                  isRTL ? 'justify-end text-right' : 'justify-start text-left',
                  isCorrect ? 'border-neo-lime' : isWrong ? 'border-neo-red bg-neo-red/10' : 'border-neo-white/20',
                ].join(' ')}
              >
                {bufferDisplay ? (
                  <span className="text-neo-white">{bufferDisplay}</span>
                ) : (
                  <span className="text-neo-white/40 font-neo-body font-normal tracking-normal">
                    {t('connections.placeholder')}
                  </span>
                )}
              </div>
              {!isDisabled && (
                <ConnectionsKeyboard
                  letters={keyboardLetters}
                  dir={isRTL ? 'rtl' : 'ltr'}
                  onLetter={handleLetter}
                  onBackspace={handleBackspace}
                  onSubmit={onSubmit}
                  backspaceLabel={t('connections.backspace')}
                  submitLabel={t('connections.submit')}
                  canSubmit={input.trim().length > 0}
                  disabled={isDisabled}
                />
              )}
            </>
          )}
        </div>

        {/* Hint + Give-up buttons */}
        {(status === 'playing' || status === 'wrong') && (
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {pyramid.metaHint && !hintRevealed && (
              isAdmin ? (
                <m.button
                  type="button"
                  onClick={onRevealHint}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex items-center gap-2 rounded-neo border-neo border-neo-yellow/70 bg-transparent text-neo-yellow font-neo-body text-sm px-4 py-2 hover:bg-neo-yellow/10 transition-colors"
                >
                  <Lightbulb className="w-4 h-4" aria-hidden="true" />
                  {t('connections.revealHint')}
                </m.button>
              ) : revealHintAd.canShowAd ? (
                <m.button
                  type="button"
                  onClick={revealHintAd.offer}
                  whileTap={{ scale: 0.96 }}
                  disabled={revealHintAd.status === 'loading' || revealHintAd.status === 'showing'}
                  className="inline-flex items-center gap-1.5 text-neo-white/55 font-neo-body text-xs px-2 py-1 hover:text-neo-yellow underline-offset-4 hover:underline transition-colors disabled:opacity-60"
                >
                  <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
                  {t('connections.revealHintAd')}
                </m.button>
              ) : null
            )}

            {isAdmin ? (
              <m.button
                type="button"
                onClick={onGiveUp}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="inline-flex items-center gap-2 rounded-neo border-neo border-neo-red/70 bg-transparent text-neo-red font-neo-body text-sm px-4 py-2 hover:bg-neo-red/10 transition-colors"
              >
                <Flag className="w-4 h-4" aria-hidden="true" />
                {t('connections.adminGiveUp')}
              </m.button>
            ) : revealAnswerAd.canShowAd ? (
              <m.button
                type="button"
                onClick={revealAnswerAd.offer}
                whileTap={{ scale: 0.96 }}
                disabled={revealAnswerAd.status === 'loading' || revealAnswerAd.status === 'showing'}
                className="inline-flex items-center gap-1.5 text-neo-white/55 font-neo-body text-xs px-2 py-1 hover:text-neo-purple underline-offset-4 hover:underline transition-colors disabled:opacity-60"
              >
                {t('connections.revealAnswerAd')}
              </m.button>
            ) : null}
          </div>
        )}

        {isResolved && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 22 }}
            className="mt-4 flex flex-col items-center gap-2"
          >
            <m.button
              onClick={() => {
                // Next button should be handled by parent
              }}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.96 }}
              className="rounded-neo border-neo-thick border-neo-cyan bg-neo-cyan text-neo-navy font-neo-display font-bold px-6 py-2 shadow-hard inline-flex items-center gap-2"
            >
              {t('connections.next')}
              <DirectionalIcon icon={ArrowRight} className="w-4 h-4" />
            </m.button>
          </m.div>
        )}
      </m.div>
    </AnimatePresence>
  );
}
