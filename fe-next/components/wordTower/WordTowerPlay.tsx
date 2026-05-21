'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHaptics } from '@/hooks/useHaptics';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { Language } from '@/shared/types/game';
import { useWordTower } from '@/lib/wordTower/useWordTower';
import {
  biomeForHeight,
  serializeWordTowerState,
  type WordTowerPlayerState,
} from '@/lib/wordTower/wordTowerManager';
import { WordTowerScene } from './WordTowerScene';
import { WordTowerHud } from './WordTowerHud';

interface PlayProps {
  language: Language;
  isInDictionary: (canonWord: string) => boolean;
  initialGame: WordTowerPlayerState;
  personalBestM: number;
  onOpenLeaderboard: () => void;
}

function usePrefersReducedMotion(): boolean {
  const ref = useRef(false);
  useEffect(() => {
    ref.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);
  return ref.current;
}

export function WordTowerPlay({ language, isInDictionary, initialGame, personalBestM, onOpenLeaderboard }: PlayProps) {
  const { t, dir } = useLanguage();
  const reducedMotion = usePrefersReducedMotion();
  const tower = useWordTower({ language, sessionId: 'solo', isInDictionary, initialGame });
  const { game } = tower.state;
  const biomeId = useMemo(() => biomeForHeight(game.heightM), [game.heightM]);
  const personalBest = Math.max(personalBestM, game.heightM);

  const haptics = useHaptics();
  const { playCoinCollectSound, playChestOpenSound, playErrorSound } = useSoundEffects();

  // ── persistence: build payload + save (fetch or beacon) ──
  const gameRef = useRef(game);
  gameRef.current = game;
  const lastSavedHeight = useRef(-1);

  const buildPayload = useCallback((g: WordTowerPlayerState) => ({
    heightM: g.heightM,
    floors: g.floors.length,
    longestCombo: g.longestCombo,
    longestWord: g.longestWord || undefined,
    highestBiome: biomeForHeight(g.heightM),
    state: serializeWordTowerState(g),
  }), []);

  const save = useCallback((beacon = false) => {
    const g = gameRef.current;
    if (g.heightM === lastSavedHeight.current) return;
    lastSavedHeight.current = g.heightM;
    const body = JSON.stringify(buildPayload(g));
    if (beacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/word-tower/progress', new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch('/api/word-tower/progress', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => { /* best-effort */ });
  }, [buildPayload]);

  // Save cadence: every 10 floors + on biome crossing (rare, high-signal).
  const floorsCount = game.floors.length;
  useEffect(() => {
    if (floorsCount > 0 && floorsCount % 10 === 0) save();
  }, [floorsCount, save]);
  useEffect(() => { if (game.heightM > 0) save(); }, [biomeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Always flush when the tab is hidden / page unloads.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') save(true); };
    window.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', () => save(true));
    return () => {
      save(true);
      window.removeEventListener('visibilitychange', onHide);
    };
  }, [save]);

  // ── feel ──
  useEffect(() => {
    if (tower.state.resultKey === 0 || !tower.state.lastResult) return;
    if (tower.state.lastResult.tier === 'skyscraper') { haptics.levelComplete(); playChestOpenSound(); }
    else { haptics.success(); playCoinCollectSound(); }
  }, [tower.state.resultKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tower.state.errorKey === 0) return;
    haptics.error();
    playErrorSound();
  }, [tower.state.errorKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectTileHaptic = useCallback((i: number) => { haptics.selection(); tower.selectTile(i); }, [haptics, tower]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Enter') { e.preventDefault(); tower.submit(); return; }
      if (e.key === 'Backspace') { e.preventDefault(); tower.backspace(); return; }
      if (e.key === 'Escape') { tower.clear(); return; }
      if (e.key.length !== 1) return;
      const k = e.key.toUpperCase();
      const idx = game.tray.findIndex((l, i) => l.toUpperCase() === k && !tower.state.selected.includes(i));
      if (idx >= 0) selectTileHaptic(idx);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game.tray, tower, selectTileHaptic]);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-neo-navy" dir={dir}>
      <WordTowerScene
        floors={game.floors}
        biomeId={biomeId}
        resultKey={tower.state.resultKey}
        lastResult={tower.state.lastResult}
        reducedMotion={reducedMotion}
      />

      <div className="pointer-events-auto absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
        <Link
          href={`/${language}`}
          onClick={() => save(true)}
          className="flex items-center gap-1 rounded-neo border-neo-thick border-black bg-neo-navy/80 px-3 py-2 font-neo-body text-sm font-bold text-neo-white shadow-hard backdrop-blur-sm"
        >
          <ArrowLeft className="h-4 w-4" /> {t('common.backToHome')}
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenLeaderboard}
            aria-label={t('wordTower.leaderboard.title')}
            className="rounded-neo border-neo-thick border-black bg-neo-yellow p-2 text-black shadow-hard"
          >
            <Trophy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={tower.reset}
            aria-label={t('wordTower.hud.restart')}
            className="rounded-neo border-neo-thick border-black bg-neo-navy/80 p-2 text-neo-white shadow-hard backdrop-blur-sm"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="absolute inset-0 z-10">
        <WordTowerHud
          anchorLetter={game.anchorLetter}
          tray={game.tray}
          selected={tower.state.selected}
          word={tower.word}
          heightM={game.heightM}
          personalBestM={personalBest}
          combo={game.combo}
          scramblesLeft={game.scramblesLeft}
          floorsCount={game.floors.length}
          biomeId={biomeId}
          lastError={tower.state.lastError}
          errorKey={tower.state.errorKey}
          lastResult={tower.state.lastResult}
          resultKey={tower.state.resultKey}
          onSelectTile={selectTileHaptic}
          onBackspace={tower.backspace}
          onClear={tower.clear}
          onSubmit={tower.submit}
          onScramble={tower.scramble}
          t={t}
          dir={dir}
        />
      </div>
    </div>
  );
}
