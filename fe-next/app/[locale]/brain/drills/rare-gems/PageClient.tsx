'use client';

import DrillPageShell, { type DrillComponentProps } from '@/components/brain/DrillPageShell';
import RareGems from '@/components/drills/RareGems';
import type { ComponentType } from 'react';

export default function RareGemsPageClient({ isCheck }: { isCheck: boolean }) {
  return <DrillPageShell drillType="rare-gems" Drill={RareGems as unknown as ComponentType<DrillComponentProps>} isCheck={isCheck} />;
}
