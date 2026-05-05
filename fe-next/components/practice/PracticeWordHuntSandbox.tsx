'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import PracticeChainCta from './PracticeChainCta';
import PracticeCompleteBanner from './PracticeCompleteBanner';
import PracticeInstructions from './PracticeInstructions';
import PracticeMascotReaction, { type PracticeMascotMood } from './PracticeMascotReaction';
import PracticeModeNav from './PracticeModeNav';
import PracticeMicroTip from './PracticeMicroTip';
import PracticePixiFx, { type PracticePixiFxHandle } from './PracticePixiFx';
import { usePracticeJuice } from './usePracticeJuice';
import { usePracticeValidator } from '@/lib/practice/usePracticeValidator';
import { createMicroTutorial, type MicroTutorialBeat } from '@/lib/practice/microTutorial';
import { markPracticeMode } from '@/lib/practice/practiceProgress';
import {
  trackPracticeStarted,
  trackPracticeWordFound,
  trackPracticeCompleted,
} from '@/lib/practice/telemetry';
import { getPracticeStreak } from '@/hooks/usePracticeStreak';
import GridComponent from '@/components/GridComponent';
import { DiscoveredWordsList } from '@/components/daily/DiscoveredWordsList';
import PracticeTargetBoxes from './PracticeTargetBoxes';
import PracticeGuessHistory, { type GuessRow, computeFeedback } from './PracticeGuessHistory';

const BOARDS: Record<string, string[][]> = {
  en: [['S', 'T', 'A', 'R'], ['E', 'O', 'N', 'I'], ['P', 'L', 'A', 'T'], ['E', 'R', 'I', 'N']],
  he: [['ש', 'ל', 'ו', 'מ'], ['ב', 'י', 'ת', 'א'], ['ה', 'נ', 'ר', 'ע'], ['ק', 'ד', 'ח', 'ג']],
  sv: [['S', 'T', 'A', 'R'], ['E', 'O', 'N', 'I'], ['P', 'L', 'A', 'T'], ['E', 'R', 'I', 'N']],
  ja: [['い', 'ぬ', 'か', 'み'], ['ね', 'こ', 'と', 'り'], ['さ', 'く', 'ら', 'ま'], ['は', 'な', 'ゆ', 'き']],
  es: [['C', 'A', 'S', 'A'], ['M', 'E', 'L', 'O'], ['T', 'I', 'A', 'R'], ['E', 'O', 'N', 'P']],
};

// 4-letter targets for visual + difficulty parity with live Word Hunt
// (live target window is 5–6 letters, but practice trims to 4 to keep the
// first-encounter beat scannable). ja stays at 3 — there is no clean 4-kana
// trace on the existing board, and ja learners prefer a familiar word.
const TARGETS: Record<string, string> = {
  en: 'STAR',
  he: 'ארנב',
  sv: 'STAR',
  ja: 'さくら',
  es: 'CASA',
};

// Real Word Hunt MAX_ATTEMPTS — surfaced in the educational tries pill so
// learners see what they'd be racing in live mode.
const REAL_GAME_MAX_TRIES = 7;

/**
 * Word-hunt practice sandbox — visual + behavioral parity with the live
 * Word Hunt mode:
 *  - Target hidden behind solid black `?` boxes (matches real `HintBoxes`).
 *  - A tries pill shows real-game life cost (∞ here · 7 in real game) so
 *    learners see the stakes without paying them.
 *  - Wrong-length guesses give Wordle-style green/yellow/grey feedback.
 *  - A bail-out CTA is always reachable so confident learners can leave
 *    practice and start the live mode mid-flow.
 */
export default function PracticeWordHuntSandbox() {
  const { language, t } = useLanguage();
  const board = BOARDS[language] ?? BOARDS.en;
  const target = TARGETS[language] ?? TARGETS.en;
  const validator = usePracticeValidator(language);
  const juice = usePracticeJuice();
  const fxRef = useRef<PracticePixiFxHandle | null>(null);
  const tutorialRef = useRef(createMicroTutorial({ mode: 'wordHunt' }));
  const [beat, setBeat] = useState<MicroTutorialBeat>(tutorialRef.current.currentBeat());
  const advanceBeat = useCallback(() => setBeat(tutorialRef.current.currentBeat()), []);

  const [solved, setSolved] = useState(false);
  const [discoveries, setDiscoveries] = useState<
    Array<{ word: string; timestamp: number; lifeGained: number; tokensGained: number }>
  >([]);
  const [feedback, setFeedback] = useState<'ok' | 'bad' | null>(null);
  const [guessHistory, setGuessHistory] = useState<GuessRow[]>([]);

  const startedAtRef = useRef(0);
  const completedFiredRef = useRef(false);

  useEffect(() => {
    startedAtRef.current = Date.now();
    trackPracticeStarted({ mode: 'wordHunt', locale: language });
  }, [language]);

  useEffect(() => {
    if (solved && !completedFiredRef.current) {
      completedFiredRef.current = true;
      markPracticeMode('wordHunt', language);
      trackPracticeCompleted({
        mode: 'wordHunt',
        locale: language,
        wordsFound: 1,
        durationSeconds: Math.round((Date.now() - startedAtRef.current) / 1000),
        streakDay: getPracticeStreak().current,
      });
      tutorialRef.current.dispatch({ type: 'goal-reached', count: 1 });
      advanceBeat();
    }
  }, [solved, language, advanceBeat]);

  const handleWordSubmit = useCallback(async (rawWord: string) => {
    if (rawWord.length < 2) return;

    // Target win — full reveal + lime fill.
    if (rawWord === target) {
      setSolved(true);
      setFeedback('ok');
      setGuessHistory((rows) => [
        ...rows,
        { word: rawWord, feedback: new Array(rawWord.length).fill('correct' as const) },
      ]);
      const cells = Array.from(document.querySelectorAll('[data-row][data-col]')) as HTMLElement[];
      const positions = cells.slice(0, rawWord.length).map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, el };
      });
      juice.triggerWordFound(positions);
      tutorialRef.current.dispatch({ type: 'word-found' });
      advanceBeat();
      return;
    }

    // Same-length wrong guesses produce Wordle feedback in history.
    if (rawWord.length === target.length) {
      setGuessHistory((rows) => [
        ...rows,
        { word: rawWord, feedback: computeFeedback(rawWord, target) },
      ]);
    }

    const result = await validator.check(rawWord);
    if (result.isValid) {
      const already = discoveries.some((d) => d.word === rawWord);
      if (!already) {
        setDiscoveries((d) => [
          ...d,
          { word: rawWord, timestamp: Date.now(), lifeGained: 0, tokensGained: 0 },
        ]);
        trackPracticeWordFound({
          mode: 'wordHunt', locale: language, word: rawWord, wordsFound: discoveries.length + 1,
        });
      }
      setFeedback('ok');
    } else {
      setFeedback('bad');
      const tile = document.querySelector('[data-row][data-col]');
      if (tile) juice.triggerInvalid(tile);
    }
  }, [target, validator, juice, language, discoveries, advanceBeat]);

  const onSelectionChange = useCallback(() => {
    tutorialRef.current.dispatch({ type: 'drag-started' });
    advanceBeat();
  }, [advanceBeat]);

  const mascotReaction: PracticeMascotMood = solved
    ? 'celebrate'
    : feedback === 'ok'
      ? 'cheer'
      : feedback === 'bad'
        ? 'wrong'
        : 'idle';

  const dir: 'ltr' | 'rtl' = language === 'he' ? 'rtl' : 'ltr';
  const liveHref = `/${language}/daily/word-hunt`;

  return (
    <div className="relative flex flex-col items-stretch w-full max-w-md mx-auto px-4 pt-4 pb-bottom-stack gap-3 min-h-[calc(100dvh-var(--bottom-stack-height,5rem))]">
      <PracticePixiFx ref={fxRef} />
      <PracticeMascotReaction mode="wordHunt" reaction={mascotReaction} />

      {/* HUD strip — mode nav + educational tries pill mimicking the real
          game's `X/MAX_ATTEMPTS tries left` so learners see the stakes. */}
      <div className="w-full flex items-center justify-between gap-2">
        <PracticeModeNav current="wordHunt" />
        <div
          data-testid="practice-tries-chip"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neo-navy/60 border-2 border-neo-cream/15 text-neo-cream text-[10px] sm:text-xs font-neo-display font-black whitespace-nowrap"
          title={t('practice.wordHunt.livesNote', { max: REAL_GAME_MAX_TRIES })}
        >
          <Heart className="w-3 h-3 text-neo-pink fill-neo-pink" aria-hidden />
          <span>∞ · {REAL_GAME_MAX_TRIES} {t('practice.wordHunt.realGameLabel')}</span>
        </div>
      </div>

      <PracticeInstructions mode="wordHunt" />

      {/* Top stack ends here — board + history + CTA stretch below */}
      <div className="flex flex-col items-center gap-3 flex-1 w-full">
        <div data-testid="practice-target" className="flex flex-col items-center gap-1.5 w-full">
          <span className="text-xs uppercase font-neo-display font-black text-neo-cream/70 tracking-wider">
            {t('practice.wordHunt.targetLabel')}
          </span>
          <PracticeTargetBoxes
            word={target}
            solved={solved}
            dir={dir}
            hidden
          />
          <p className="text-[10px] sm:text-xs text-neo-cream/60 text-center max-w-xs px-2 mt-1">
            {t('practice.wordHunt.livesNote', { max: REAL_GAME_MAX_TRIES })}
          </p>
        </div>

        <PracticeGuessHistory rows={guessHistory} dir={dir} />

        <PracticeMicroTip
          beat={beat}
          onDismiss={() => {
            tutorialRef.current.dispatch({ type: 'beat-completed' });
            advanceBeat();
          }}
        />

        <div data-testid="practice-board" className="w-full max-w-xs aspect-square mx-auto">
          <GridComponent
            grid={board}
            interactive
            onWordSubmit={handleWordSubmit}
            onSelectionChange={onSelectionChange}
            hideComboIndicator
            language={language}
          />
        </div>

        {discoveries.length > 0 && (
          <div className="w-full" data-testid="practice-discoveries">
            <DiscoveredWordsList words={discoveries} t={t} />
          </div>
        )}
      </div>

      {/* Bail-out CTA — pinned to bottom via mt-auto. Visible whether solved
          or not so confident learners can drop into live mode at any time. */}
      <div className="mt-auto flex flex-col gap-2 w-full">
        {solved && <PracticeCompleteBanner mode="wordHunt" />}
        {solved ? (
          <PracticeChainCta
            currentMode="wordHunt"
            className="inline-flex items-center justify-center w-full bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed"
          />
        ) : (
          <Link
            href={liveHref}
            data-testid="practice-bailout-cta"
            className="inline-flex items-center justify-center w-full bg-neo-pink text-neo-cream border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed active:translate-x-[1px] active:translate-y-[1px]"
          >
            {t('practice.wordHunt.bailoutCta')}
          </Link>
        )}
      </div>
    </div>
  );
}
