'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { BlastGame } from '@/components/blast/v2/BlastGame';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBlastProgress } from '@/lib/blast/v2/useBlastProgress';
import { writeGuestProgress, writeResumeHint, readResumeHint } from '@/lib/blast/v2/guestProgress';
import { todayUtcVariant } from '@/lib/blast/v2/dailyVariant';
import type { BlastLevel } from '@/lib/blast/v2/types';
import { type UnlocksSeen, validateUnlocksSeen } from '@/lib/blast/v2/tutorial/unlocks-seen';

type Props = {
  level: BlastLevel;
};

export function BlastV2PageClient({ level: initialLevel }: Props) {
  const [level, setLevel] = useState<BlastLevel>(initialLevel);
  const [unlocksSeen, setUnlocksSeen] = useState<UnlocksSeen>({});
  const [isVeteran] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
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
      try {
        const res = await fetch(`/api/blast/level?level=${currentLevel}&locale=${initialLevel.locale}&variant=${todayUtcVariant()}`);
        if (!res.ok) throw new Error('resume level fetch failed');
        const resumed = (await res.json()) as BlastLevel;
        if (!cancelled) setLevel(resumed);
      } catch (e) {
        // Best-effort resume — degrade to the SSR level 1 rather than strand the player.
        console.error('Failed to resume blast level:', e);
      } finally {
        if (!cancelled) setBooting(false);
      }
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
      const res = await fetch(
        `/api/blast/level?level=${nextNumber}&locale=${level.locale}&variant=${todayUtcVariant()}`,
      );
      if (!res.ok) {
        setReachedEnd(true);
        return;
      }
      const next = (await res.json()) as BlastLevel;
      setLevel(next);
      // Paint fast-path hint for next visit (all users).
      writeResumeHint(nextNumber);
      // Authed players are persisted server-side by clear-level; guests keep
      // their level position in localStorage so a refresh resumes here.
      if (isGuest) {
        writeGuestProgress({ currentLevel: nextNumber, locale: level.locale });
      }
    } catch (e) {
      console.error('Failed to load next blast level:', e);
      setReachedEnd(true);
    } finally {
      advancingRef.current = false;
    }
  }, [level.levelNumber, level.locale, isGuest]);

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
      key={`${level.locale}-${level.levelNumber}`}
      level={level}
      progress={progress}
      unlocksSeen={unlocksSeen}
      isVeteranPlayer={isVeteran}
      onAdvance={handleAdvance}
      onLevelCleared={handleLevelCleared}
      onUpdateUnlocks={(updated) => setUnlocksSeen(updated)}
    />
  );
}
