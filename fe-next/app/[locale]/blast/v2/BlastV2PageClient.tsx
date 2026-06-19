'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { BlastGame } from '@/components/blast/v2/BlastGame';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBlastProgress } from '@/lib/blast/v2/useBlastProgress';
import { writeGuestProgress, writeResumeHint, readResumeHint } from '@/lib/blast/v2/guestProgress';
import { todayUtcVariant } from '@/lib/blast/v2/dailyVariant';
import { resolveOfflineLevel } from '@/lib/blast/v2/offlineLevelResolver';
import type { BlastLevel, Locale } from '@/lib/blast/v2/types';
import { type UnlocksSeen, validateUnlocksSeen } from '@/lib/blast/v2/tutorial/unlocks-seen';

type Props = {
  level: BlastLevel;
};

/**
 * Load a Wordfall level with graceful offline fallback. Online: fetch the
 * server-built level (higher-quality board + generated levels 31+). Offline,
 * or on any fetch failure: build it client-side from the bundled chain packs
 * (`resolveOfflineLevel`). Returns null only when the level is past the
 * playable range — the campaign-end signal. Never throws.
 */
async function loadBlastLevel(levelNumber: number, locale: Locale): Promise<BlastLevel | null> {
  const offlineNow = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (!offlineNow) {
    try {
      const res = await fetch(
        `/api/blast/level?level=${levelNumber}&locale=${locale}&variant=${todayUtcVariant()}`,
      );
      if (res.ok) return (await res.json()) as BlastLevel;
    } catch {
      // Network hiccup mid-ride — fall through to the bundled offline build.
    }
  }
  return resolveOfflineLevel(levelNumber, locale);
}

export function BlastV2PageClient({ level: initialLevel }: Props) {
  const router = useRouter();
  const [level, setLevel] = useState<BlastLevel>(initialLevel);
  const [unlocksSeen, setUnlocksSeen] = useState<UnlocksSeen>({});
  const [isVeteran] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  // Bumped on a level loss to force a fresh BlastGame mount of the SAME level —
  // the key includes it, so React tears down and rebuilds with reset state
  // (board, strikes, coins-this-run) while the campaign position is untouched.
  const [retryToken, setRetryToken] = useState(0);
  // Boot gate — hold the game render until saved progress resolves so a
  // resuming player never sees level 1 flash before snapping to level N. We seed
  // it from a synchronous resume hint: only gate when we have reason to believe a
  // resume is coming. Genuinely-new players (no hint, or hint === 1) skip the
  // loader and paint level 1 instantly. A cross-device returner with no local
  // hint sees a one-time level-1 → level-N swap, then the hint is written.
  const [booting, setBooting] = useState(
    () => (readResumeHint() ?? 1) > initialLevel.levelNumber,
  );
  const advancingRef = useRef(false);
  const bootedRef = useRef(false);
  const { t } = useLanguage();

  // Single source of truth for progress. We own the one instance and hand it to
  // BlastGame so there's exactly one progress GET per page load, and so coins /
  // chest survive BlastGame's keyed remount on each level advance.
  const progress = useBlastProgress();
  const { state: progressState, currentLevel, progressLoaded, isGuest } = progress;

  // Resume the player's seen-tutorial flags so they don't re-watch FTUE prompts
  // (coin overlay, reverse selection, etc.) they already cleared on a prior run.
  useEffect(() => {
    if (progressLoaded) setUnlocksSeen(validateUnlocksSeen(progressState.unlocksSeenFlag));
  }, [progressLoaded, progressState.unlocksSeenFlag]);

  // Resume at the saved high-water-mark level once progress has loaded.
  useEffect(() => {
    if (!progressLoaded || bootedRef.current) return;
    bootedRef.current = true;
    let cancelled = false;
    (async () => {
      if (currentLevel <= initialLevel.levelNumber) {
        if (!cancelled) setBooting(false);
        return;
      }
      // Best-effort resume — loadBlastLevel falls back to the bundled offline
      // build, so a connection drop resumes the saved level instead of
      // stranding the player on the SSR level 1.
      const resumed = await loadBlastLevel(currentLevel, initialLevel.locale);
      if (resumed && !cancelled) setLevel(resumed);
      if (!cancelled) setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [progressLoaded, currentLevel, initialLevel]);

  const handleLevelCleared = useCallback(
    (nextLevel: number) => {
      // Paint fast-path hint for next visit (all users).
      writeResumeHint(nextLevel);
      // Guests persist their progress immediately when a level completes
      // (not waiting for the Next button to be clicked). Authed players are
      // persisted server-side by clear-level RPC in BlastGame.
      if (isGuest) {
        writeGuestProgress({ currentLevel: nextLevel, locale: level.locale });
      }
    },
    [isGuest, level.locale],
  );

  const handleAdvance = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    const nextNumber = level.levelNumber + 1;
    try {
      const next = await loadBlastLevel(nextNumber, level.locale);
      if (!next) {
        // null = past the playable range (campaign end), online or off.
        setReachedEnd(true);
        return;
      }
      setLevel(next);
      // Paint fast-path hint for next visit (all users).
      writeResumeHint(nextNumber);
      // Authed players are persisted server-side by clear-level; guests keep
      // their level position in localStorage so a refresh resumes here.
      if (isGuest) {
        writeGuestProgress({ currentLevel: nextNumber, locale: level.locale });
      }
    } finally {
      advancingRef.current = false;
    }
  }, [level.levelNumber, level.locale, isGuest]);

  // Retry the current level after a loss. No fetch, no advance, no clear-level —
  // just a fresh mount of the same level. Campaign progress is already safe
  // because clear-level only runs on a win.
  const handleRetry = useCallback(() => {
    setRetryToken((n) => n + 1);
  }, []);

  const handleRestart = useCallback(() => {
    setLevel(initialLevel);
    setReachedEnd(false);
    advancingRef.current = false;
  }, [initialLevel]);

  if (booting) {
    return (
      <div data-testid="blast-boot-loader" className="flex min-h-dvh items-center justify-center bg-[#0b1530] text-white px-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-24 h-24 animate-neo-wobble">
            <Image
              src="/mascot/waiting.webp"
              alt=""
              fill
              sizes="96px"
              priority
              className="object-contain drop-shadow-[3px_3px_0_#000]"
            />
          </div>
          <p className="font-neo-body text-base text-white">{t('blast.loadingProgress')}</p>
        </div>
      </div>
    );
  }

  if (reachedEnd) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0b1530] text-white px-6">
        <div className="flex flex-col items-center gap-5 max-w-sm text-center">
          <div className="relative w-40 h-40 animate-neo-pop">
            <Image
              src="/mascot/trophy-nobg.webp"
              alt=""
              fill
              sizes="160px"
              priority
              className="object-contain drop-shadow-[3px_3px_0_#000]"
            />
          </div>
          <h1 className="font-neo-display text-3xl leading-tight">
            {t('blast.allCleared')}
          </h1>
          <p className="font-neo-body text-base text-white">
            {t('blast.moreLevelsComingSoon')}
          </p>
          <button
            onClick={handleRestart}
            className="mt-2 px-6 py-3 bg-neo-lime border-neo-thick border-black rounded-neo font-neo-display text-lg text-black shadow-hard hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-hard-pressed transition-transform"
          >
            {t('blast.playAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <BlastGame
      key={`${level.locale}-${level.levelNumber}-${retryToken}`}
      level={level}
      progress={progress}
      unlocksSeen={unlocksSeen}
      isVeteranPlayer={isVeteran}
      onAdvance={handleAdvance}
      onRetry={handleRetry}
      onHome={() => router.push(`/${level.locale}`)}
      onLevelCleared={handleLevelCleared}
      onUpdateUnlocks={(updated) => setUnlocksSeen(updated)}
    />
  );
}
