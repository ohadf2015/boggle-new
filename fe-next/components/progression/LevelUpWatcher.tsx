'use client';

import { useEffect, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { consumeLevelUp, getPendingLevelUp, settleLevelUp, subscribeLevelUp } from '@/lib/levelUp/levelUpBus';
import { BragButton, useBragSharer } from '@/components/share/BragButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { getBragShareUrl } from '@/utils/share';

const LevelUpCelebration = dynamic(
  () => import('@/components/animations/LevelUpCelebration').then(m => m.LevelUpCelebration),
  { ssr: false },
);

const none = () => null;
const BRAG_DISMISS_MS = 10_000;

export function LevelUpWatcher() {
  const pending = useSyncExternalStore(subscribeLevelUp, getPendingLevelUp, none);
  const { t } = useLanguage();
  const { canBrag, me } = useBragSharer();

  // Passive effect on purpose: reveal hosts register in layout effects, so same-commit hosts are counted first.
  useEffect(() => {
    if (pending?.display === 'undecided') settleLevelUp();
  }, [pending]);

  if (pending?.display !== 'celebrate') return null;
  const level = pending.newLevel;
  const action = canBrag ? (
    <BragButton
      surface="level_up"
      kind="level"
      text={t('brag2.text.level', { level })}
      url={getBragShareUrl('me', { score: level, kind: 'level', me })}
    />
  ) : undefined;
  return (
    <LevelUpCelebration
      level={level}
      title={pending.title}
      show
      onDismiss={consumeLevelUp}
      action={action}
      autoDismissAfter={canBrag ? BRAG_DISMISS_MS : undefined}
    />
  );
}

export default LevelUpWatcher;
