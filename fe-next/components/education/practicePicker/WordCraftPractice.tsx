'use client';

/**
 * WordCraftPractice — Word Craft as classroom homework.
 *
 * Hosts the STOCK game view (solo vs an easy bot) rather than re-composing the
 * engine: the view is 1,275 lines of board, rack, drag, bot turns and juice, and
 * a second copy would drift. It learns the game finished through
 * `onWordCraftGameEnd` (fired by the same call that logs the game to analytics),
 * so the game view needed no new prop.
 *
 * Lesson words: the round is dealt in the LESSON's language (not the UI's) and
 * the deal is seeded so every lesson word is buildable (lib/word-craft/lessonBag.ts).
 * Every lesson word built is reported as `vocabularyWordsFound` (what solo_board
 * XP pays for), all the player's words as `wordsFound`. A round below
 * `wordCraftAttemptIsMeaningful` only counts as an attempt — the server decides;
 * this screen mirrors the rule to nudge the student into another go.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Play, Grid2x2, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import PracticeCompletionMoment from '@/components/education/practice/PracticeCompletionMoment';
import { DRILL_ROOT_CLASS } from '@/components/practice/drillLayout';
import { WordCraftGameView } from '@/components/word-craft/WordCraftGameScreen';
import { onWordCraftGameEnd } from '@/components/word-craft/wordCraftTelemetry';
import { canonLessonWord } from '@/lib/wordTower/lessonSeed';
import { lessonWordsPlayed, wordCraftAttemptIsMeaningful, WORDCRAFT_MIN_VALID_WORDS } from '@/lib/education/wordcraftAssignment';
import { lessonTargetsFor, wordCraftLocaleFor } from '@/lib/word-craft/lessonBag';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/supabase/education/types';

export interface WordCraftPracticeResults {
  /** Lesson words the student built, canonical, each once. */
  vocabularyWordsFound: string[];
  /** Every word the player built (bot moves excluded), each once. */
  wordsFound: string[];
  score: number;
  botScore: number;
  won: boolean;
}

export interface WordCraftPracticeProps {
  /** The lesson's words, raw as the teacher typed them. */
  words: string[];
  language: Language;
  onComplete: (results: WordCraftPracticeResults) => void | Promise<void>;
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
}

type Phase = { name: 'intro' } | { name: 'playing'; seed: number } | { name: 'done'; results: WordCraftPracticeResults };

const newSeed = () => Math.floor(Math.random() * 1_000_000);

export default function WordCraftPractice({ words, language, onComplete, onBack, onNext, nextLabel }: WordCraftPracticeProps) {
  const { t, language: uiLanguage } = useLanguage();
  const [phase, setPhase] = useState<Phase>({ name: 'intro' });
  const targets = useMemo(
    () => [...new Set(words.map((w) => canonLessonWord(w, language)).filter(Boolean))],
    [words, language],
  );
  // Dealt in the lesson's language with its words seeded; ru has no Word Craft bag → UI locale, unseeded.
  const deal = useMemo(() => {
    const { locale, seeded } = wordCraftLocaleFor(language, uiLanguage ?? 'en');
    return { locale, targets: seeded ? lessonTargetsFor(words, locale) : [] };
  }, [words, language, uiLanguage]);

  // Latest props for the listener without re-subscribing on every render.
  const latest = useRef({ words, language, onComplete });
  useEffect(() => {
    latest.current = { words, language, onComplete };
  });

  const playing = phase.name === 'playing';
  useEffect(() => {
    if (!playing) return;
    let reported = false;
    return onWordCraftGameEnd((state, { hotseat }) => {
      if (reported || hotseat) return;
      reported = true;
      const { words: lessonWords, language: lang, onComplete: report } = latest.current;
      const results: WordCraftPracticeResults = {
        vocabularyWordsFound: lessonWordsPlayed(state.history, lessonWords, lang),
        wordsFound: [...new Set(state.history.filter((m) => m.who === 'player').flatMap((m) => m.words))],
        score: state.player.score,
        botScore: state.bot.score,
        won: state.player.score > state.bot.score,
      };
      setPhase({ name: 'done', results });
      void report(results);
    });
  }, [playing]);

  if (phase.name === 'playing') {
    return (
      <div className="fixed inset-0 z-50 bg-neo-navy" data-testid="wordcraft-practice-game">
        <WordCraftGameView seed={phase.seed} duel={null} hotseat={false} difficulty="easy" modifierOverride="none" lesson={{ ...deal, onExit: onBack }} />
      </div>
    );
  }

  if (phase.name === 'done') {
    const { results } = phase;
    if (!wordCraftAttemptIsMeaningful({ lessonWordsFound: results.vocabularyWordsFound, validWordsFound: results.wordsFound })) {
      return (
        <div className={cn(DRILL_ROOT_CLASS, 'w-full rounded-neo border-[3px] border-black p-4 text-center')} data-testid="wordcraft-practice-nudge">
          <Grid2x2 className="w-10 h-10 mx-auto mb-2 text-neo-cyan" aria-hidden="true" />
          <p className="font-neo-display text-lg text-neo-white mb-4 text-balance">
            {t('education.wordcraftAssignment.needLessonWord', { count: WORDCRAFT_MIN_VALID_WORDS })}
          </p>
          <button
            type="button"
            data-testid="wordcraft-practice-retry"
            onClick={() => setPhase({ name: 'playing', seed: newSeed() })}
            className="w-full min-h-14 mb-2 flex items-center justify-center gap-2 rounded-neo border-[3px] border-black bg-neo-lime font-neo-display text-xl font-black uppercase text-black shadow-hard active:translate-y-0.5 active:shadow-none"
          >
            <RotateCcw className="w-6 h-6" aria-hidden="true" />
            {t('education.wordcraftAssignment.tryAgain')}
          </button>
          <Button variant="ghost" onClick={onBack} className="w-full text-neo-white hover:text-neo-white hover:bg-neo-white/10">
            {t('common.back')}
          </Button>
        </div>
      );
    }
    return (
      <div className="flex w-full items-center justify-center py-4" data-testid="wordcraft-practice-complete">
        <PracticeCompletionMoment
          correct={results.vocabularyWordsFound.length}
          total={targets.length}
          stats={[
            { key: 'score', label: t('education.wordcraftAssignment.score'), value: `${results.score}` },
            {
              key: 'result',
              label: t('education.wordcraftAssignment.result'),
              value: t(
                results.won ? 'education.wordcraftAssignment.won'
                  : results.score === results.botScore ? 'education.wordcraftAssignment.tie'
                  : 'education.wordcraftAssignment.lost',
              ),
            },
          ]}
          onAgain={() => setPhase({ name: 'playing', seed: newSeed() })}
          onBack={onBack}
          onNext={onNext}
          nextLabel={nextLabel}
        />
      </div>
    );
  }

  return (
    <div className={cn(DRILL_ROOT_CLASS, 'w-full rounded-neo border-[3px] border-black p-4')} data-testid="wordcraft-practice-intro">
      <div className="flex items-center gap-2 mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          aria-label={t('common.back')}
          className="text-neo-white hover:text-neo-white hover:bg-neo-white/10"
        >
          <DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 min-w-0 flex items-center gap-2 text-xl font-neo-display text-neo-white text-balance">
          <Grid2x2 className="w-6 h-6 text-neo-cyan shrink-0" aria-hidden="true" />
          {t('education.wordcraftAssignment.title')}
        </h1>
      </div>
      <p className="font-neo-body text-neo-white/85 mb-3 text-pretty">{t('education.wordcraftAssignment.intro')}</p>
      {targets.length > 0 && (
        <>
          <h2 className="text-xs font-neo-display uppercase tracking-wider text-neo-cream/80 mb-2">
            {t('education.wordcraftAssignment.lessonWords')}
          </h2>
          <ul className="flex flex-wrap gap-2 mb-5" translate="no">
            {targets.slice(0, 24).map((word) => (
              <li
                key={word}
                className="rounded-neo border-2 border-black bg-neo-cream px-2 py-1 font-neo-display text-sm font-bold text-neo-black"
              >
                {word}
              </li>
            ))}
          </ul>
        </>
      )}
      <button
        type="button"
        data-testid="wordcraft-practice-play"
        onClick={() => setPhase({ name: 'playing', seed: newSeed() })}
        className="w-full min-h-14 flex items-center justify-center gap-2 rounded-neo border-[3px] border-black bg-neo-lime font-neo-display text-xl font-black uppercase text-black shadow-hard active:translate-y-0.5 active:shadow-none"
      >
        <Play className="w-6 h-6" aria-hidden="true" />
        {t('education.wordcraftAssignment.play')}
      </button>
    </div>
  );
}
