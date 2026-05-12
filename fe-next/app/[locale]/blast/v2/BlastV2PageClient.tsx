'use client';
import { BlastGame } from '@/components/blast/v2/BlastGame';
import type { BlastLevel } from '@/lib/blast/v2/types';

type Props = {
  level: BlastLevel;
};

export function BlastV2PageClient({ level }: Props) {
  return <BlastGame level={level} onAdvance={() => console.log('advance')} />;
}
