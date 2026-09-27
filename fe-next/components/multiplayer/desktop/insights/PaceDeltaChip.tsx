import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { RosterPlayer } from '../RosterRail';
import type { MpDesktopMode } from '../types';
import { getMpTheme } from '@/lib/multiplayer/desktopThemes';
import { cn } from '@/lib/utils';

interface PaceDeltaChipProps {
  leaderboard: RosterPlayer[];
  meId?: string;
  mode: MpDesktopMode;
}

export interface PaceDelta {
  delta: number;
  status: 'leading' | 'trailing' | 'tied' | 'solo';
  leaderUsername: string | null;
}

export function computePaceDelta(leaderboard: RosterPlayer[], meId?: string): PaceDelta {
  if (!meId || leaderboard.length === 0) {
    return { delta: 0, status: 'solo', leaderUsername: null };
  }
  const me = leaderboard.find(p => p.userId === meId || p.isYou);
  if (!me) return { delta: 0, status: 'solo', leaderUsername: null };
  const others = leaderboard.filter(p => p.userId !== me.userId);
  if (others.length === 0) return { delta: 0, status: 'solo', leaderUsername: null };
  const leader = others.reduce((best, p) => (p.score > best.score ? p : best), others[0]);
  const delta = me.score - leader.score;
  if (delta > 0) return { delta, status: 'leading', leaderUsername: leader.username };
  if (delta < 0) return { delta, status: 'trailing', leaderUsername: leader.username };
  return { delta: 0, status: 'tied', leaderUsername: leader.username };
}

export function PaceDeltaChip({ leaderboard, meId, mode }: PaceDeltaChipProps) {
  const { t } = useLanguage();
  const theme = getMpTheme(mode);
  const pace = useMemo(() => computePaceDelta(leaderboard, meId), [leaderboard, meId]);

  if (pace.status === 'solo') return null;

  const sign = pace.delta > 0 ? '+' : '';
  const label =
    pace.status === 'leading'
      ? t('mp.insights.paceDeltaPositive')
      : pace.status === 'trailing'
      ? t('mp.insights.paceDeltaNegative')
      : t('mp.insights.paceDeltaTied');

  const tone =
    pace.status === 'leading'
      ? `${theme.borderClass} ${theme.bgTintClass} ${theme.textClass}`
      : pace.status === 'trailing'
      ? 'border-neo-red bg-neo-red/5 text-neo-red'
      : 'border-foreground/40 bg-foreground/5 text-foreground/70';

  return (
    <div
      data-testid="pace-delta-chip"
      data-status={pace.status}
      className={cn(
        'inline-flex items-center gap-2 px-2 py-1 border-2 rounded-md text-xs font-bold',
        tone,
      )}
    >
      <span className="uppercase tracking-wide text-[10px] opacity-80">{label}</span>
      <span data-testid="pace-delta-value" className="tabular-nums">
        {sign}
        {pace.delta}
      </span>
    </div>
  );
}
