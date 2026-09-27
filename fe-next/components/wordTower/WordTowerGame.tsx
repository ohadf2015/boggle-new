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
import {
  dayStartKey,
  parseDayStart,
  serializeDayStart,
  resolveDayStart,
  lockDayStart,
  type DayStart,
} from '@/lib/wordTower/dayStart';
import { useDailyStreak } from '@/lib/wordTower/useDailyStreak';
import {
  rivalsFromLeaderboard,
  type RivalMarker,
  type LeaderboardRivalRow,
} from '@/lib/wordTower/rivals';
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

/** The UTC day the daily score switched from cumulative tower height to today's
 *  climb. Rows already written for this date are on the old scale. */
const CUMULATIVE_SCORE_CUTOVER = '2026-08-25';

interface LoadedProgress {
  initialGame: WordTowerPlayerState;
  /** LIFETIME best height — the bar a personal record has to clear. */
  personalBestM: number;
  dayStartHeightM: number;
  dayStartFloors: number;
}

/**
 * Today's baseline, read/written through localStorage only.
 *
 * Deliberately NOT part of the tower save blob: that blob has two sources (the
 * local session and the DB `current_state`) which resolve at different times,
 * and a baseline arriving from the slower one would be stale (Class 1). Keeping
 * it here gives it a single owner, and `resolveDayStart` leaves it re-stampable
 * until the first floor lands so the late DB swap can still raise it safely.
 */
function loadDayStart(dateKey: string): DayStart | null {
  try { return parseDayStart(localStorage.getItem(dayStartKey(dateKey))); } catch { return null; }
}

function saveDayStart(ds: DayStart): void {
  try { localStorage.setItem(dayStartKey(ds.dayKey), serializeDayStart(ds)); } catch { /* best-effort */ }
}

/** Resolve + persist today's baseline against the tower as currently resolved. */
function stampDayStart(game: WordTowerPlayerState): DayStart {
  const ds = resolveDayStart(loadDayStart(utcDateKey()), utcDateKey(), game.heightM, game.floors.length);
  saveDayStart(ds);
  return ds;
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

    // Resume the in-progress daily tower (if any) so the player lands exactly
    // where they left off, including the same wheel letters.
    const saved = loadSessionFromLocalStorage(daily);
    const initialGame = saved?.state
      ? restoreWordTowerState(opts, saved.state)
      : restoreWordTowerState(opts, null);

    // The record bar is the LIFETIME high-water mark. It used to be read from
    // `wt-daily-best-<today>`, which is absent each morning and so evaluated to
    // 0 — against a tower that had carried over at (say) 334m. Every returning
    // player therefore "beat their best" at mount, before placing a word.
    const best = initialGame.heightHighWaterM || 0;
    const ds = stampDayStart(initialGame);
    setProgress({
      initialGame,
      personalBestM: best,
      dayStartHeightM: ds.startHeightM,
      dayStartFloors: ds.startFloors,
    });

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
          // Re-stamp against the tower we are actually adopting. The baseline is
          // still unlocked here (no floor placed yet this session), so it follows
          // the swap instead of crediting the player with metres they built on
          // another device.
          const serverDs = stampDayStart(serverGame);
          setProgress({
            initialGame: serverGame,
            personalBestM: Math.max(best, serverGame.heightHighWaterM || 0, Number(data.progress.best_height_m) || 0),
            dayStartHeightM: serverDs.startHeightM,
            dayStartFloors: serverDs.startFloors,
          });
        }
      }).catch(() => { /* ignore — local session is the fallback */ });
    }).catch(() => { /* ignore — local session is the fallback */ });
  }, [language, dictReady, daily]);

  const isInDictionary = useCallback(
    (canonWord: string) => dictRef.current?.has(canonWord) ?? false,
    [],
  );

  // Persist today's CLIMB — metres built today, not the lifetime tower height.
  //
  // Submitting `game.heightM` made the daily board a lifetime board: two
  // returning players re-posted an unchanged height on a later day (334 -> 334,
  // 99 -> 99, 2026-08-19..25) while a newcomer's first word ranked 2m against
  // 453m. Ranking the delta puts everyone on the same scale every morning.
  //
  // `floors` and `longestWord` are sent for the first time. The route has always
  // read them off the body, but this call never supplied them — which is why all
  // 20 rows in `daily_word_tower_attempts` carry `floors = 0` and a NULL
  // `longest_word`, and the leaderboard renders "0" floors for every player.
  const persistDailyClimb = useCallback((result: { climbM: number; floors: number; longestWord: string }) => {
    let improved = false;
    let merged = 0;
    try {
      const key = dailyBestKey(utcDateKey());
      const stored = Number(localStorage.getItem(key)) || 0;
      merged = mergeDailyBest(stored, result.climbM);
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
          floors: result.floors,
          longestWord: result.longestWord || null,
          language,
          guestFingerprint: getGuestFingerprint(),
        });
      } catch { /* best-effort — localStorage remains the source of truth for UI */ }
    })();
  }, [language]);

  // First floor of the day: freeze the baseline (it is re-stampable until now)
  // and credit the streak. `recordPlay` is idempotent downstream.
  const onDailyEngaged = useCallback(() => {
    const stored = loadDayStart(utcDateKey());
    if (stored && !stored.locked) saveDayStart(lockDayStart(stored));
    recordPlay();
  }, [recordPlay]);

  // Rivals — ghost record-lines for the other players on today's board.
  //
  // This was `rivals={[]}`, hardcoded, and Word Tower is daily-only (the endless
  // run was retired), so the rival system was invisible for the ENTIRE mode: no
  // ghost lines, no "next rival" chip, nobody to chase. `rivalsFromLeaderboard`
  // and the whole rail were already built and wired downstream.
  //
  // Rival heights are today's CLIMBS, but the rail positions against absolute
  // tower altitude, so each is rebased onto the viewer's own baseline: a rival
  // who climbed 12m today draws at the altitude the viewer reaches by climbing
  // 12m today. Same scale for a newcomer and a 400m veteran.
  const [rivals, setRivals] = useState<RivalMarker[]>([]);
  const dayStartHeightM = progress?.dayStartHeightM;
  useEffect(() => {
    if (dayStartHeightM === undefined) return;
    let cancelled = false;
    const params = new URLSearchParams({ language, guestFingerprint: getGuestFingerprint() ?? '' });
    getWithAuth(`/api/word-tower/daily/score?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.leaderboard) return;
        // Rows written before the cutover hold CUMULATIVE tower heights, not
        // climbs, so rebasing them would hang ghost lines hundreds of metres
        // above a new player's head. Skip the rail for that one puzzle_date; it
        // expires by itself at the UTC rollover and touches no player data.
        if (data.puzzleDate === CUMULATIVE_SCORE_CUTOVER) return;
        setRivals(
          rivalsFromLeaderboard(data.leaderboard as LeaderboardRivalRow[]).map((r) => ({
            ...r,
            heightM: dayStartHeightM + r.heightM,
          })),
        );
      })
      .catch(() => { /* no rivals is the old behaviour — never block a climb */ });
    return () => { cancelled = true; };
  }, [language, dayStartHeightM]);

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
        rivals={rivals}
        initialGame={progress!.initialGame}
        personalBestM={progress!.personalBestM}
        onOpenLeaderboard={openLeaderboard}
        daily={daily}
        onDailyEngaged={onDailyEngaged}
        perkSeed={dailyTowerGameCode()}
        dayStartHeightM={progress!.dayStartHeightM}
        dayStartFloors={progress!.dayStartFloors}
        onDailyClimb={persistDailyClimb}
      />

      {showLeaderboard && <WordTowerLeaderboard onClose={closeLeaderboard} t={t} dir={dir} language={language} />}
    </>
  );
}
