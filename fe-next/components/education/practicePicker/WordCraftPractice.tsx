'use client';

/**
 * WordCraftPractice — Word Craft (territory vs an easy bot), steered by the
 * teacher's word list.
 *
 * The student's opening rack and every refill carry the letters of the next
 * lesson word (see lib/word-craft/lesson.ts), lesson words are always accepted,
 * and playing one ticks it off the checklist. Surprise boxes and clues stay on,
 * so it is the real game, not a worksheet.
 *
 * Composes the ENGINE rather than mounting WordCraftGameView: that screen
 * carries router navigation, ads, duel/challenge links, telemetry and personal
 * best writes — none of which belong in a classroom run (same call as
 * WordTowerPractice).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import PracticeCompletionMoment from '@/components/education/practice/PracticeCompletionMoment';
import { PracticeInsufficientData } from '@/components/practice/PracticeInsufficientData';
import type { Language } from '@/shared/types/game';
import { loadWordCraftDictionary } from '@/lib/word-craft/dictionary';
import { useWordCraftGame, type WordCraftClue } from '@/lib/word-craft/useWordCraftGame';
import { lessonLocale, lessonTargets, nextLessonTarget } from '@/lib/word-craft/lesson';
import { isUnassignedBlank } from '@/lib/word-craft/blankAssign';
import { alphabetForLocale } from '@/lib/word-craft/wordCraftAlphabet';
import { countClaimed } from '@/lib/word-craft/territory';
import { WordCraftBoard } from '@/components/word-craft/WordCraftBoard';
import { WordCraftRack } from '@/components/word-craft/WordCraftRack';
import { WordCraftControls } from '@/components/word-craft/WordCraftControls';
import { WordCraftScoreboard } from '@/components/word-craft/WordCraftScoreboard';
import { WordCraftBlankPicker } from '@/components/word-craft/WordCraftBlankPicker';
import { WordCraftEventToast } from '@/components/word-craft/WordCraftEventToast';
import { useWordCraftEventToasts } from '@/components/word-craft/useWordCraftEventToasts';
import { wordCraftErrorText } from '@/components/word-craft/wordCraftErrorText';

export interface WordCraftPracticeResults {
  /** Lesson words the student played, canonical. */
  vocabularyWordsFound: string[];
  /** Every word the student played. */
  wordsFound: string[];
  /** Squares held at the end — the game's score. */
  territory: number;
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

function WordCraftRun({ words, language, onComplete, onBack, onNext, nextLabel, onAgain }: WordCraftPracticeProps & { onAgain: () => void }) {
  const { t } = useLanguage();
  const locale = lessonLocale(language);
  const targets = useMemo(() => lessonTargets(words, language), [words, language]);
  const ready = Boolean(locale) && targets.length > 0;
  const lesson = useMemo(() => (ready ? { targets, language } : null), [ready, targets, language]);
  // A fresh board per run (the wrapper remounts on AGAIN).
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));

  // Lesson words are authoritative: a teacher's term the dictionary never
  // heard of must still be playable — it is the point of the run.
  const [dict, setDict] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (!ready || !locale) return;
    let live = true;
    loadWordCraftDictionary(locale)
      .then((loaded) => live && setDict(new Set([...Array.from(loaded), ...targets])))
      .catch(() => live && setDict(new Set(targets)));
    return () => {
      live = false;
    };
  }, [ready, locale, targets]);

  const game = useWordCraftGame({ seed, dict, locale: locale ?? 'en', difficulty: 'easy', modifierOverride: 'none', lesson });
  const { state } = game;
  const lessonFound = state.lesson?.found;
  const found = useMemo(() => lessonFound ?? [], [lessonFound]);
  const { toast, show } = useWordCraftEventToasts(state, t);

  // Lesson hit → gold toast. Keyed on the found count so each word fires once.
  const seenFound = useRef(0);
  useEffect(() => {
    if (found.length <= seenFound.current) return;
    seenFound.current = found.length;
    show({ key: Date.now(), tone: 'gold', text: t('education.wordCraftPractice.hit', { word: found[found.length - 1] }), ms: 2600 });
  }, [found, show, t]);

  const [clue, setClue] = useState<WordCraftClue | null>(null);
  useEffect(() => {
    if (state.turn !== 'player') setClue(null);
  }, [state.turn]);
  const handleClue = useCallback(() => {
    if (state.cluesRemaining <= 0) game.grantClue();
    const next = game.requestClue();
    setClue(next);
    show({ key: Date.now(), tone: 'player', text: next ? t('wordcraft.clue.reveal', { word: next.word }) : t('wordcraft.clue.none'), ms: 4500 });
  }, [game, state.cluesRemaining, show, t]);

  const [done, setDone] = useState(false);
  const finishedRef = useRef(false);
  const territory = countClaimed(state.board, 'player');
  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setDone(true);
    void onComplete({
      vocabularyWordsFound: found,
      wordsFound: state.history.filter((h) => h.who === 'player').flatMap((h) => h.words),
      territory,
    });
  }, [found, state.history, territory, onComplete]);
  useEffect(() => {
    if (state.turn === 'over') finish();
  }, [state.turn, finish]);

  const pendingIds = useMemo(() => new Set(state.pendingPlacements.map((p) => p.rackTileId)), [state.pendingPlacements]);
  const pendingBlank = state.pendingPlacements.find(isUnassignedBlank) ?? null;
  const jokerAlphabet = useMemo(() => alphabetForLocale(locale ?? 'en'), [locale]);

  if (!ready) return <PracticeInsufficientData onBack={onBack} testId="word-craft-practice-unavailable" />;

  if (done) {
    return (
      <div className="flex w-full items-center justify-center py-4" data-testid="word-craft-complete">
        <PracticeCompletionMoment
          correct={found.length}
          total={targets.length}
          stats={[{ key: 'territory', label: t('wordcraft.territory.label'), value: `${territory}` }]}
          onAgain={onAgain}
          onBack={onBack}
          onNext={onNext}
          nextLabel={nextLabel}
        />
      </div>
    );
  }

  const canInteract = state.turn === 'player';
  const next = nextLessonTarget(targets, found);
  const error = wordCraftErrorText(state.lastError, t);

  return (
    <div className="flex h-[calc(100svh-6rem)] min-h-[480px] w-full flex-col gap-1.5 rounded-neo border-[3px] border-neo-cream bg-neo-navy p-2">
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} aria-label={t('common.back')} className="text-neo-white hover:bg-neo-white/10 hover:text-neo-white">
          <DirectionalIcon icon={ArrowLeft} className="h-5 w-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate font-neo-display text-lg text-neo-white">
          {t('education.practicePicker.name.word_craft')}
        </h1>
        <button
          type="button"
          data-testid="word-craft-practice-done"
          onClick={finish}
          className="shrink-0 rounded-neo border-[2px] border-black bg-neo-lime px-3 py-1.5 font-neo-display text-sm font-black uppercase text-black shadow-hard active:translate-y-0.5"
        >
          {t('education.wordTowerPractice.done')}
        </button>
      </div>

      {/* Checklist — the lesson. Unbuilt words stay hidden (spelling, not copying). */}
      <ul className="flex max-h-16 shrink-0 flex-wrap gap-1.5 overflow-y-auto" aria-label={t('education.wordCraftPractice.progress', { found: found.length, total: targets.length })}>
        {targets.map((target) => {
          const hit = found.includes(target);
          return (
            <li
              key={target}
              data-testid={`word-craft-practice-target-${target}`}
              data-hit={hit ? 'true' : 'false'}
              className={cn(
                'flex items-center gap-1 rounded-neo border-[2px] border-black px-2 py-0.5 font-neo-display text-xs font-black uppercase',
                hit ? 'bg-neo-lime text-black' : target === next ? 'bg-neo-yellow text-black' : 'bg-neo-white/15 text-neo-white/80',
              )}
            >
              {hit && <Check className="h-3 w-3" aria-hidden="true" />}
              {hit ? target : '•'.repeat(Array.from(target).length)}
            </li>
          );
        })}
      </ul>

      <WordCraftScoreboard
        player={state.player}
        bot={state.bot}
        turn={state.turn}
        tilesRemaining={game.tilesRemaining}
        isBot
        labels={{
          you: t('wordcraft.you'),
          bot: t('wordcraft.bot'),
          rival: t('wordcraft.rival'),
          yourTurn: t('wordcraft.yourTurn'),
          botTurn: t('wordcraft.botTurn'),
          gameOver: t('wordcraft.gameOver'),
          bagRemaining: t('wordcraft.bagRemaining'),
        }}
        territory={{ playerCount: territory, botCount: countClaimed(state.board, 'bot'), label: t('wordcraft.territory.label') }}
      />

      <div className="flex min-h-0 flex-1 items-center justify-center" style={{ containerType: 'size' }}>
        <div className="relative aspect-square" style={{ width: '100cqmin', height: '100cqmin' }}>
          <WordCraftBoard
            board={state.board}
            pendingPlacements={state.pendingPlacements}
            onCellClick={game.placeOnBoard}
            onRecallPending={game.recallTile}
            disabled={!canInteract}
            hasSelectedTile={Boolean(state.selectedRackTileId)}
            isFirstMove={game.isFirstMoveOfGame}
            locale={locale ?? 'en'}
            clue={clue}
            surprises={state.surprises}
          />
          <WordCraftEventToast toast={toast} />
        </div>
      </div>

      {error ? (
        <p role="alert" className="shrink-0 self-center rounded-neo border-2 border-black bg-neo-red px-3 py-1 text-sm text-white">
          {error}
        </p>
      ) : null}

      <WordCraftRack
        tiles={state.player.rack}
        selectedId={state.selectedRackTileId}
        pendingIds={pendingIds}
        onSelect={game.selectRackTile}
        disabled={!canInteract || !dict}
        ariaLabel={t('wordcraft.yourRack')}
        locale={locale ?? 'en'}
      />
      <WordCraftControls
        canSubmit={state.pendingPlacements.length > 0 && Boolean(dict) && canInteract}
        canRecall={state.pendingPlacements.length > 0}
        canSwap={canInteract}
        disabled={!canInteract || !dict}
        onSubmit={game.submitMove}
        onRecall={game.recallAll}
        onPass={game.pass}
        onSwap={() => game.swap(state.player.rack.filter((tile) => !pendingIds.has(tile.id)))}
        onClue={handleClue}
        cluesRemaining={state.cluesRemaining}
        labels={{
          submit: t('wordcraft.submit'),
          recall: t('wordcraft.recall'),
          pass: t('wordcraft.pass'),
          swap: t('wordcraft.swap'),
          clue: t('wordcraft.clue.button'),
        }}
      />

      <WordCraftBlankPicker
        open={Boolean(pendingBlank)}
        letters={jokerAlphabet}
        onPick={(letter) => pendingBlank && game.assignBlank(pendingBlank.rackTileId, letter)}
        onCancel={() => pendingBlank && game.recallTile(pendingBlank.rackTileId)}
        locale={locale ?? 'en'}
        labels={{ title: t('wordcraft.joker.pickTitle'), hint: t('wordcraft.joker.pickHint'), cancel: t('wordcraft.joker.cancel') }}
      />
    </div>
  );
}

/** Public entry — holds only the run key so AGAIN deals a genuinely new game. */
export default function WordCraftPractice(props: WordCraftPracticeProps) {
  const [runKey, setRunKey] = useState(0);
  return <WordCraftRun key={runKey} {...props} onAgain={() => setRunKey((k) => k + 1)} />;
}
