'use client';
import { useEffect, useState, useCallback } from 'react';
import { BlastGame } from '@/components/blast/v2/BlastGame';
import type { BlastLevel } from '@/lib/blast/v2/types';
import type { UnlocksSeen } from '@/lib/blast/v2/tutorial/unlocks-seen';

type Props = {
  level: BlastLevel;
};

export function BlastV2PageClient({ level: initialLevel }: Props) {
  const [level, setLevel] = useState<BlastLevel>(initialLevel);
  const [unlocksSeen, setUnlocksSeen] = useState<UnlocksSeen>({});
  const [isVeteran] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);

  useEffect(() => {
    // Plan 3 (DB) replaces this with a real progress fetch.
    setUnlocksSeen({});
  }, []);

  const handleAdvance = useCallback(async () => {
    if (advancing) return;
    setAdvancing(true);
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
      setAdvancing(false);
    }
  }, [advancing, level.levelNumber, level.locale]);

  if (reachedEnd) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0b1530] text-white">
        <p className="font-neo-display text-2xl">More levels coming soon!</p>
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
