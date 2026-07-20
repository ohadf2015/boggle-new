'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDismissedFlag } from '@/hooks/useLocalStorageState';
import { loadWordCraftDictionary } from '@/lib/word-craft/dictionary';
import type { SupportedLocale } from '@/lib/word-craft/tileBag';
import {
  restoreWordTowerState,
  type WordTowerPlayerState,
} from '@/lib/wordTower/wordTowerManager';
import { dailyTowerGameCode, DAILY_PLAYER_ID, utcDateKey } from '@/lib/wordTower/dailySeed';
import { dailyBestKey, mergeDailyBest } from '@/lib/wordTower/dailyBest';
import { useDailyStreak } from '@/lib/wordTower/useDailyStreak';
import { WordTowerPlay } from './WordTowerPlay';
import { WordTowerLeaderboard } from './WordTowerLeaderboard';
import { Flame, CalendarDays } from 'lucide-react';

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

  // Word Tower is DAILY-ONLY now — the standalone "endless" run was retired so
  // there's a single tower: the daily challenge (shared seed, perks, per-day best
  // + streak). Founder ask 2026-07-17: "the word tower should be the same word
  // tower of the daily challenge — we shouldn't maintain both modes." Kept as a
  // const so the many `daily`-gated branches below/downstream still read clearly.
  const daily = true;
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

  // Initialise the run: a fresh, deterministic, shared-seed DAILY tower — every
  // player gets the same letters for the day (see `lib/wordTower/dailySeed.ts`),
  // with a per-day best + streak. No server fetch / no cross-session resume (the
  // retired endless save is gated off downstream); today's best is read locally.
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
    setProgress({ initialGame: restoreWordTowerState(opts, null), personalBestM: best });
  }, [language, dictReady]);

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

  const { isDismissed: ftueShown, dismiss: dismissFtue } = useDismissedFlag('wt-ftue-v1');

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
        rivals={[]}
        initialGame={progress!.initialGame}
        personalBestM={progress!.personalBestM}
        onOpenLeaderboard={openLeaderboard}
        daily={daily}
        onDailyEngaged={recordPlay}
        perkSeed={dailyTowerGameCode()}
        onNewDailyBest={persistDailyBest}
      />

      {/* Daily badge + streak — the tower is the daily challenge, so this is
          always shown (non-action). Centred pill below the top chrome. */}
      <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+3.5rem)] z-50 flex justify-center px-2" dir={dir}>
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
