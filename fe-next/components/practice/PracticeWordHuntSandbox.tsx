'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
// Reuse REAL game grid + discoveries list. Drag input, animations,
// keyboard, accessibility — all match production.
import GridComponent from '@/components/GridComponent';
import { DiscoveredWordsList } from '@/components/daily/DiscoveredWordsList';

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

/**
 * Word-hunt practice sandbox — uses the REAL <GridComponent> for the
 * board (drag, keyboard, accessibility, combo escalation all inherited).
 * Practice-only chrome adds:
 *   - target word panel above the grid
 *   - bonus discoveries list (DiscoveredWordsList from real game)
 *
 * Mirrors real word-hunt-survival WITHOUT life drain or timer (per
 * "make it like real but without stress" requirement).
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
    if (rawWord === target) {
      setSolved(true);
      setFeedback('ok');
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

  return (
    <div className="relative flex flex-col items-center w-full max-w-md mx-auto px-4 pt-4 pb-bottom-stack gap-3">
      <PracticePixiFx ref={fxRef} />
      <PracticeMascotReaction mode="wordHunt" reaction={mascotReaction} />
      <PracticeModeNav current="wordHunt" />

      <PracticeInstructions mode="wordHunt" />

      <div data-testid="practice-target" className="flex flex-col items-center gap-1 w-full">
        <span className="text-xs uppercase font-neo-display font-black text-neo-cream/70 tracking-wider">
          {t('practice.wordHunt.targetLabel')}
        </span>
        <div
          data-testid="practice-target-word"
          className={
            'px-4 py-2 rounded-neo border-3 font-neo-display font-black text-2xl tracking-widest shadow-hard ' +
            (solved
              ? 'bg-neo-lime border-neo-black text-neo-black'
              : 'bg-neo-navy-light border-neo-lime text-neo-cream')
          }
        >
          {target}
        </div>
      </div>

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
          className="mt-2 inline-flex items-center justify-center w-full bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed"
        />
      )}
    </div>
  );
}
