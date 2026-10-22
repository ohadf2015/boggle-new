'use client';

import { useState } from 'react';
import { ClassTableCard, ModeMixCard } from './edu-dashboard/EduClassCards';
import { EduAttentionList } from './edu-dashboard/EduAttentionList';
import { EduFunnelCard } from './edu-dashboard/EduFunnelCard';
import { EduHealthBar } from './edu-dashboard/EduHealthBar';
import { EduKpiGrid } from './edu-dashboard/EduKpiGrid';
import { EduTeacherTable } from './edu-dashboard/EduTeacherTable';
import { EduVerdictHero } from './edu-dashboard/EduVerdictHero';
import type { ActiveDrill, EduDashboardView } from './edu-dashboard/eduDashboardShared';

export type { EduDashboardView } from './edu-dashboard/eduDashboardShared';

export function EduDashboardSections({ data }: { data: EduDashboardView }) {
  const [drill, setDrill] = useState<ActiveDrill | null>(null);

  const openDrill = (next: ActiveDrill) => {
    setDrill(next);
    const target = next.kind === 'classes' ? 'edu-class-table' : 'edu-teacher-table';
    requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }));
  };
  const clear = () => setDrill(null);

  return (
    <div className="space-y-4">
      <EduVerdictHero verdict={data.verdict} drill={data.drill.funnel} onDrill={openDrill} />
      <div className="grid gap-4 lg:grid-cols-2">
        <EduAttentionList attention={data.attention} teachers={data.teachers} />
        <div className="space-y-4">
          <EduFunnelCard steps={data.funnel} drill={data.drill.funnel} onDrill={openDrill} />
          <EduHealthBar rows={data.teachers} />
        </div>
      </div>
      <EduKpiGrid data={data} onDrill={openDrill} />
      <EduTeacherTable rows={data.teachers} drill={drill?.kind === 'teachers' ? drill : null} onClearDrill={clear} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ClassTableCard rows={data.classes} drill={drill?.kind === 'classes' ? drill : null} onClearDrill={clear} />
        <ModeMixCard rows={data.modeMix} roundsAvailable={data.roundsAvailable} />
      </div>
    </div>
  );
}
