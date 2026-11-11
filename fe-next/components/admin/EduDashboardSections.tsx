'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClassTableCard } from './edu-dashboard/EduClassCards';
import { EduAttentionList } from './edu-dashboard/EduAttentionList';
import { EduFindings } from './edu-dashboard/EduFindings';
import { EduFunnelCard } from './edu-dashboard/EduFunnelCard';
import { EduHealthBar } from './edu-dashboard/EduHealthBar';
import { EduKpiGrid } from './edu-dashboard/EduKpiGrid';
import { EduProTab } from './edu-dashboard/EduProTab';
import { EduTeacherTable } from './edu-dashboard/EduTeacherTable';
import { EduUsageTab } from './edu-dashboard/EduUsageTab';
import { EduTodayStrip } from './edu-dashboard/EduTodayStrip';
import { EduVerdictHero } from './edu-dashboard/EduVerdictHero';
import type { ActiveDrill, EduDashboardView } from './edu-dashboard/eduDashboardShared';

export type { EduDashboardView } from './edu-dashboard/eduDashboardShared';

type TabKey = 'overview' | 'usage' | 'teachers' | 'classes' | 'pro';

const TAB_TRIGGER = 'data-[state=active]:bg-neo-cream data-[state=active]:text-neo-navy text-neo-cream';

export function EduDashboardSections({ data }: { data: EduDashboardView }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<TabKey>('overview');
  const [drill, setDrill] = useState<ActiveDrill | null>(null);

  const openDrill = (next: ActiveDrill) => {
    setDrill(next);
    setTab(next.kind === 'classes' ? 'classes' : 'teachers');
  };
  const clear = () => setDrill(null);
  const soon = data.insights.pro.expiringSoon.length;

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="space-y-3">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
        <TabsTrigger value="overview" className={TAB_TRIGGER}>{t('admin.eduDashboard.tab.overview', 'Overview')}</TabsTrigger>
        <TabsTrigger value="usage" className={TAB_TRIGGER}>{t('admin.eduDashboard.tab.usage', 'Usage')}</TabsTrigger>
        <TabsTrigger value="teachers" className={TAB_TRIGGER}>
          {t('admin.eduDashboard.tab.teachers', 'Teachers')}
          <span className="ms-1.5 tabular-nums opacity-70">{data.teachers.length}</span>
        </TabsTrigger>
        <TabsTrigger value="classes" className={TAB_TRIGGER}>
          {t('admin.eduDashboard.tab.classes', 'Classes')}
          <span className="ms-1.5 tabular-nums opacity-70">{data.classes.length}</span>
        </TabsTrigger>
        <TabsTrigger value="pro" className={TAB_TRIGGER}>
          {t('admin.eduDashboard.tab.pro', 'Pro & trials')}
          {soon > 0 && <span className="ms-1.5 rounded-full bg-neo-yellow px-1.5 text-[11px] font-bold tabular-nums text-neo-navy">{soon}</span>}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <EduTodayStrip today={data.today} />
        <EduVerdictHero verdict={data.verdict} drill={data.drill.funnel} onDrill={openDrill} />
        <EduFindings data={data} onDrill={openDrill} />
        <div className="grid gap-4 lg:grid-cols-2">
          <EduAttentionList attention={data.attention} teachers={data.teachers} />
          <div className="space-y-4">
            <EduFunnelCard steps={data.funnel} drill={data.drill.funnel} onDrill={openDrill} />
            <EduHealthBar rows={data.teachers} />
          </div>
        </div>
        <EduKpiGrid data={data} onDrill={openDrill} only={['activeTeachers', 'newTeachers', 'classesWithLiveGame', 'liveRounds']} />
      </TabsContent>
      <TabsContent value="usage"><EduUsageTab data={data} onDrill={openDrill} /></TabsContent>
      <TabsContent value="teachers">
        <EduTeacherTable rows={data.teachers} classes={data.classes} drill={drill?.kind === 'teachers' ? drill : null} onClearDrill={clear} />
      </TabsContent>
      <TabsContent value="classes">
        <ClassTableCard rows={data.classes} drill={drill?.kind === 'classes' ? drill : null} onClearDrill={clear} />
      </TabsContent>
      <TabsContent value="pro"><EduProTab data={data} onDrill={openDrill} /></TabsContent>
    </Tabs>
  );
}
