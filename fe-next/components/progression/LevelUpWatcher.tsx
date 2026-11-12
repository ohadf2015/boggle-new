'use client';

import { useEffect, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { consumeLevelUp, getPendingLevelUp, settleLevelUp, subscribeLevelUp } from '@/lib/levelUp/levelUpBus';

const LevelUpCelebration = dynamic(
  () => import('@/components/animations/LevelUpCelebration').then(m => m.LevelUpCelebration),
  { ssr: false },
);

const none = () => null;

export function LevelUpWatcher() {
  const pending = useSyncExternalStore(subscribeLevelUp, getPendingLevelUp, none);

  // Passive effect on purpose: reveal hosts register in layout effects, so same-commit hosts are counted first.
  useEffect(() => {
    if (pending?.display === 'undecided') settleLevelUp();
  }, [pending]);

  if (pending?.display !== 'celebrate') return null;
  return <LevelUpCelebration level={pending.newLevel} title={pending.title} show onDismiss={consumeLevelUp} />;
}

export default LevelUpWatcher;
