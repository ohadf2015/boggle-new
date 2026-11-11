'use client';

import { useEffect, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { getNewUnlocksBetween } from '@/lib/avatar/unlocks';
import { consumeLevelUp, getPendingLevelUp, subscribeLevelUp } from '@/lib/levelUp/levelUpBus';

const LevelUpCelebration = dynamic(
  () => import('@/components/animations/LevelUpCelebration').then(m => m.LevelUpCelebration),
  { ssr: false },
);

const none = () => null;

export function LevelUpWatcher() {
  const pending = useSyncExternalStore(subscribeLevelUp, getPendingLevelUp, none);
  const grantsParts = !!pending && getNewUnlocksBetween(pending.oldLevel, pending.newLevel).length > 0;

  useEffect(() => {
    if (grantsParts) consumeLevelUp();
  }, [grantsParts]);

  if (!pending || grantsParts) return null;
  return <LevelUpCelebration level={pending.newLevel} title={pending.title} show onDismiss={consumeLevelUp} />;
}

export default LevelUpWatcher;
