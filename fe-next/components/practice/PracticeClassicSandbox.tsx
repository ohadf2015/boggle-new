'use client';

import PracticeSwipeBoard from './PracticeSwipeBoard';
import { PRACTICE_GOALS } from '@/lib/practice/practiceProgress';

export default function PracticeClassicSandbox() {
  return <PracticeSwipeBoard mode="classic" rows={4} cols={4} goal={PRACTICE_GOALS.classic} />;
}
