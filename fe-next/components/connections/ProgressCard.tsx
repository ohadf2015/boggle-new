'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { BridgeProgressApi } from './useBridgeProgress';
import RankBadge from './RankBadge';
import WeekStrip from './WeekStrip';

interface ProgressCardProps {
  api: BridgeProgressApi;
  todayISO: string;
}

/** Results-screen progress: lifetime rank, bridges built, and the week at a glance. */
export default function ProgressCard({ api, todayISO }: ProgressCardProps) {
  const { t } = useLanguage();
  return (
    <section
      data-testid="progress-card"
      className="flex flex-col gap-4 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-4 shadow-hard-sm"
    >
      <RankBadge standing={api.standing} rankUpId={api.rankUpId} onRankUpShown={api.dismissRankUp} />
      <p className="font-neo-body text-xs text-neo-white/70">
        {t('connections.rank.bridges', { count: api.progress.bridges })}
      </p>
      <WeekStrip days={api.progress.days} todayISO={todayISO} />
    </section>
  );
}
