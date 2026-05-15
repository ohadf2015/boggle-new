'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { BlastGame } from '@/components/blast/v2/BlastGame';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BlastLevel } from '@/lib/blast/v2/types';
import type { UnlocksSeen } from '@/lib/blast/v2/tutorial/unlocks-seen';

type Props = {
  level: BlastLevel;
};

export function BlastV2PageClient({ level: initialLevel }: Props) {
  const [level, setLevel] = useState<BlastLevel>(initialLevel);
  const [unlocksSeen, setUnlocksSeen] = useState<UnlocksSeen>({});
  const [isVeteran] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const advancingRef = useRef(false);
  const { t } = useLanguage();

  useEffect(() => {
    // Plan 3 (DB) replaces this with a real progress fetch.
    setUnlocksSeen({});
  }, []);

  const handleAdvance = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    const nextNumber = level.levelNumber + 1;
    try {
      const res = await fetch(
        `/api/blast/level?level=${nextNumber}&locale=${level.locale}`,
      );
      if (!res.ok) {
        setReachedEnd(true);
        return;
      }
      const next = (await res.json()) as BlastLevel;
      setLevel(next);
    } catch (e) {
      console.error('Failed to load next blast level:', e);
      setReachedEnd(true);
    } finally {
      advancingRef.current = false;
    }
  }, [level.levelNumber, level.locale]);

  const handleRestart = useCallback(() => {
    setLevel(initialLevel);
    setReachedEnd(false);
    advancingRef.current = false;
  }, [initialLevel]);

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
          <p className="font-neo-body text-base text-white/80">
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
      unlocksSeen={unlocksSeen}
      isVeteranPlayer={isVeteran}
      onAdvance={handleAdvance}
      onUpdateUnlocks={(updated) => setUnlocksSeen(updated)}
    />
  );
}
