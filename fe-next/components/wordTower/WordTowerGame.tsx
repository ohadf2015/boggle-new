'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDismissedFlag } from '@/hooks/useLocalStorageState';
import { getWithAuth } from '@/utils/authFetch';
import { loadWordCraftDictionary } from '@/lib/word-craft/dictionary';
import type { SupportedLocale } from '@/lib/word-craft/tileBag';
import {
  restoreWordTowerState,
  type WordTowerPlayerState,
  type WordTowerSaveState,
} from '@/lib/wordTower/wordTowerManager';
import { useWordTowerRivals } from '@/lib/wordTower/useWordTowerRivals';
import { dailyTowerGameCode, DAILY_PLAYER_ID, utcDateKey } from '@/lib/wordTower/dailySeed';
import { dailyBestKey, mergeDailyBest } from '@/lib/wordTower/dailyBest';
import { useDailyStreak } from '@/lib/wordTower/useDailyStreak';
import { WordTowerPlay } from './WordTowerPlay';
import { WordTowerLeaderboard } from './WordTowerLeaderboard';
import { Flame, CalendarDays } from 'lucide-react';

const SUPPORTED: SupportedLocale[] = ['en', 'he', 'sv', 'es', 'ja'];

/** Read `?daily=1` once, client-side (avoids a Suspense boundary for useSearchParams). */
function useDailyMode(): boolean {
  const [daily, setDaily] = useState(false);
  useEffect(() => {
    setDaily(new URLSearchParams(window.location.search).get('daily') === '1');
  }, []);
  return daily;
}

interface LoadedProgress {
  initialGame: WordTowerPlayerState;
  personalBestM: number;
}

export function WordTowerGame() {
  const { t, language, dir } = useLanguage();
  const locale: SupportedLocale = SUPPORTED.includes(language as SupportedLocale)
    ? (language as SupportedLocale)
    : 'en';

  const daily = useDailyMode();
  const { streak, recordPlay } = useDailyStreak();

  const dictRef = useRef<Set<string> | null>(null);
  const [dictReady, setDictReady] = useState(false);
  const [dictError, setDictError] = useState(false);
  const [progress, setProgress] = useState<LoadedProgress | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Load the client dictionary for this locale.
  useEffect(() => {
    let cancelled = false;
    setDictReady(false);
    setDictError(false);
    loadWordCraftDictionary(locale).then((set) => {
      if (cancelled) return;
      dictRef.current = set;
      setDictReady(true);
    }).catch(() => {
      if (!cancelled) setDictError(true);
    });
    return () => { cancelled = true; };
  }, [locale]);

  // Initialise the run. Daily = a fresh, deterministic, shared-seed tower (no
  // resume, no server fetch — the endless save is gated downstream). Endless =
  // fetch saved progress and restore.
  useEffect(() => {
    let cancelled = false;
    // Wait for the dictionary so the opening wheel is chosen for word coverage
    // (#5) — pickBestWheel needs the word list. `ready` already gates render on
    // dictReady, so this adds no visible delay.
    if (!dictReady) return () => { cancelled = true; };
    const dict = dictRef.current;

    if (daily) {
      const opts = { gameCode: dailyTowerGameCode(), playerId: DAILY_PLAYER_ID, language, avoidWeakAnchor: true, dict };
      let best = 0;
      try { best = Number(localStorage.getItem(`wt-daily-best-${utcDateKey()}`)) || 0; } catch { /* */ }
      setProgress({ initialGame: restoreWordTowerState(opts, null), personalBestM: best });
      return () => { cancelled = true; };
    }

    // Day-seeded wheel: the gameCode carries the UTC date so the letter ring is
    // FRESH every calendar day (a new set of letters daily, NYT-Spelling-Bee
    // style) while the endless climb itself persists across days. Stable within
    // the day, so reloads keep the same letters. (Step toward folding the daily
    // letter set into the broader daily-challenges flow.)
    const opts = { gameCode: `solo-${utcDateKey()}`, playerId: 'solo', language, dict };
    getWithAuth('/api/word-tower/progress')
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
  }, [language, daily, dictReady]);

  const isInDictionary = useCallback(
    (canonWord: string) => dictRef.current?.has(canonWord) ?? false,
    [],
  );

  // Persist today's daily best so the minimap tick + next-attempt baseline reflect
  // prior climbs (the self-comparison loop).
  const persistDailyBest = useCallback((heightM: number) => {
    try {
      const key = dailyBestKey(utcDateKey());
      const stored = Number(localStorage.getItem(key)) || 0;
      localStorage.setItem(key, String(mergeDailyBest(stored, heightM)));
    } catch { /* best-effort */ }
  }, []);

  const openLeaderboard = useCallback(() => setShowLeaderboard(true), []);
  const closeLeaderboard = useCallback(() => setShowLeaderboard(false), []);
  const rivals = useWordTowerRivals();

  const { isDismissed: ftueShown, dismiss: dismissFtue } = useDismissedFlag('wt-ftue-v1');

  const ready = dictReady && progress !== null;

  // useWordTower lazy-inits from initialGame only on first mount. Re-key on
  // locale so switching language re-fetches progress and re-mounts the store
  // with the freshly-restored tower for that locale's dictionary.
  const playKey = `wt-${language}-${daily ? 'daily' : 'endless'}`;

  if (dictError) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-neo-navy">
        <p className="font-neo-display text-xl text-neo-red">{t('wordTower.loadError')}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-neo border-neo border-black bg-neo-cyan px-6 py-3 font-neo-display text-sm font-black uppercase text-black shadow-hard active:translate-y-px"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

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
        rivals={daily ? [] : rivals}
        initialGame={progress!.initialGame}
        personalBestM={progress!.personalBestM}
        onOpenLeaderboard={openLeaderboard}
        daily={daily}
        onDailyEngaged={recordPlay}
        perkSeed={daily ? dailyTowerGameCode() : ''}
        onNewDailyBest={persistDailyBest}
      />

      {/* Daily badge + streak only when already in daily mode (non-action). No
          mid-run daily↔endless switch — daily entry stays on hub/URL (`?daily=1`). */}
      {daily && (
        <div className="pointer-events-none fixed inset-x-0 top-14 z-50 flex justify-center px-2" dir={dir}>
          <div className="pointer-events-none flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-yellow px-2 py-1 font-neo-display text-[11px] font-black uppercase tracking-wide text-black shadow-hard-sm">
              <CalendarDays className="h-3 w-3" />
              {t('wordTower.daily.badge', { date: utcDateKey() })}
            </span>
            {streak > 0 && (
              <span className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-orange px-2 py-1 font-neo-display text-[11px] font-black text-black shadow-hard-sm">
                <Flame className="h-3 w-3" />
                {t('wordTower.daily.streak', { n: streak })}
              </span>
            )}
          </div>
        </div>
      )}

      {showLeaderboard && <WordTowerLeaderboard onClose={closeLeaderboard} t={t} dir={dir} />}

      {ready && !ftueShown && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4"
          dir={dir}
          onClick={dismissFtue}
        >
          <div
            className="w-full max-w-sm rounded-neo border-neo-thick border-black bg-neo-navy p-6 shadow-hard-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-center font-neo-display text-2xl font-black uppercase text-neo-cyan">
              {t('wordTower.howTo.title')}
            </h2>
            <ol className="mb-6 flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <li key={i} className="font-neo-body text-sm text-neo-cream">
                  {t(`wordTower.howTo.steps.${i}`)}
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={dismissFtue}
              className="w-full rounded-neo border-neo-thick border-black bg-neo-lime py-3 font-neo-display text-lg font-black uppercase tracking-wide text-black shadow-hard transition-transform active:translate-y-px"
            >
              {t('wordTower.howTo.cta')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
