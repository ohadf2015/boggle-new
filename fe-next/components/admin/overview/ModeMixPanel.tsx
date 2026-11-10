'use client';

import { useEffect, useState } from 'react';
import { Bomb, Calendar, Gamepad2, Map, RotateCw, Target, User, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { GameModeStats } from '@/lib/landing/fetchGameModeStats';
import type { MpModeBreakdownStat } from '@/lib/admin/fetchMpModeBreakdown';
import { MUTED, PANEL } from '../shared/panelStyles';

const DAYS = [7, 30, 90] as const;

interface Row {
  mode: string;
  playCount: number;
}

interface Look {
  label: string;
  fallback: string;
  icon: React.ElementType;
  color: string;
  bar: string;
}

const ALL_MODES: Record<string, Look> = {
  practice: { label: 'landing.singlePlayer', fallback: 'Single player', icon: User, color: 'text-neo-cyan', bar: 'bg-neo-cyan' },
  arena: { label: 'landing.multiplayer', fallback: 'Multiplayer', icon: Users, color: 'text-neo-pink', bar: 'bg-neo-pink' },
  daily: { label: 'landing.dailyChallenge', fallback: 'Daily challenge', icon: Calendar, color: 'text-neo-lime', bar: 'bg-neo-lime' },
  adventure: { label: 'landing.adventureMode', fallback: 'Adventure', icon: Map, color: 'text-neo-lime', bar: 'bg-neo-lime' },
  blast: { label: 'landing.blastMode', fallback: 'Blast', icon: Bomb, color: 'text-neo-cyan', bar: 'bg-neo-cyan' },
};

const MP_MODES: Record<string, Look> = {
  classic: { label: 'admin.mpModeBreakdown.classic', fallback: 'Classic', icon: Gamepad2, color: 'text-neo-pink', bar: 'bg-neo-pink' },
  blast: { label: 'admin.mpModeBreakdown.blast', fallback: 'Blast', icon: Bomb, color: 'text-neo-cyan', bar: 'bg-neo-cyan' },
  'word-hunt': { label: 'admin.mpModeBreakdown.wordHunt', fallback: 'Word Hunt', icon: Target, color: 'text-neo-lime', bar: 'bg-neo-lime' },
  'wheel-rush': { label: 'admin.mpModeBreakdown.wheelRush', fallback: 'Wheel Rush', icon: RotateCw, color: 'text-neo-purple', bar: 'bg-neo-purple' },
};

function BarList({ title, rows, looks, testId }: { title: string; rows: Row[]; looks: Record<string, Look>; testId: string }) {
  const { t, language } = useLanguage();
  const total = rows.reduce((n, r) => n + r.playCount, 0);
  const max = Math.max(...rows.map((r) => r.playCount), 1);
  return (
    <section data-testid={testId} className="space-y-2">
      <h4 className={`text-xs font-bold uppercase tracking-wider ${MUTED}`}>{title}</h4>
      {rows.length === 0 ? (
        <p className="text-xs text-neo-cream">{t('admin.noData', 'No data available')}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => {
            const look = looks[r.mode] ?? Object.values(looks)[0];
            const Icon = look.icon;
            return (
              <li key={r.mode} className="flex items-center gap-2 text-xs text-neo-white">
                <span className="w-4 text-end font-mono">{i + 1}</span>
                <Icon className={cn('h-4 w-4 shrink-0', look.color)} aria-hidden="true" />
                <span className="w-24 truncate font-bold">{looks[r.mode] ? t(look.label, look.fallback) : r.mode}</span>
                <span className="h-5 flex-1 overflow-hidden rounded-sm bg-neo-navy-elevated/50" aria-hidden="true">
                  <span className={cn('block h-full rounded-sm opacity-80 transition-[width] duration-500', look.bar)} style={{ width: `${(r.playCount / max) * 100}%` }} />
                </span>
                <span className="w-16 text-end font-mono">{r.playCount.toLocaleString(language)}</span>
                <span className="w-12 text-end font-mono">{total > 0 ? ((r.playCount / total) * 100).toFixed(1) : '0'}%</span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="border-t border-slate-700 pt-2 text-xs text-neo-white">{t('admin.totalGames', 'Total')}: {total.toLocaleString(language)}</p>
    </section>
  );
}

/** Which modes get played: every mode, and the multiplayer breakdown, from one request and one range toggle. */
export function ModeMixPanel() {
  const { t } = useLanguage();
  const [days, setDays] = useState<(typeof DAYS)[number]>(30);
  const [data, setData] = useState<{ stats: GameModeStats[]; mpBreakdown: MpModeBreakdownStat[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/game-mode-stats?days=${days}`)
      .then((res) => res.json())
      .then((json) => !cancelled && setData({ stats: json.stats ?? [], mpBreakdown: json.mpBreakdown ?? [] }))
      .catch(() => !cancelled && setData(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <section data-testid="mode-mix" className={`${PANEL} mb-6 space-y-4`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-neo-white">{t('admin.modeMix.title', 'Game modes')}</h3>
        <div role="group" aria-label={t('admin.pulse.window', 'Window')} className="flex gap-1">
          {DAYS.map((d) => (
            <button
              type="button"
              key={d}
              aria-pressed={days === d}
              onClick={() => setDays(d)}
              className={cn('rounded border px-2 py-0.5 text-xs font-bold', days === d ? 'border-neo-cream bg-neo-cream text-neo-navy' : 'border-neo-cream/40 text-neo-cream')}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="space-y-3" data-testid="mode-mix-loading">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-neo bg-neo-navy-elevated/50" role="presentation" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <BarList testId="mode-mix-all" title={t('admin.gameModePopularity', 'Game Mode Popularity')} rows={data?.stats ?? []} looks={ALL_MODES} />
          <BarList testId="mode-mix-mp" title={t('admin.mpModeBreakdown.title', 'MP Mode Breakdown')} rows={data?.mpBreakdown ?? []} looks={MP_MODES} />
        </div>
      )}
    </section>
  );
}
