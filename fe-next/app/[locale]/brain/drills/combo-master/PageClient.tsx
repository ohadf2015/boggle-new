'use client';

import DrillPageShell, { type DrillComponentProps } from '@/components/brain/DrillPageShell';
import ComboMaster from '@/components/drills/ComboMaster';
import type { ComponentType } from 'react';

export default function ComboMasterPageClient({ isCheck }: { isCheck: boolean }) {
  return <DrillPageShell drillType="combo-master" Drill={ComboMaster as unknown as ComponentType<DrillComponentProps>} isCheck={isCheck} />;
}
