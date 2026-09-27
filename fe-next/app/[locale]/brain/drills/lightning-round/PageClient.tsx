'use client';

import DrillPageShell, { type DrillComponentProps } from '@/components/brain/DrillPageShell';
import LightningRound from '@/components/drills/LightningRound';
import type { ComponentType } from 'react';

export default function LightningRoundPageClient({ isCheck }: { isCheck: boolean }) {
  return <DrillPageShell drillType="lightning-round" Drill={LightningRound as unknown as ComponentType<DrillComponentProps>} isCheck={isCheck} />;
}
