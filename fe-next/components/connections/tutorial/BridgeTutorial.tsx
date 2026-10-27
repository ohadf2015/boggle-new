'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { m, useAnimationControls } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { checkGuess } from '@/lib/connections/gameLogic';
import { appendLetter, backspace, normalizeTypedChar } from '@/lib/connections/keyboard';
import { isTypingTarget } from '@/lib/dom/isTypingTarget';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import { cn } from '@/lib/utils';
import AnswerSlots from '../AnswerSlots';
import BridgeStage from '../BridgeStage';
import ConnectionsKeyboard from '../ConnectionsKeyboard';
import { BridgeSolveReveal } from '../BridgeSolveReveal';
import { useBridgeTyping } from '../useBridgeTyping';
import { tutorialPuzzle } from './tutorialGate';

type Status = 'playing' | 'wrong' | 'correct';
const SHOW_ME_AFTER = 2;

/**
 * First-run Word Bridge lesson: one easy riddle played on the real slots and
 * keyboard, with the rules in three short steps that light up as they happen.
 */
export default function BridgeTutorial({ onDone }: { onDone: () => void }) {
  const { t, language } = useLanguage();
  const reduced = useReducedMotion();
  const sfx = useSoundEffects();
  const shake = useAnimationControls();
  const [puzzle] = useState(() => tutorialPuzzle(language));
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('playing');
  const [misses, setMisses] = useState(0);
  const solved = status === 'correct';
  const isRTL = language === 'he';

  const submit = useCallback(() => {
    if (solved || input.trim().length === 0) return;
    if (checkGuess(input, puzzle).correct) {
      setStatus('correct');
      sfx.playMatchFoundSound?.();
      return;
    }
    setStatus('wrong');
    setMisses((n) => n + 1);
    sfx.playErrorSound?.();
    if (!reduced) void shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } });
  }, [input, puzzle, reduced, sfx, shake, solved]);

  const onInput = useCallback((value: string) => {
    setInput(value);
    if (value) setStatus((s) => (s === 'wrong' ? 'playing' : s));
  }, []);

  // Its own window listener stays off: the capture listener below must win over the game's.
  const typing = useBridgeTyping({
    input, answer: puzzle.bridge, locale: language, disabled: true, status, wrongAttempts: misses, onInputChange: onInput, onSubmit: submit,
  });

  const latest = useRef({ input, submit, onInput, slotCap: typing.slotCap, solved });
  latest.current = { input, submit, onInput, slotCap: typing.slotCap, solved };
  // Opened mid-game, the run stays mounted underneath; its keyboard listener must not see these keys.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      e.stopImmediatePropagation();
      const cur = latest.current;
      if (cur.solved || typing.needsIME) return;
      if (e.key === 'Enter') { e.preventDefault(); cur.submit(); return; }
      if (e.key === 'Backspace') { e.preventDefault(); cur.onInput(backspace(cur.input)); return; }
      const letter = normalizeTypedChar(e.key, language);
      if (letter) cur.onInput(appendLetter(cur.input, letter, cur.slotCap));
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [language, typing.needsIME]);

  const showMe = () => {
    setInput(puzzle.bridge);
    setStatus('correct');
  };

  const steps = [
    { key: 'connections.tutorial.step1', on: !solved },
    { key: 'connections.tutorial.step2', on: !solved },
    { key: 'connections.tutorial.step3', on: solved },
  ];
  const slotsValue = solved ? puzzle.bridge.replace(/[^\p{L}\p{N}]/gu, '') : isRTL ? applyHebrewFinalLetters(input) : input;

  return (
    <section
      data-testid="bridge-tutorial"
      dir={isRTL ? 'rtl' : 'ltr'}
      className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 pb-6 pt-2"
    >
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-neo-display text-2xl font-black text-neo-white">{t('daily.howToPlay')}</h1>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border-2 border-neo-black bg-neo-navy-light px-3 py-1.5 text-xs font-black text-neo-cream shadow-hard-sm"
        >
          {t('tutorial.skip')}
        </button>
      </header>

      <ol className="flex flex-col gap-1.5">
        {steps.map((s, i) => (
          <li
            key={s.key}
            data-testid="tutorial-step"
            data-on={s.on}
            className={cn('flex items-center gap-2 font-neo-body text-sm font-bold', s.on ? 'text-neo-white' : 'text-neo-white/45')}
          >
            <span
              className={cn(
                'grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-neo-black text-xs font-black',
                i === 2 && solved ? 'bg-neo-lime text-neo-black' : s.on ? 'bg-neo-purple text-neo-white' : 'bg-neo-navy-light text-neo-white/60',
              )}
            >
              {i === 2 && solved ? <Check className="h-3.5 w-3.5" strokeWidth={3.5} aria-hidden="true" /> : i + 1}
            </span>
            {t(s.key)}
          </li>
        ))}
      </ol>

      <m.div
        animate={shake}
        className={cn(
          'rounded-neo border-neo-thick bg-neo-navy-light px-3 pb-4 pt-4 shadow-hard transition-colors duration-200',
          solved ? 'border-neo-lime' : status === 'wrong' ? 'border-neo-red' : 'border-neo-cream/40',
        )}
      >
        <BridgeStage word1={puzzle.word1} word2={puzzle.word2} isCorrect={solved} isGaveUp={false}>
          {typing.needsIME ? (
            <p className="min-h-[3rem] py-1 text-center font-neo-display text-3xl font-black leading-[3rem] text-neo-cream">
              {solved ? puzzle.bridge : input || <span className="text-neo-cream/40">?</span>}
            </p>
          ) : (
            <AnswerSlots
              value={slotsValue}
              slotCount={typing.slotCap}
              state={solved ? 'correct' : status === 'wrong' ? 'wrong' : 'idle'}
              dir={isRTL ? 'rtl' : 'ltr'}
              label={t('connections.placeholder')}
            />
          )}
        </BridgeStage>

        <div className="mt-3 flex min-h-[2rem] items-center justify-center gap-3" aria-live="polite">
          {status === 'wrong' && <p className="text-sm font-bold text-neo-red">{t('connections.tutorial.tryAgain')}</p>}
          {!solved && misses >= SHOW_ME_AFTER && (
            <button
              type="button"
              data-testid="tutorial-show-me"
              onClick={showMe}
              className="text-sm font-black text-neo-cyan underline underline-offset-2"
            >
              {t('connections.tutorial.showMe')}
            </button>
          )}
          {solved && (
            <m.p
              data-testid="tutorial-solved"
              initial={reduced ? false : { scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={SPRING_PRESETS.bouncy}
              className="inline-flex items-center gap-2 font-neo-display text-xl font-black text-neo-lime"
            >
              {t('connections.correct')}
              <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
            </m.p>
          )}
        </div>

        {solved && <BridgeSolveReveal puzzle={puzzle} language={language} isCorrect />}

        {!solved && (
          <div className="mt-2">
            {typing.needsIME ? (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  lang={language}
                  autoComplete="off"
                  aria-label={t('connections.placeholder')}
                  value={input}
                  onChange={(e) => onInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit();
                  }}
                  placeholder={t('connections.placeholder')}
                  className="min-h-[3.25rem] w-full rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-4 py-3 font-neo-display text-lg font-bold text-neo-white outline-none focus:border-neo-cyan"
                />
                <button
                  type="button"
                  onClick={submit}
                  className="rounded-neo border-neo-thick border-neo-black bg-neo-cyan px-4 py-2.5 font-neo-display font-black text-neo-navy shadow-hard"
                >
                  {t('connections.submit')}
                </button>
              </div>
            ) : (
              <ConnectionsKeyboard
                rows={typing.keyboardRows}
                onLetter={typing.handleLetter}
                onBackspace={typing.handleBackspace}
                onSubmit={submit}
                backspaceLabel={t('connections.backspace')}
                submitLabel={t('connections.submit')}
                canSubmit={input.trim().length > 0}
                disabled={false}
              />
            )}
          </div>
        )}
      </m.div>

      {solved && (
        <m.button
          type="button"
          data-testid="tutorial-start"
          onClick={onDone}
          initial={reduced ? false : { scale: 0.85, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ ...SPRING_PRESETS.bouncy, delay: 0.35 }}
          className="rounded-neo border-3 border-neo-black bg-neo-lime px-5 py-3.5 font-neo-display text-lg font-black text-neo-black shadow-hard"
        >
          {t('connections.tutorial.start')}
        </m.button>
      )}
    </section>
  );
}
