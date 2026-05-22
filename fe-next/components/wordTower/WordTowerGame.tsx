'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { loadWordCraftDictionary } from '@/lib/word-craft/dictionary';
import type { SupportedLocale } from '@/lib/word-craft/tileBag';
import {
  restoreWordTowerState,
  type WordTowerPlayerState,
  type WordTowerSaveState,
} from '@/lib/wordTower/wordTowerManager';
import { useWordTowerRivals } from '@/lib/wordTower/useWordTowerRivals';
import { WordTowerPlay } from './WordTowerPlay';
import { WordTowerLeaderboard } from './WordTowerLeaderboard';

const SUPPORTED: SupportedLocale[] = ['en', 'he', 'sv', 'es', 'ja'];

interface LoadedProgress {
  initialGame: WordTowerPlayerState;
  personalBestM: number;
}

export function WordTowerGame() {
  const { t, language, dir } = useLanguage();
  const locale: SupportedLocale = SUPPORTED.includes(language as SupportedLocale)
    ? (language as SupportedLocale)
    : 'en';

  const dictRef = useRef<Set<string> | null>(null);
  const [dictReady, setDictReady] = useState(false);
  const [progress, setProgress] = useState<LoadedProgress | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Load the client dictionary for this locale.
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

  // Fetch saved progress once → restore the tower (or start fresh).
  useEffect(() => {
    let cancelled = false;
    const opts = { gameCode: 'solo', playerId: 'solo', language };
    fetch('/api/word-tower/progress')
      .then((r) => (r.ok ? r.json() : Promise.resolve({ progress: null })))
      .then((d) => {
        if (cancelled) return;
        const saved = (d?.progress?.current_state ?? null) as WordTowerSaveState | null;
        setProgress({
          initialGame: restoreWordTowerState(opts, saved),
          personalBestM: Number(d?.progress?.best_height_m) || 0,
        });
      })
      .catch(() => {
        if (!cancelled) setProgress({ initialGame: restoreWordTowerState(opts, null), personalBestM: 0 });
      });
    return () => { cancelled = true; };
  }, [language]);

  const isInDictionary = useCallback(
    (canonWord: string) => dictRef.current?.has(canonWord) ?? false,
    [],
  );

  const openLeaderboard = useCallback(() => setShowLeaderboard(true), []);
  const closeLeaderboard = useCallback(() => setShowLeaderboard(false), []);
  const rivals = useWordTowerRivals();

  const ready = dictReady && progress !== null;

  // useWordTower lazy-inits from initialGame only on first mount. Re-key on
  // locale so switching language re-fetches progress and re-mounts the store
  // with the freshly-restored tower for that locale's dictionary.
  const playKey = `wt-${language}`;

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-neo-navy">
        <p className="animate-pulse font-neo-display text-xl text-neo-cyan">{t('wordTower.loading')}</p>
      </div>
    );
  }

  return (
    <>
      <WordTowerPlay
        key={playKey}
        language={language}
        isInDictionary={isInDictionary}
        dictionary={dictRef.current}
        rivals={rivals}
        initialGame={progress!.initialGame}
        personalBestM={progress!.personalBestM}
        onOpenLeaderboard={openLeaderboard}
      />
      {showLeaderboard && <WordTowerLeaderboard onClose={closeLeaderboard} t={t} dir={dir} />}
    </>
  );
}
