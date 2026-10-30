'use client';

import { useMemo, type ReactNode } from 'react';
import { ShellKeysCard, ShellPanel, ShellWordFeed, type ShellT } from '@/components/game/shell';

export function DailyLeftRail({ t, header }: { t: ShellT; header: ReactNode }) {
  return (
    <>
      <ShellPanel title={t('connections.daily.title')}>{header}</ShellPanel>
      <ShellKeysCard t={t} showClear={false} />
    </>
  );
}

export function DailyRightRail({ t, solvedWords }: { t: ShellT; solvedWords: readonly string[] }) {
  const words = useMemo(() => solvedWords.map((word) => ({ word })), [solvedWords]);
  return (
    <ShellWordFeed
      words={words}
      t={t}
      title={t('connections.pyramid.railSolved')}
      empty={{ title: t('connections.daily.railEmptyTitle') ?? '', body: t('connections.daily.railEmptyBody') ?? '' }}
    />
  );
}
