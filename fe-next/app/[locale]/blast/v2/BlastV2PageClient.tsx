'use client';
import { useEffect, useState } from 'react';
import { BlastGame } from '@/components/blast/v2/BlastGame';
import type { BlastLevel } from '@/lib/blast/v2/types';
import type { UnlocksSeen } from '@/lib/blast/v2/tutorial/unlocks-seen';
import { isVeteran as checkVeteran } from '@/lib/blast/v2/tutorial/veteran-detection';

type Props = {
  level: BlastLevel;
};

type BlastProgressSnapshot = { max_level_cleared?: number; unlocks_seen?: UnlocksSeen };

export function BlastV2PageClient({ level }: Props) {
  const [unlocksSeen, setUnlocksSeen] = useState<UnlocksSeen>({});
  const [isVeteran, setIsVeteran] = useState(false);

  useEffect(() => {
    // Plan 3 replaces this with real DB fetch
    const fetchProgress = async () => {
      try {
        // Stub: assume guest = no prior progress
        setIsVeteran(false);
        setUnlocksSeen({});
      } catch (e) {
        console.error('Failed to fetch blast progress:', e);
      }
    };
    fetchProgress();
  }, []);

  return (
    <BlastGame
      level={level}
      unlocksSeen={unlocksSeen}
      isVeteranPlayer={isVeteran}
      onAdvance={() => console.log('advance')}
      onUpdateUnlocks={(updated) => {
        setUnlocksSeen(updated);
        // Plan 3 wires the DB write here
      }}
    />
  );
}
