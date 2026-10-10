'use client';

import { useMemo } from 'react';
import { ShellKeysCard, ShellPanel, ShellWordFeed, type ShellT } from '@/components/game/shell';
import type { PyramidState } from '@/lib/connections/pyramid/gameLogic';
import PyramidHeader from './PyramidHeader';

interface RailProps {
  t: ShellT;
  state: PyramidState;
  metaAnswer: string;
}

export function PyramidLeftRail({ t, state, metaAnswer }: RailProps) {
  return (
    <>
      <ShellPanel title={t('connections.pyramid.railMap')}>
        <PyramidHeader state={state} metaAnswer={metaAnswer} testId="pyramid-rail-map" className="px-3 pb-4 [&>:last-child]:[zoom:0.82] tv:[&>:last-child]:[zoom:1.2]" />
      </ShellPanel>
      <ShellKeysCard t={t} showClear={false} />
    </>
  );
}

export function PyramidRightRail({ t, state }: Omit<RailProps, 'metaAnswer'>) {
  const words = useMemo(() => state.solvedBridges.map((word) => ({ word })), [state.solvedBridges]);
  return (
    <ShellWordFeed
      words={words}
      t={t}
      title={t('connections.pyramid.railSolved')}
      empty={{ title: t('connections.pyramid.railEmptyTitle') ?? '', body: t('connections.pyramid.railEmptyBody') ?? '' }}
    />
  );
}
