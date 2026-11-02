'use client';

import { memo, useMemo, type ReactNode } from 'react';
import { ShellKeysCard, ShellStandings, ShellStats, ShellWordFeed, type ShellStandingRow } from '@/components/game/shell';

type T = (key: string, params?: Record<string, string | number>) => string;

interface LeftRailProps {
  t: T;
  dateLabel?: string;
  growthM: number;
  targetM: number;
  heightM: number;
  floors: number;
  streak: number;
  standings: readonly ShellStandingRow[];
  /** The goal-reached card, docked here instead of floating over the tower. */
  goalCard?: ReactNode;
}

/** Desktop daily start rail: today's progress, the race and the keyboard card. */
export const DailyTowerLeftRail = memo(function DailyTowerLeftRail(p: LeftRailProps) {
  const { t } = p;
  const m = t('wordTowerV2.unitM');
  const stats = [
    { id: 'grew', label: t('wordTowerV2.dailyTower.grewToday'), value: `+${Math.round(p.growthM)}${m}`, tone: 'accent' as const },
    { id: 'height', label: t('wordTowerV2.dailyResults.height'), value: `${p.heightM.toFixed(1)}${m}` },
    { id: 'floors', label: t('wordTowerV2.dailyResults.floors'), value: p.floors },
    { id: 'streak', label: t('gameShell.streak'), value: p.streak },
  ];
  return (
    <aside
      data-wt2-rails
      className="absolute bottom-0 start-0 top-0 z-30 flex w-[var(--wt2-rail)] flex-col gap-3 border-e-4 border-neo-cream/30 bg-neo-navy px-3 py-4"
    >
      <ShellStats
        title={p.dateLabel ? t('wordTowerV2.hud.dailyBadge', { date: p.dateLabel }) : t('wordTowerV2.hud.daily')}
        accent="yellow"
        stats={stats}
        progress={p.targetM > 0 ? { label: t('wordTowerV2.dailyTower.goal'), value: p.growthM / p.targetM } : undefined}
      />
      {p.goalCard}
      {p.standings.length > 0 ? (
        <ShellStandings rows={p.standings} t={t} title={t('wordTowerV2.dailyTower.boardTitle')} accent="pink" />
      ) : null}
      {/* Esc only takes back a hanging word here, so "start over" would teach a key that does nothing. */}
      <ShellKeysCard t={t} showClear={false} />
    </aside>
  );
});

/** Desktop daily: every word built so far, under the wheel (a slab that landed beside the tower is not a floor). */
export const DailyTowerFeed = memo(function DailyTowerFeed({ t, words }: { t: T; words: readonly string[] }) {
  const feed = useMemo(() => words.map((word) => ({ word })), [words]);
  return <ShellWordFeed words={feed} t={t} accent="lime" />;
});
