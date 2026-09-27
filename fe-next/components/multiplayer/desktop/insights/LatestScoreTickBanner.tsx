import { useEffect, useState } from 'react';
import { ScoreTickChip, useScoreTickQueue } from './ScoreTickChip';
import type { RosterPlayer } from '../RosterRail';
import type { MpDesktopMode } from '../types';

interface LatestScoreTickBannerProps {
  leaderboard: RosterPlayer[];
  meId?: string;
  mode: MpDesktopMode;
}

export function LatestScoreTickBanner({ leaderboard, meId, mode }: LatestScoreTickBannerProps) {
  const { ticksByUserId } = useScoreTickQueue(leaderboard);
  const myTicks = meId ? ticksByUserId.get(meId) : undefined;
  const latest = myTicks && myTicks.length ? myTicks[myTicks.length - 1] : null;

  const [shownId, setShownId] = useState<string | null>(null);
  useEffect(() => {
    if (!latest) return undefined;
    setShownId(latest.id);
    const t = window.setTimeout(() => setShownId(null), 650);
    return () => window.clearTimeout(t);
  }, [latest]);

  if (!latest || shownId !== latest.id) {
    return <div data-testid="latest-tick-banner" data-active="false" className="h-0" aria-hidden />;
  }

  return (
    <div data-testid="latest-tick-banner" data-active="true" className="relative h-6 flex items-center justify-end pe-2">
      <ScoreTickChip delta={latest.delta} mode={mode} testId="latest-tick" />
    </div>
  );
}
