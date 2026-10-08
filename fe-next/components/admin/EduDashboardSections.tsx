'use client';

import { DyingClassesCard, ClassTableCard, ModeMixCard } from './edu-dashboard/EduClassCards';
import { EduFunnelCard } from './edu-dashboard/EduFunnelCard';
import { EduHealthBar } from './edu-dashboard/EduHealthBar';
import { EduKpiGrid } from './edu-dashboard/EduKpiGrid';
import { EduRescueList } from './edu-dashboard/EduRescueList';
import { EduTeacherTable } from './edu-dashboard/EduTeacherTable';
import { EduVerdictHero } from './edu-dashboard/EduVerdictHero';
import type { EduDashboardView } from './edu-dashboard/eduDashboardShared';

export { formatDelta, healthLabel, type EduDashboardView } from './edu-dashboard/eduDashboardShared';

export function EduDashboardSections({ data }: { data: EduDashboardView }) {
  return (
    <div className="space-y-4">
      <EduVerdictHero verdict={data.verdict ?? null} />
      <EduKpiGrid data={data} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <EduFunnelCard steps={data.funnel} />
          <EduHealthBar rows={data.teachers} />
        </div>
        <EduRescueList verdict={data.verdict ?? null} />
      </div>
      <EduTeacherTable rows={data.teachers} />
      <div className="grid gap-4 lg:grid-cols-2">
        <DyingClassesCard rows={data.dyingClasses} />
        <ClassTableCard rows={data.classes} />
      </div>
      <ModeMixCard rows={data.modeMix} roundsAvailable={data.roundsAvailable} />
    </div>
  );
}
