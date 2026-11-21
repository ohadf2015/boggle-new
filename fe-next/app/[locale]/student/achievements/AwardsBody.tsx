'use client';

import type { Achievement } from '@/components/education/achievements/AchievementGrid';
import { AwardsGrid, type AwardsFilter } from '@/components/student/pages/AwardsWall';
import { Reveal } from '@/components/education/motion';
import { AwardsHero } from './AwardsHero';
import { AwardsEmpty } from './AwardsEmpty';
import { useUnseenAwards } from './useUnseenAwards';

export function AwardsBody({ achievements, filter, studentId = null }: { achievements: Record<string, Achievement>; filter: AwardsFilter; studentId?: string | null }) {
  const fresh = useUnseenAwards(studentId, achievements);
  if (Object.keys(achievements).length === 0) {
    return (
      <div data-testid="student-awards-content" className="h-full">
        <AwardsEmpty />
      </div>
    );
  }
  return (
    <div data-testid="student-awards-content">
      {filter === 'all' && <AwardsHero achievements={achievements} celebrate={fresh.size > 0} />}
      <Reveal delay={0.16}>
        <AwardsGrid achievements={achievements} filter={filter} fresh={fresh} />
      </Reveal>
    </div>
  );
}
