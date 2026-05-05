'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { CATEGORY_EMOJIS, getCategoryLabel } from '@/shared/data/wordCategories';

const BOARDS: Record<string, string[][]> = {
  en: [['S', 'T', 'A', 'R'], ['E', 'O', 'N', 'I'], ['P', 'L', 'A', 'T'], ['E', 'R', 'I', 'N']],
  he: [['ש', 'ל', 'ו', 'מ'], ['ב', 'י', 'ת', 'א'], ['ה', 'נ', 'ר', 'ע'], ['ק', 'ד', 'ח', 'ג']],
  sv: [['S', 'T', 'A', 'R'], ['E', 'O', 'N', 'I'], ['P', 'L', 'A', 'T'], ['E', 'R', 'I', 'N']],
  ja: [['い', 'ぬ', 'か', 'み'], ['ね', 'こ', 'と', 'り'], ['さ', 'く', 'ら', 'ま'], ['は', 'な', 'ゆ', 'き']],
  es: [['C', 'A', 'S', 'A'], ['M', 'E', 'L', 'O'], ['T', 'I', 'A', 'R'], ['E', 'O', 'N', 'P']],
};

const TARGETS: Record<string, string> = {
  en: 'STAR',
  he: 'בית',
  sv: 'STAR',
  ja: 'ねこ',
  es: 'CASA',
};

// Per-locale category for the target — drives the emoji hint that mirrors
// real WordHunt's `WordHuntCategoryHint`. Practice picks a fixed category
// per locale (live mode picks dynamically from the category index).
const TARGET_CATEGORY: Record<string, string> = {
  en: 'nature',  // STAR
  he: 'home',    // בית = house
  sv: 'nature',  // STAR
  ja: 'animals', // ねこ = cat
  es: 'home',    // CASA = house
};

const HINT_COLLAPSE_MS = 10_000;

/**
 * Word-hunt practice sandbox — full visual + behavioral parity with the
 * live Word Hunt mode:
 *  - Target word is HIDDEN behind `?` blanks until solved (real-mode parity).
 *  - A category emoji + label appears above the blanks for 10 s, then
 *    collapses to emoji-only, mirroring `WordHuntCategoryHint`.
 *  - Wrong-length guesses give Wordle-style green/yellow/grey feedback for
 *    free (educational signal — no life cost in practice).
 *  - Correct-length wrong guesses reveal feedback rows in history (live
 *    mode would deduct life; practice does not, to stay stress-free).
 *  - A scoring footnote spells out the live-mode scoring rules so players
 *    know what to expect when they leave practice.
 *
 * Validation goes through the practice validator (offline-friendly,
 * session-cached). Practice carries no timer + no death.
 */
export default function PracticeWordHuntSandbox() {
  const { language, t } = useLanguage();
  const board = BOARDS[language] ?? BOARDS.en;
  const target = TARGETS[language] ?? TARGETS.en;
  const category = TARGET_CATEGORY[language] ?? TARGET_CATEGORY.en;
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
  const [hintExpanded, setHintExpanded] = useState(true);

  const startedAtRef = useRef(0);
  const completedFiredRef = useRef(false);

  // Auto-collapse the category hint after 10s — same UX as live mode.
  useEffect(() => {
    const timer = setTimeout(() => setHintExpanded(false), HINT_COLLAPSE_MS);
    return () => clearTimeout(timer);
  }, []);

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
  const emoji = CATEGORY_EMOJIS[category] ?? '';
  const categoryLabel = useMemo(
    () => t('practice.wordHunt.categoryHint', {
      length: target.length,
      category: getCategoryLabel(category, language),
    }),
    [t, target.length, category, language],
  );

  return (
    <div className="relative flex flex-col items-center w-full max-w-md mx-auto px-4 pt-4 pb-bottom-stack gap-3 min-h-[calc(100dvh-var(--bottom-stack-height,5rem))]">
      <PracticePixiFx ref={fxRef} />
      <PracticeMascotReaction mode="wordHunt" reaction={mascotReaction} />

      {/* HUD strip — mode nav + a chill "no stress" badge so first-time
          players see at a glance that this is a sandbox, not the live
          survival mode. */}
      <div className="w-full flex items-center justify-between gap-2">
        <PracticeModeNav current="wordHunt" />
        <div
          data-testid="practice-tries-chip"
          className="px-2.5 py-1 rounded-full bg-neo-lime/20 border border-neo-lime text-neo-cream text-xs font-neo-display font-black whitespace-nowrap"
        >
          {t('practice.wordHunt.chillChip')}
        </div>
      </div>

      <PracticeInstructions mode="wordHunt" />

      {/* Category hint — shows full label for 10s, then collapses to emoji.
          Click the emoji to re-expand. */}
      <div
        data-testid="practice-category-hint"
        className="flex items-center justify-center min-h-[1.75rem]"
      >
        {hintExpanded ? (
          <button
            type="button"
            data-testid="practice-category-hint-expanded"
            onClick={() => setHintExpanded(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-neo-lime bg-neo-lime/15 text-neo-cream text-xs font-neo-display font-black animate-fade-in"
          >
            <span>{categoryLabel}</span>
            {emoji && <span aria-hidden className="text-base">{emoji}</span>}
          </button>
        ) : (
          emoji && (
            <button
              type="button"
              data-testid="practice-category-hint-collapsed"
              onClick={() => setHintExpanded(true)}
              aria-label={categoryLabel}
              title={categoryLabel}
              className="text-xl cursor-pointer hover:scale-110 transition-transform animate-fade-in"
            >
              {emoji}
            </button>
          )
        )}
      </div>

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
      </div>

      <PracticeGuessHistory rows={guessHistory} dir={dir} />

      <PracticeMicroTip
        beat={beat}
        onDismiss={() => {
          tutorialRef.current.dispatch({ type: 'beat-completed' });
          advanceBeat();
        }}
      />

      <div data-testid="practice-board" className="w-full max-w-xs aspect-square">
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

      {solved && <PracticeCompleteBanner mode="wordHunt" />}
      {solved && (
        <PracticeChainCta
          currentMode="wordHunt"
          className="mt-auto inline-flex items-center justify-center w-full bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed"
        />
      )}
    </div>
  );
}
