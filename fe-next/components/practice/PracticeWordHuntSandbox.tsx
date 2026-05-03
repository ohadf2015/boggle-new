'use client';

import PracticeSwipeBoard from './PracticeSwipeBoard';
import { PRACTICE_GOALS } from '@/lib/practice/practiceProgress';

export default function PracticeWordHuntSandbox() {
  return <PracticeSwipeBoard mode="wordHunt" rows={4} cols={4} goal={PRACTICE_GOALS.wordHunt} />;
}
