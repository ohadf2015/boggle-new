'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import { loadWordCraftDictionary } from '@/lib/word-craft/dictionary';
import type { SupportedLocale } from '@/lib/word-craft/tileBag';
import {
  restoreWordTowerState,
  type WordTowerSaveState,
  type WordTowerPlayerState,
} from '@/lib/wordTower/wordTowerManager';
import { dailyTowerGameCode, DAILY_PLAYER_ID, utcDateKey } from '@/lib/wordTower/dailySeed';
import { dailyBestKey, mergeDailyBest } from '@/lib/wordTower/dailyBest';
import { useDailyStreak } from '@/lib/wordTower/useDailyStreak';
import { getWithAuth, postWithAuth } from '@/utils/authFetch';
import { getGuestFingerprint } from '@/utils/guestManager';
import { WordTowerPlay } from './WordTowerPlay';

// Modal, opened only on a button click — keep it (and the Avatar module it
// pulls in) out of the word-tower page's critical-path bundle.
const WordTowerLeaderboard = dynamic(
  () => import('./WordTowerLeaderboard').then((m) => m.WordTowerLeaderboard),
  { ssr: false },
);

const SUPPORTED: SupportedLocale[] = ['en', 'he', 'sv', 'es', 'ja'];

interface LoadedProgress {
  initialGame: WordTowerPlayerState;
  personalBestM: number;
}

interface SavedSession {
  savedAt: number;
  state: WordTowerSaveState;
}

function sessionStorageKey(daily: boolean) {
  // The tower itself persists across days; only the daily seed/wheel changes per
  // UTC day (handled by dailyTowerGameCode).
  return daily ? 'wt-session-persistent' : 'wt-session-endless';
}

function loadSessionFromLocalStorage(daily: boolean): SavedSession | null {
  const tryKey = (key: string): SavedSession | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SavedSession;
      if (!parsed?.state) return null;
      return parsed;
    } catch { return null; }
  };
  let saved = tryKey(sessionStorageKey(daily));
  // One-time migration: if a date-stamped daily save exists, adopt it into the
  // persistent key so the tower keeps its height across the UTC rollover.
  if (!saved && daily) {
    saved = tryKey(`wt-session-daily-${utcDateKey()}`);
    if (saved) {
      try { localStorage.setItem(sessionStorageKey(true), JSON.stringify(saved)); } catch { /* */ }
    }
  }
  return saved;
}

export function WordTowerGame() {
  const { t, language, dir } = useLanguage();
  const locale: SupportedLocale = SUPPORTED.includes(language as SupportedLocale)
    ? (language as SupportedLocale)
    : 'en';

  // Word Tower is DAILY-ONLY now — the standalone "endless" run was retired so
  // there's a single tower: the daily challenge (shared seed, perks, per-day best
  // + streak). Founder ask 2026-07-17: "the word tower should be the same word
  // tower of the daily challenge — we shouldn't maintain both modes." Kept as a
  // const so the many `daily`-gated branches below/downstream still read clearly.
  const daily = true;
  const { recordPlay } = useDailyStreak();

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

  // Initialise the run: a deterministic, shared-seed DAILY tower. Each player
  // gets the same letters for the day, but a reload resumes THIS player's saved
  // progress (floors + the exact wheel) so the tower never resets to zero mid-day.
  // The tower session now persists across days; only the daily seed/wheel is
  // date-stamped, so each day's challenge is still shared worldwide.
  // Also tries to load from Supabase (authenticated users) so the tower is
  // truly persistent across sessions and devices.
  useEffect(() => {
    // Wait for the dictionary so the opening wheel is chosen for word coverage
    // (#5) — pickBestWheel needs the word list. `ready` already gates render on
    // dictReady, so this adds no visible delay. Init is synchronous (no server
    // fetch), so there's nothing to cancel.
    if (!dictReady) return;
    const dict = dictRef.current;

    const opts = { gameCode: dailyTowerGameCode(), playerId: DAILY_PLAYER_ID, language, avoidWeakAnchor: true, dict };
    let best = 0;
    try { best = Number(localStorage.getItem(`wt-daily-best-${utcDateKey()}`)) || 0; } catch { /* */ }

    // Resume the in-progress daily tower (if any) so the player lands exactly
    // where they left off, including the same wheel letters.
    const saved = loadSessionFromLocalStorage(daily);
    const initialGame = saved?.state
      ? restoreWordTowerState(opts, saved.state)
      : restoreWordTowerState(opts, null);
    setProgress({ initialGame, personalBestM: best });

    // Also try to load from the DB (authenticated users) — the server progress
    // may be ahead of the local session (e.g. played on another device).
    // If the DB has a more advanced state, it will be used by the restore
    // logic in WordTowerPlay (sessionRestoredRef checks initialGame floors).
    getWithAuth('/api/word-tower/progress').then((res) => {
      if (!res.ok) return;
      res.json().then((data) => {
        if (!data?.progress?.current_state) return;
        const serverState = data.progress.current_state as WordTowerSaveState;
        const serverGame = restoreWordTowerState(opts, serverState);
        if (serverGame.floors.length > initialGame.floors.length || serverGame.heightM > initialGame.heightM) {
          setProgress({ initialGame: serverGame, personalBestM: Math.max(best, data.progress.best_height_m ?? 0) });
        }
      }).catch(() => { /* ignore — local session is the fallback */ });
    }).catch(() => { /* ignore — local session is the fallback */ });
  }, [language, dictReady, daily]);

  const isInDictionary = useCallback(
    (canonWord: string) => dictRef.current?.has(canonWord) ?? false,
    [],
  );

  // Persist today's daily best so the minimap tick + next-attempt baseline reflect
  // prior climbs (the self-comparison loop).
  const persistDailyBest = useCallback((heightM: number) => {
    let improved = false;
    let merged = 0;
    try {
      const key = dailyBestKey(utcDateKey());
      const stored = Number(localStorage.getItem(key)) || 0;
      merged = mergeDailyBest(stored, heightM);
      improved = merged > stored;
      localStorage.setItem(key, String(merged));
    } catch { /* best-effort */ }

    // Submit only on a genuine improvement — the server keeps the max anyway, so
    // this is purely to avoid a request per drop. Guests submit too (the daily
    // leaderboard is not auth-gated, unlike the lifetime one). Fire-and-forget:
    // a failed submit must never interrupt a climb.
    if (!improved || merged <= 0) return;
    void (async () => {
      try {
        await postWithAuth('/api/word-tower/daily/score', {
          heightM: merged,
          language,
          guestFingerprint: getGuestFingerprint(),
        });
      } catch { /* best-effort — localStorage remains the source of truth for UI */ }
    })();
  }, [language]);

  const openLeaderboard = useCallback(() => setShowLeaderboard(true), []);
  const closeLeaderboard = useCallback(() => setShowLeaderboard(false), []);

  const ready = dictReady && progress !== null;

  // useWordTower lazy-inits from initialGame only on first mount. Re-key on
  // locale so switching language re-fetches progress and re-mounts the store
  // with the freshly-restored tower for that locale's dictionary.
  const playKey = `wt-${language}-daily`;

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
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-neo-navy">
        <span className="rounded-full border border-neo-white/30 bg-neo-navy-light px-3 py-1 font-neo-body text-xs font-bold text-neo-white/80">
          {t('wordTower.daily.badge', { date: utcDateKey() })}
        </span>
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
        rivals={[]}
        initialGame={progress!.initialGame}
        personalBestM={progress!.personalBestM}
        onOpenLeaderboard={openLeaderboard}
        daily={daily}
        onDailyEngaged={recordPlay}
        perkSeed={dailyTowerGameCode()}
        onNewDailyBest={persistDailyBest}
      />

      {showLeaderboard && <WordTowerLeaderboard onClose={closeLeaderboard} t={t} dir={dir} language={language} />}
    </>
  );
}
