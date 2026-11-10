'use client';

import { GraduationCap, Gamepad2, Armchair } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EduToday, TodayTile } from '@/lib/admin/eduToday';
import { dayDeltaSentence } from '../shared/delta';
import { TrendTile } from '../shared/TrendTile';

const tone = (pct: number | null) => (pct === null || pct === 0 ? 'flat' : pct > 0 ? 'up' : 'down');

/** Today so far against yesterday: the first thing an owner asks about the classroom product. */
export function EduTodayStrip({ today }: { today: EduToday }) {
  const { t } = useLanguage();
  if (!today?.available) return null;
  const tile = (id: string, label: string, icon: React.ReactNode, v: TodayTile) => (
    <TrendTile testId={`edu-today-${id}`} icon={icon} label={label} value={v.current} deltaText={dayDeltaSentence(v, t)} deltaTone={tone(v.pct)} spark={v.spark} />
  );
  return (
    <section data-testid="edu-today" aria-label={t('admin.eduDashboard.today.title', 'Today vs yesterday')} className="space-y-2">
      <h3 className="text-sm font-semibold text-neo-cream">{t('admin.eduDashboard.today.title', 'Today vs yesterday')}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tile('rounds', t('admin.eduDashboard.today.rounds', 'Class games today'), <Gamepad2 className="h-4 w-4 text-neo-lime" />, today.rounds)}
        {tile('teachers', t('admin.eduDashboard.today.teachers', 'Teachers teaching today'), <GraduationCap className="h-4 w-4 text-neo-cyan" />, today.teachers)}
        {tile('seats', t('admin.eduDashboard.today.seats', 'Student seats today'), <Armchair className="h-4 w-4 text-neo-pink" />, today.seats)}
      </div>
    </section>
  );
}
