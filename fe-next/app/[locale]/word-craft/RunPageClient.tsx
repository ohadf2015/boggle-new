'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useMusic } from '@/contexts/MusicContext';
import { loadWordCraftDictionary } from '@/lib/word-craft/dictionary';
import { useWordCraftRun } from '@/lib/word-craft/run/useWordCraftRun';
import { wordFeedbackTier } from '@/lib/word-craft/run/feedbackTiers';
import type { SupportedLocale } from '@/lib/word-craft/tileBag';
import { WordCraftBoardSection } from '@/components/word-craft/WordCraftBoardSection';
import { WordCraftRack } from '@/components/word-craft/WordCraftRack';
import { RunHUD } from '@/components/word-craft/run/RunHUD';
import RunWordPop, { type RunWordPopData } from '@/components/word-craft/run/RunWordPop';
import { CardPickScreen } from '@/components/word-craft/run/CardPickScreen';
import { RoundResultScene } from '@/components/word-craft/run/RoundResultScene';
import { RunResultScene } from '@/components/word-craft/run/RunResultScene';

export function RunPageClient() {
  const { t, language } = useLanguage();
  const locale = (language ?? 'en') as SupportedLocale;
  useHideNavigation();

  const [dict, setDict] = useState<Set<string> | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadWordCraftDictionary(locale).then((d) => {
      if (!cancelled) setDict(d);
    }).catch(() => {
      if (!cancelled) setDict(new Set());
    });
    return () => { cancelled = true; };
  }, [locale]);

  const boardSize: 7 | 9 = typeof window !== 'undefined' && window.innerWidth >= 768 ? 9 : 7;
  const run = useWordCraftRun({ seed: 1, dict, locale, boardSize });
  const { state } = run;

  // Per-word commit ceremony — fills the "submit → nothing happens" dead zone.
  const { playWordAcceptedSound, playPerfectWordSound, playSound, setGameActive } = useSoundEffects();
  const { fadeToTrack, stopMusic, TRACKS } = useMusic();

  // Audio lifecycle: activate the SFX gate + start in-game music while the run
  // is mounted; tear both down on exit. (Run/Card mode was silent before.)
  useEffect(() => {
    setGameActive(true);
    fadeToTrack(TRACKS.IN_GAME, 600, 600);
    return () => {
      setGameActive(false);
      stopMusic(500);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Invalid submission feedback — a quick rejection sting.
  const prevErrorRef = useRef<string | null>(null);
  useEffect(() => {
    const e = state.lastError ?? null;
    if (e && e !== prevErrorRef.current) playSound('wordRejected', {});
    prevErrorRef.current = e;
  }, [state.lastError, playSound]);

  // Phase-transition ceremony — card reveal, round + run results were silent.
  const prevPhaseRef = useRef(state.phase);
  useEffect(() => {
    if (state.phase === prevPhaseRef.current) return;
    prevPhaseRef.current = state.phase;
    if (state.phase === 'cardPick') {
      playSound('powerUp', {});
    } else if (state.phase === 'roundResult') {
      playSound(state.roundPassed ? 'achievement' : 'wordRejected', { requiresGameActive: false });
    } else if (state.phase === 'runResult') {
      playSound(state.cleared ? 'crownVictory' : 'defeatSting', { requiresGameActive: false });
    }
  }, [state.phase, state.roundPassed, state.cleared, playSound]);

  const [wordPop, setWordPop] = useState<RunWordPopData | null>(null);
  const popKeyRef = useRef(0);
  useEffect(() => {
    const ws = state.lastWordScore;
    if (!ws || ws.total <= 0) return;
    const tier = wordFeedbackTier(ws.total);
    popKeyRef.current += 1;
    setWordPop({ total: ws.total, tier, key: popKeyRef.current });
    (tier === 'huge' ? playPerfectWordSound : playWordAcceptedSound)();
    const id = setTimeout(() => setWordPop(null), 1300);
    return () => clearTimeout(id);
  }, [state.lastWordScore]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!dict) {
    return <div className="p-6 text-center font-neo-body text-neo-white">{t('common.loading')}</div>;
  }

  if (state.phase === 'intro') {
    return (
      <section className="flex flex-col items-center gap-4 p-6 text-center">
        <h1 className="text-3xl font-neo-display text-neo-lime">{t('wordcraft.run.intro.title')}</h1>
        <p className="max-w-md font-neo-body text-neo-white">{t('wordcraft.run.intro.howTo')}</p>
        <button
          type="button"
          onClick={run.startRun}
          className="animate-neo-press rounded-neo border-neo-thick border-neo-lime bg-neo-lime px-6 py-2 font-neo-display text-neo-navy shadow-hard"
        >
          {t('wordcraft.run.intro.start')}
        </button>
      </section>
    );
  }

  if (state.phase === 'cardPick' && state.cardChoice) {
    return (
      <CardPickScreen
        cards={state.cardChoice}
        onPick={(id) => {
          playSound('coinCollect', {});
          run.pickCard(id);
        }}
      />
    );
  }

  if (state.phase === 'roundResult') {
    return (
      <RoundResultScene
        passed={state.roundPassed}
        round={state.round.round}
        roundScore={state.round.score}
        target={state.round.target}
        onProceed={run.proceed}
      />
    );
  }

  if (state.phase === 'runResult') {
    return (
      <RunResultScene
        cleared={state.cleared}
        runTotal={state.runTotal}
        activeCards={state.activeCards}
        onRestart={run.restart}
      />
    );
  }

  // state.phase === 'playing'
  return (
    <div className="relative flex flex-col gap-3 p-3" translate="no">
      <RunWordPop pop={wordPop} t={t} />
      <RunHUD
        round={state.round.round}
        target={state.round.target}
        score={state.round.score}
        runTotal={state.runTotal}
        activeCards={state.activeCards}
        tilesRemaining={run.tilesRemaining}
      />
      <WordCraftBoardSection
        board={state.board}
        pending={state.pendingPlacements}
        selectedRackTile={state.selectedRackTileId ? state.rack.find((t) => t.id === state.selectedRackTileId) ?? null : null}
        onCellTap={(cell: { row: number; col: number }) => {
          if (state.selectedRackTileId) {
            run.placeTile(state.selectedRackTileId, cell.row, cell.col);
          }
        }}
        onCellDragOver={() => {}}
        onCellDrop={() => {}}
        onSceneCtx={() => {}}
      />
      <WordCraftRack
        tiles={state.rack}
        selectedId={state.selectedRackTileId}
        pendingIds={new Set(state.pendingPlacements.map((p) => p.rackTileId))}
        onSelect={run.selectRackTile}
        ariaLabel={t('wordcraft.yourRack')}
        locale={locale}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={run.submitMove}
          className="animate-neo-press rounded-neo border-neo border-neo-lime bg-neo-lime px-4 py-2 font-neo-display text-neo-navy shadow-hard"
        >
          {t('wordcraft.run.submit')}
        </button>
        <button
          type="button"
          onClick={run.recallAll}
          className="animate-neo-press rounded-neo border-neo border-neo-cyan bg-neo-navy-light px-4 py-2 font-neo-body text-neo-cyan shadow-hard"
        >
          {t('wordcraft.run.recall')}
        </button>
        <button
          type="button"
          onClick={run.endRound}
          className="animate-neo-press rounded-neo border-neo border-neo-pink bg-neo-navy-light px-4 py-2 font-neo-body text-neo-pink shadow-hard"
        >
          {t('wordcraft.run.endRound')}
        </button>
      </div>
      {state.lastError && (
        <p className="font-neo-body text-sm text-neo-red">{state.lastError}</p>
      )}
    </div>
  );
}
