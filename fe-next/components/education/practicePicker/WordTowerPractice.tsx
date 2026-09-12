'use client';

/**
 * WordTowerPractice — Word Tower, seeded by the teacher's word list.
 *
 * "One word list, many games": the lesson's words become the letters on the
 * wheel, so climbing the tower IS practising this week's list. Ordinary
 * dictionary words still score height; a lesson word scores height AND ticks
 * off the checklist.
 *
 * Why this composes the ENGINE rather than reusing `WordTowerPlay`: that
 * component is the daily/endless surface and carries three behaviours a
 * classroom run must not have — it restores the player's saved `wt-session-*`
 * tower over any seeded state (the guard compares floor counts, and a fresh
 * lesson seed has none, so the save always wins and the lesson letters are
 * lost), it writes the run back into that same save key, and with `daily=false`
 * it POSTs the climb to the global endless leaderboard. So this wraps
 * `useWordTower` (the same reducer, validation, scoring and combo) and the real
 * `WordTowerWheel`, and leaves the crane/physics/leaderboard layer out.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import PracticeCompletionMoment from '@/components/education/practice/PracticeCompletionMoment';
import { PracticeInsufficientData } from '@/components/practice/PracticeInsufficientData';
import { DRILL_ROOT_CLASS } from '@/components/practice/drillLayout';
import { ArrowLeft, Check, Blocks } from 'lucide-react';
import type { Language } from '@/shared/types/game';
import { WORD_TOWER_MIN_WORD_LEN } from '@/shared/constants/wordTowerConstants';
import { loadWordCraftDictionary } from '@/lib/word-craft/dictionary';
import type { SupportedLocale } from '@/lib/word-craft/tileBag';
import { useWordTower } from '@/lib/wordTower/useWordTower';
import { initWordTowerState } from '@/lib/wordTower/wordTowerManager';
import { WordTowerWheel } from '@/components/wordTower/WordTowerWheel';
import {
  buildLessonSeed,
  canonLessonWord,
  matchLessonTarget,
  nextLessonTarget,
  LESSON_HIT_POINTS,
} from '@/lib/wordTower/lessonSeed';

/** Locales the Word Craft dictionary ships — see `lessonSeedSupportsLanguage`. */
const DICTIONARY_LOCALES: SupportedLocale[] = ['en', 'he', 'sv', 'es', 'ja'];

/** Wheel glow colour. Cosmetic only — the wheel takes a raw hex, not a token. */
const ACCENT_HEX = '#22D3EE';

export interface WordTowerPracticeResults {
  /** Lesson words the student actually built, canonical. */
  vocabularyWordsFound: string[];
  /** Every word placed this run. */
  wordsFound: string[];
  /** Floors climbed. */
  floors: number;
  /** Practice score: the climb, plus a bonus per lesson word. */
  score: number;
}

export interface WordTowerPracticeProps {
  /** The lesson's words, raw as the teacher typed them. */
  words: string[];
  language: Language;
  onComplete: (results: WordTowerPracticeResults) => void | Promise<void>;
  onBack: () => void;
  /** Jump straight into the next ready mode, when the lesson offers one. */
  onNext?: () => void;
  /** Human name of that next mode, for the button label. */
  nextLabel?: string;
}

/**
 * One run of the tower. `useWordTower` builds its reducer state once, so the
 * only honest way to hand a student a genuinely fresh tower is to remount this
 * — which is exactly what the exported wrapper below does by bumping a key.
 * Resetting in place would leave the reducer's tray and combo state behind
 * (recurring pitfall Class 2: stale mutable state across a reset path).
 */
function WordTowerRun({
  words,
  language,
  onComplete,
  onBack,
  onNext,
  nextLabel,
  onAgain,
}: WordTowerPracticeProps & { onAgain: () => void }) {
  const { t, dir } = useLanguage();

  const seed = useMemo(() => buildLessonSeed(words, language), [words, language]);
  const seeded = seed.tray.length > 0;

  // Lesson words are authoritative for THIS run: a teacher's list can hold a
  // proper noun or a domain term the general dictionary has never heard of, and
  // rejecting the very words the tile promised would be the worst failure here.
  const lessonWords = useMemo(
    () => new Set([...seed.targets, ...seed.extraWords]),
    [seed]
  );

  const [dict, setDict] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (!seeded) return;
    let live = true;
    const locale = DICTIONARY_LOCALES.includes(language as SupportedLocale)
      ? (language as SupportedLocale)
      : 'en';
    loadWordCraftDictionary(locale)
      .then((loaded) => {
        if (live) setDict(loaded);
      })
      .catch(() => {
        // Never strand the student on a spinner: fall back to the lesson's own
        // words so the checklist is still completable, just without the bonus
        // of ordinary words scoring height.
        if (live) setDict(new Set(lessonWords));
      });
    return () => {
      live = false;
    };
  }, [seeded, language, lessonWords]);

  const isInDictionary = useCallback(
    (canonWord: string) => lessonWords.has(canonWord) || (dict?.has(canonWord) ?? false),
    [dict, lessonWords]
  );

  // The lesson seed replaces the random ring; everything else about the run is
  // the stock opening state.
  const initialGame = useMemo(
    () => ({
      ...initWordTowerState({ gameCode: 'lesson', playerId: 'student', language }),
      tray: seed.tray,
    }),
    [language, seed]
  );

  const tower = useWordTower({
    language,
    sessionId: 'lesson',
    isInDictionary,
    initialGame,
  });
  const { game } = tower.state;

  const [hits, setHits] = useState<string[]>([]);
  const [lastHit, setLastHit] = useState<string | null>(null);

  // A floor only lands after the reducer accepted the word, so reading the
  // newest floor is the one place a hit can be counted exactly once — counting
  // inside `isInDictionary` would over-count every rejected duplicate.
  const resultKey = tower.state.resultKey;
  const seenKey = useRef(0);
  useEffect(() => {
    if (resultKey === seenKey.current) return;
    seenKey.current = resultKey;
    const floor = game.floors[game.floors.length - 1];
    if (!floor) return;
    const hit = matchLessonTarget(floor.word, seed, language);
    if (!hit) return;
    setLastHit(hit);
    setHits((prev) => (prev.includes(hit) ? prev : [...prev, hit]));
  }, [resultKey, game.floors, seed, language]);

  const finishedRef = useRef(false);
  // Word Tower used to report its result and get unmounted in the same tick —
  // the student's reward for topping out was being dropped back on the tile
  // grid. It now holds the screen and shows the same completion moment as
  // every other mode.
  const [done, setDone] = useState(false);
  const handleDone = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setDone(true);
    void onComplete({
      vocabularyWordsFound: hits,
      wordsFound: game.floors.map((floor) => floor.word),
      floors: game.floors.length,
      score: Math.round(game.heightM) + hits.length * LESSON_HIT_POINTS,
    });
  }, [hits, game.floors, game.heightM, onComplete]);



  if (done) {
    return (
      <div className="flex w-full items-center justify-center py-4" data-testid="word-tower-complete">
        <PracticeCompletionMoment
          correct={hits.length}
          total={seed.targets.length}
          stats={[
            { key: 'floors', label: t('student.practiceFun.floors'), value: `${game.floors.length}` },
            { key: 'height', label: t('student.practiceFun.height'), value: `${Math.round(game.heightM)}m` },
          ]}
          onAgain={onAgain}
          onBack={onBack}
          onNext={onNext}
          nextLabel={nextLabel}
        />
      </div>
    );
  }

  /*
    A lesson whose words can never seed the wheel gets the same dead-end panel
    every other drill shows, rather than a mode-specific one-liner. `testId`
    keeps the marker the Word Tower suite has always asserted on.
  */
  if (!seeded) {
    return (
      <PracticeInsufficientData onBack={onBack} testId="word-tower-practice-unavailable" />
    );
  }

  const next = nextLessonTarget(seed, new Set(hits));
  const canBuild = tower.word.length >= WORD_TOWER_MIN_WORD_LEN;

  return (
    <div className={cn(DRILL_ROOT_CLASS, 'w-full rounded-neo border-[3px] border-black p-4')}>
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          aria-label={t('common.back')}
          className="text-neo-white hover:text-neo-white hover:bg-neo-white/10"
        >
          <DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 min-w-0 text-xl font-neo-display text-neo-white text-balance">
          {t('education.practicePicker.name.word_tower')}
        </h1>
        <button
          type="button"
          data-testid="word-tower-practice-done"
          onClick={handleDone}
          className="shrink-0 rounded-neo border-[2px] border-black bg-neo-lime px-3 py-1.5 font-neo-display text-sm font-black uppercase text-black shadow-hard active:translate-y-0.5"
        >
          {t('education.wordTowerPractice.done')}
        </button>
      </div>

      {/* Checklist — the lesson, not the score. This is the reason the mode exists. */}
      <p
        data-testid="word-tower-practice-hits"
        data-count={hits.length}
        className="text-xs font-neo-body font-bold uppercase text-neo-cream tabular-nums mb-2"
      >
        {t('education.wordTowerPractice.progress', {
          found: hits.length,
          total: seed.targets.length,
        })}
      </p>
      <ul className="flex flex-wrap gap-2 mb-4 shrink-0 overflow-y-auto max-h-24">
        {seed.targets.map((target) => {
          const isHit = hits.includes(target);
          return (
            <li
              key={target}
              data-testid={`word-tower-practice-target-${target}`}
              data-hit={isHit ? 'true' : 'false'}
              className={cn(
                'flex items-center gap-1 rounded-neo border-[2px] border-black px-2 py-1 font-neo-display text-sm font-black uppercase',
                isHit
                  ? 'bg-neo-lime text-black'
                  : target === next
                    ? 'bg-neo-yellow text-black'
                    : 'bg-neo-white/15 text-neo-white/80'
              )}
            >
              {isHit && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
              {/* Unbuilt targets stay hidden — showing the word would make the
                  drill a copying exercise rather than a spelling one. */}
              {isHit ? target : '•'.repeat(target.length)}
            </li>
          );
        })}
      </ul>

      <p
        data-testid="word-tower-practice-floors"
        data-floors={game.floors.length}
        className="flex items-center gap-2 text-sm font-neo-body text-neo-white/85 mb-3 tabular-nums"
      >
        <Blocks className="w-4 h-4" aria-hidden="true" />
        {t('education.wordTowerPractice.height', {
          height: Math.round(game.heightM),
          floors: game.floors.length,
        })}
      </p>

      {lastHit && (
        <p
          role="status"
          className="mb-3 rounded-neo border-[2px] border-black bg-neo-lime px-3 py-1.5 font-neo-display text-sm font-black uppercase text-black"
        >
          {t('education.wordTowerPractice.hit', { word: lastHit })}
        </p>
      )}

      {/* The wheel takes whatever height the checklist above leaves it. */}
      <div className="relative mx-auto aspect-square w-full max-w-sm flex-1 min-h-0">
        <WordTowerWheel
          tray={game.tray}
          selected={tower.state.selected}
          word={tower.word}
          placing={false}
          canBuild={canBuild}
          intensity={Math.min(1, game.floors.length / 12)}
          accentHex={ACCENT_HEX}
          dir={dir}
          t={t}
          // No scramble or reroll control is mounted, and this is deliberate:
          // `tower.scramble` / `tower.reroll` redraw the ring from the random
          // language bag, which would throw the lesson letters away mid-run and
          // leave the checklist uncompletable. Anyone adding a "new letters"
          // button here must restore `seed.tray`, not call the manager's draw.
          onSelectTile={tower.selectTile}
          onDeselectTile={tower.deselectTile}
          onSubmit={tower.submit}
          // Placement is the crane layer, which this classroom surface does not
          // mount — a built word goes straight onto the tower.
          onDrop={tower.submit}
        />
      </div>
    </div>
  );
}

/** Canonical form of a lesson word, for callers matching against results. */
export { canonLessonWord };

/**
 * Public entry point. Holds nothing but the run key, so AGAIN on the
 * completion card gives the student a genuinely new tower rather than a
 * half-cleared one.
 */
export default function WordTowerPractice(props: WordTowerPracticeProps) {
  const [runKey, setRunKey] = useState(0);
  return (
    <WordTowerRun
      key={runKey}
      {...props}
      onAgain={() => setRunKey((k) => k + 1)}
    />
  );
}
