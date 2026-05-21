'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHaptics } from '@/hooks/useHaptics';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { loadWordCraftDictionary } from '@/lib/word-craft/dictionary';
import type { SupportedLocale } from '@/lib/word-craft/tileBag';
import { useWordTower } from '@/lib/wordTower/useWordTower';
import { biomeForHeight } from '@/lib/wordTower/wordTowerManager';
import { WordTowerScene } from './WordTowerScene';
import { WordTowerHud } from './WordTowerHud';

const SUPPORTED: SupportedLocale[] = ['en', 'he', 'sv', 'es', 'ja'];

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export function WordTowerGame() {
  const { t, language, dir } = useLanguage();
  const reducedMotion = usePrefersReducedMotion();
  const locale: SupportedLocale = SUPPORTED.includes(language as SupportedLocale)
    ? (language as SupportedLocale)
    : 'en';

  const dictRef = useRef<Set<string> | null>(null);
  const [dictReady, setDictReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDictReady(false);
    loadWordCraftDictionary(locale).then((set) => {
      if (cancelled) return;
      dictRef.current = set;
      setDictReady(true);
    });
    return () => { cancelled = true; };
  }, [locale]);

  const isInDictionary = useCallback(
    (canonWord: string) => dictRef.current?.has(canonWord) ?? false,
    [],
  );

  const tower = useWordTower({ language, sessionId: 'solo', isInDictionary });
  const { game } = tower.state;
  const biomeId = useMemo(() => biomeForHeight(game.heightM), [game.heightM]);

  // ── Feel: haptics + sound on every key event ──
  const haptics = useHaptics();
  const { playCoinCollectSound, playErrorSound, playChestOpenSound } = useSoundEffects();

  useEffect(() => {
    if (tower.state.resultKey === 0 || !tower.state.lastResult) return;
    if (tower.state.lastResult.tier === 'skyscraper') {
      haptics.levelComplete();
      playChestOpenSound();
    } else {
      haptics.success();
      playCoinCollectSound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tower.state.resultKey]);

  useEffect(() => {
    if (tower.state.errorKey === 0) return;
    haptics.error();
    playErrorSound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tower.state.errorKey]);

  const selectTileHaptic = useCallback(
    (i: number) => { haptics.selection(); tower.selectTile(i); },
    [haptics, tower],
  );

  // Keyboard: type a letter to pick the first matching tray tile; Enter submits.
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

  if (!dictReady) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-neo-navy">
        <p className="animate-pulse font-neo-display text-xl text-neo-cyan">{t('wordTower.loading')}</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-neo-navy" dir={dir}>
      <WordTowerScene
        floors={game.floors}
        biomeId={biomeId}
        resultKey={tower.state.resultKey}
        lastResult={tower.state.lastResult}
        reducedMotion={reducedMotion}
      />

      {/* Top-left nav + restart */}
      <div className="pointer-events-auto absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
        <Link
          href={`/${language}`}
          className="flex items-center gap-1 rounded-neo border-neo-thick border-black bg-neo-navy/80 px-3 py-2 font-neo-body text-sm font-bold text-neo-white shadow-hard backdrop-blur-sm"
        >
          <ArrowLeft className="h-4 w-4" /> {t('common.backToHome')}
        </Link>
        <button
          type="button"
          onClick={tower.reset}
          aria-label={t('wordTower.hud.restart')}
          className="rounded-neo border-neo-thick border-black bg-neo-navy/80 p-2 text-neo-white shadow-hard backdrop-blur-sm"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* HUD overlay */}
      <div className="absolute inset-0 z-10">
        <WordTowerHud
          anchorLetter={game.anchorLetter}
          tray={game.tray}
          selected={tower.state.selected}
          word={tower.word}
          heightM={game.heightM}
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
