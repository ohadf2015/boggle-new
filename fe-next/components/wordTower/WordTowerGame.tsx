'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { HowToPlayCard } from '@/components/common/HowToPlayCard';
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
import { Flame, CalendarDays, Infinity as InfinityIcon } from 'lucide-react';

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

  // Initialise the run. Daily = a fresh, deterministic, shared-seed tower (no
  // resume, no server fetch — the endless save is gated downstream). Endless =
  // fetch saved progress and restore.
  useEffect(() => {
    let cancelled = false;

    if (daily) {
      const opts = { gameCode: dailyTowerGameCode(), playerId: DAILY_PLAYER_ID, language, avoidWeakAnchor: true };
      let best = 0;
      try { best = Number(localStorage.getItem(`wt-daily-best-${utcDateKey()}`)) || 0; } catch { /* */ }
      setProgress({ initialGame: restoreWordTowerState(opts, null), personalBestM: best });
      return () => { cancelled = true; };
    }

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
  }, [language, daily]);

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

  const ready = dictReady && progress !== null;

  // useWordTower lazy-inits from initialGame only on first mount. Re-key on
  // locale so switching language re-fetches progress and re-mounts the store
  // with the freshly-restored tower for that locale's dictionary.
  const playKey = `wt-${language}-${daily ? 'daily' : 'endless'}`;

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-neo-navy">
        <p className="animate-pulse font-neo-display text-xl text-neo-cyan">{t('wordTower.loading')}</p>
      </div>
    );
  }

  return (
    <>
      <HowToPlayCard
        storageKey="word-tower"
        title={t('wordTower.howTo.title')}
        steps={[0, 1, 2].map((i) => t(`wordTower.howTo.steps.${i}`))}
        cta={t('wordTower.howTo.cta')}
        accent="cyan"
      />
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

      {/* Daily badge + streak + mode toggle — the routine hook. Top-centre, above
          the climb chrome; the toggle swaps between today's shared tower and the
          endless personal climb. */}
      <div className="pointer-events-none fixed inset-x-0 top-2 z-50 flex justify-center px-2" dir={dir}>
        <div className="pointer-events-auto flex items-center gap-1.5">
          {daily && (
            <span className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-yellow px-2 py-1 font-neo-display text-[11px] font-black uppercase tracking-wide text-black shadow-hard-sm">
              <CalendarDays className="h-3 w-3" />
              {t('wordTower.daily.badge', { date: utcDateKey() })}
            </span>
          )}
          {daily && streak > 0 && (
            <span className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-orange px-2 py-1 font-neo-display text-[11px] font-black text-black shadow-hard-sm">
              <Flame className="h-3 w-3" />
              {t('wordTower.daily.streak', { n: streak })}
            </span>
          )}
          {/* Hard nav (plain <a>) so the run remounts fresh in the chosen mode —
              a client <Link> wouldn't re-read the query and the mode would stick. */}
          <a
            href={daily ? '?' : '?daily=1'}
            className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-cyan px-2 py-1 font-neo-display text-[11px] font-black uppercase tracking-wide text-black shadow-hard-sm transition-transform active:translate-y-px"
          >
            {daily ? <InfinityIcon className="h-3 w-3" /> : <CalendarDays className="h-3 w-3" />}
            {daily ? t('wordTower.daily.toEndless') : t('wordTower.daily.toDaily')}
          </a>
        </div>
      </div>

      {showLeaderboard && <WordTowerLeaderboard onClose={closeLeaderboard} t={t} dir={dir} />}
    </>
  );
}
