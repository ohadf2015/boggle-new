'use client';

import DrillPageShell, { type DrillComponentProps } from '@/components/brain/DrillPageShell';
import MemoryHunt from '@/components/drills/MemoryHunt';
import type { ComponentType } from 'react';

export default function MemoryHuntPageClient({ isCheck }: { isCheck: boolean }) {
  return <DrillPageShell drillType="memory-hunt" Drill={MemoryHunt as unknown as ComponentType<DrillComponentProps>} isCheck={isCheck} />;
}
