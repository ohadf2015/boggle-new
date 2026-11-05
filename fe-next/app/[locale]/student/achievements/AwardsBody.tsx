'use client';

import type { Achievement } from '@/components/education/achievements/AchievementGrid';
import { AwardsGrid, type AwardsFilter } from '@/components/student/pages/AwardsWall';
import { Reveal } from '@/components/education/motion';
import { AwardsHero } from './AwardsHero';
import { AwardsEmpty } from './AwardsEmpty';

export function AwardsBody({ achievements, filter }: { achievements: Record<string, Achievement>; filter: AwardsFilter }) {
  if (Object.keys(achievements).length === 0) {
    return (
      <div data-testid="student-awards-content" className="h-full">
        <AwardsEmpty />
      </div>
    );
  }
  return (
    <div data-testid="student-awards-content">
      {filter === 'all' && <AwardsHero achievements={achievements} />}
      <Reveal delay={0.16}>
        <AwardsGrid achievements={achievements} filter={filter} />
      </Reveal>
    </div>
  );
}
