'use client';

import { Gamepad2, UserCheck, UserPlus, Users, Repeat, Crown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Pulse, PulseTile, PulseWindow } from '@/lib/admin/overviewPulse';
import type { StatsData } from '@/hooks/useAdminDashboard';
import { cn } from '@/lib/utils';
import { FindingsPanel } from '../shared/FindingsPanel';
import { MUTED, PANEL } from '../shared/panelStyles';
import { TrendTile } from '../shared/TrendTile';
import { deltaSentence } from '../shared/delta';
import { describePulseFinding } from './pulseCopy';

const WINDOWS: PulseWindow[] = [7, 30];

interface Props {
  pulse: Pulse | null;
  windowDays: PulseWindow;
  onWindowChange: (w: PulseWindow) => void;
  failed: boolean;
  onRetry: () => void;
  stats: StatsData | null;
  revenue: { paying: number; trialing: number; paidOrders30d: number } | null;
}

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
const tone = (pct: number | null) => (pct === null || pct === 0 ? 'flat' : pct > 0 ? 'up' : 'down');

export function PulseSection({ pulse, windowDays, onWindowChange, failed, onRetry, stats, revenue }: Props) {
  const { t, language } = useLanguage();
  const formatDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(language, { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });

  const header = (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-neo-cream">{t('admin.pulse.title', 'Pulse')}</h2>
        <p className={`text-xs ${MUTED}`}>{t('admin.pulse.subtitle', 'Each number compares with the same number of days just before. Tap a number to jump to its chart.')}</p>
      </div>
      <div role="group" aria-label={t('admin.pulse.window', 'Window')} className="flex gap-1">
        {WINDOWS.map((w) => (
          <button
            key={w}
            type="button"
            aria-pressed={windowDays === w}
            onClick={() => onWindowChange(w)}
            className={cn('rounded border px-3 py-1 text-xs font-semibold tabular-nums', windowDays === w ? 'border-neo-cream bg-neo-cream text-neo-navy' : 'border-neo-cream/40 text-neo-cream')}
          >
            {t('admin.pulse.windowLast', 'Last {days} days', { days: w })}
          </button>
        ))}
      </div>
    </header>
  );

  if (failed) {
    return (
      <section className="mb-6 space-y-3" data-testid="pulse">
        {header}
        <div role="alert" className="flex items-center justify-between gap-3 rounded border-2 border-neo-red p-3 text-sm text-neo-red">
          {t('admin.pulse.loadFailed', 'Could not load the pulse.')}
          <button type="button" onClick={onRetry} className="font-semibold underline">{t('common.retry', 'Retry')}</button>
        </div>
      </section>
    );
  }
  if (!pulse) {
    return (
      <section className="mb-6 space-y-3" data-testid="pulse">
        {header}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} data-testid="pulse-skeleton" className={`${PANEL} h-28 animate-pulse`} />
          ))}
        </div>
      </section>
    );
  }

  const delta = (tile: PulseTile, days: number) => deltaSentence(tile, days, t);
  const noData = t('admin.pulse.notEnough', 'Not enough history yet.');
  const { games, players, signups } = pulse;

  return (
    <section className="mb-6 space-y-4" data-testid="pulse">
      {header}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <TrendTile
          testId="pulse-games"
          icon={<Gamepad2 className="h-4 w-4 text-neo-lime" />}
          label={t('admin.pulse.games', 'Games played')}
          value={games.current}
          deltaText={delta(games, windowDays)}
          deltaTone={tone(games.pct)}
          spark={games.spark}
          onSelect={() => scrollTo('overview-daily')}
        />
        <TrendTile
          testId="pulse-players"
          icon={<Users className="h-4 w-4 text-neo-cyan" />}
          label={t('admin.pulse.players', 'Players per day')}
          value={players.current}
          deltaText={delta(players, windowDays)}
          deltaTone={tone(players.pct)}
          spark={players.spark}
          onSelect={() => scrollTo('overview-daily')}
        />
        <TrendTile
          testId="pulse-signups"
          icon={<UserPlus className="h-4 w-4 text-neo-orange" />}
          label={t('admin.pulse.signups', 'New signups')}
          value={signups ? signups.current : null}
          deltaText={signups ? delta(signups, windowDays === 7 ? 7 : 28) : null}
          deltaTone={tone(signups?.pct ?? null)}
          noData={noData}
          spark={signups?.spark}
          hint={signups ? t('admin.pulse.signupsHint', 'Complete weeks only') : undefined}
          onSelect={() => scrollTo('overview-signups')}
        />
        <TrendTile
          testId="pulse-signedin"
          icon={<UserCheck className="h-4 w-4 text-neo-pink" />}
          label={t('admin.pulse.signedIn', 'Played signed in')}
          value={pulse.signedInShare === null ? null : `${pulse.signedInShare}%`}
          noData={noData}
          hint={t('admin.pulse.signedInHint', 'of games are played by logged-in players')}
        />
        <TrendTile
          testId="pulse-stickiness"
          icon={<Repeat className="h-4 w-4 text-neo-purple" />}
          label={t('admin.pulse.stickiness', 'Stickiness')}
          value={pulse.stickinessPct === null ? null : `${pulse.stickinessPct}%`}
          noData={noData}
          hint={t('admin.pulse.stickinessHint', 'of monthly players show up on an average day')}
        />
        <TrendTile
          testId="pulse-paying"
          icon={<Crown className="h-4 w-4 text-neo-yellow" />}
          label={t('admin.pulse.paying', 'Paying customers')}
          value={revenue ? revenue.paying : null}
          noData={noData}
          hint={revenue ? t('admin.pulse.payingHint', '{trialing} in a trial · {orders} paid orders in 30 days', { trialing: revenue.trialing, orders: revenue.paidOrders30d }) : undefined}
          onSelect={() => scrollTo('overview-revenue')}
        />
      </div>

      {stats && (
        <ul data-testid="pulse-totals" className={`flex flex-wrap gap-x-6 gap-y-1 text-xs ${MUTED}`}>
          <li>{t('admin.pulse.totalRegistered', 'Registered')} <b className="tabular-nums text-neo-cream">{stats.overview.totalPlayers.toLocaleString(language)}</b></li>
          {stats.overview.totalGuests != null && <li>{t('admin.pulse.totalGuests', 'Guests')} <b className="tabular-nums text-neo-cream">{stats.overview.totalGuests.toLocaleString(language)}</b></li>}
          <li>{t('admin.pulse.totalGames', 'Games ever')} <b className="tabular-nums text-neo-cream">{stats.overview.totalGames.toLocaleString(language)}</b></li>
          <li>{t('admin.pulse.totalHours', 'Hours played')} <b className="tabular-nums text-neo-cream">{Math.round(stats.overview.totalGameTimeHours).toLocaleString(language)}</b></li>
        </ul>
      )}

      <FindingsPanel testId="pulse-findings" findings={pulse.findings} describe={(f) => describePulseFinding(f, t, formatDate)} />
    </section>
  );
}
