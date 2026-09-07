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
}

export default function WordTowerPractice({
  words,
  language,
  onComplete,
  onBack,
}: WordTowerPracticeProps) {
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
  const handleDone = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    void onComplete({
      vocabularyWordsFound: hits,
      wordsFound: game.floors.map((floor) => floor.word),
      floors: game.floors.length,
      score: Math.round(game.heightM) + hits.length * LESSON_HIT_POINTS,
    });
  }, [hits, game.floors, game.heightM, onComplete]);

  if (!seeded) {
    return (
      <div className="w-full bg-neo-navy p-4 rounded-neo border-3 border-black">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          aria-label={t('common.back')}
          className="text-neo-white hover:text-neo-white hover:bg-neo-white/10"
        >
          <DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />
        </Button>
        <p
          data-testid="word-tower-practice-unavailable"
          role="status"
          className="mt-3 text-sm font-neo-body text-neo-white/85 text-pretty"
        >
          {t('education.wordTowerPractice.unavailable')}
        </p>
      </div>
    );
  }

  const next = nextLessonTarget(seed, new Set(hits));
  const canBuild = tower.word.length >= WORD_TOWER_MIN_WORD_LEN;

  return (
    <div className="w-full bg-neo-navy rounded-neo border-3 border-black p-4">
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
        <h1 className="flex-1 min-w-0 text-xl font-neo-display text-neo-white text-balance">
          {t('education.practicePicker.name.word_tower')}
        </h1>
        <button
          type="button"
          data-testid="word-tower-practice-done"
          onClick={handleDone}
          className="shrink-0 rounded-neo border-2 border-black bg-neo-lime px-3 py-1.5 font-neo-display text-sm font-black uppercase text-black shadow-hard active:translate-y-0.5"
        >
          {t('education.wordTowerPractice.done')}
        </button>
      </div>

      {/* Checklist — the lesson, not the score. This is the reason the mode exists. */}
      <p
        data-testid="word-tower-practice-hits"
        data-count={hits.length}
        className="text-xs font-neo-body font-bold uppercase text-neo-white/70 tabular-nums mb-2"
      >
        {t('education.wordTowerPractice.progress', {
          found: hits.length,
          total: seed.targets.length,
        })}
      </p>
      <ul className="flex flex-wrap gap-2 mb-4">
        {seed.targets.map((target) => {
          const isHit = hits.includes(target);
          return (
            <li
              key={target}
              data-testid={`word-tower-practice-target-${target}`}
              data-hit={isHit ? 'true' : 'false'}
              className={cn(
                'flex items-center gap-1 rounded-neo border-2 border-black px-2 py-1 font-neo-display text-sm font-black uppercase',
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
          className="mb-3 rounded-neo border-2 border-black bg-neo-lime px-3 py-1.5 font-neo-display text-sm font-black uppercase text-black"
        >
          {t('education.wordTowerPractice.hit', { word: lastHit })}
        </p>
      )}

      <div className="relative mx-auto aspect-square w-full max-w-sm">
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
