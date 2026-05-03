'use client';

import PracticeClassicSandbox from '@/components/practice/PracticeClassicSandbox';
import PracticeWordHuntSandbox from '@/components/practice/PracticeWordHuntSandbox';
import PracticeWheelSandbox from '@/components/practice/PracticeWheelSandbox';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

interface Props {
  mode: PracticeMode;
  locale: string;
}

/**
 * Practice mode router. Drops the player straight into the sandbox — the
 * sandbox itself shows a single instruction line and progress dots, which
 * replaced the old intro card + tutorial sheet (too much chrome before the
 * first interaction).
 */
export default function PracticePageClient({ mode }: Props) {
  if (mode === 'wordHunt') return <PracticeWordHuntSandbox />;
  if (mode === 'wheelRush') return <PracticeWheelSandbox />;
  return <PracticeClassicSandbox />;
}
