'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Achievement } from '@/components/education/achievements/AchievementGrid';
import { AcademyPageFrame } from '@/components/student/pages/AcademyPageFrame';
import { AwardsFilterBar, type AwardsFilter } from '@/components/student/pages/AwardsWall';
import { ClassroomResultsCardSteps } from '@/components/education/ClassroomResultsCardSteps';
import type { ClassroomSummary } from '@/shared/types/classroom';
import { AwardsBody } from '../AwardsBody';

const ROWS: [string, Achievement['category'], string, number][] = [
  ['first_lesson', 'progress', '🎓', 3],
  ['word_master', 'skill', '📚', 13],
  ['level_climber', 'progress', '🧗', 1],
  ['xp_collector', 'progress', '💰', 80],
  ['practice_veteran', 'consistency', '🎯', 0],
  ['speed_demon', 'skill', '⚡', 2],
  ['perfect_streak', 'skill', '💯', 0],
  ['boss_slayer', 'skill', '🐉', 0],
  ['streak_starter', 'consistency', '🔥', 1],
  ['early_bird', 'consistency', '🌅', 0],
  ['mode_explorer', 'exploration', '🧭', 4],
  ['lesson_collector', 'exploration', '📦', 0],
  ['word_variety', 'exploration', '🌈', 0],
  ['comeback_king', 'skill', '👑', 0],
];

const FIXTURE: Record<string, Achievement> = Object.fromEntries(
  ROWS.map(([key, category, icon, count]) => [
    key,
    { count, category, icon, nameKey: `education.achievements.${key}.name`, descriptionKey: `education.achievements.${key}.description`, isSecret: key === 'comeback_king' },
  ]),
);

const RESULTS: ClassroomSummary = {
  teacherName: 'Ms. Cohen',
  lessonNames: ['Space words'],
  lessonIds: ['lesson-1'],
  totalWords: 6,
  coverage: [
    { word: 'planet', foundBy: ['Noa', 'Maya'] },
    { word: 'orbit', foundBy: ['Noa'] },
    { word: 'comet', foundBy: ['Noa'] },
    { word: 'galaxy', foundBy: ['Maya'] },
    { word: 'nebula', foundBy: [] },
    { word: 'eclipse', foundBy: [] },
  ],
  missedWords: ['nebula', 'eclipse'],
  classFoundCount: 4,
  masteryByPlayer: { Noa: { found: 3, total: 6 }, Maya: { found: 2, total: 6 } },
};
const STANDINGS = [
  { username: 'Noa', score: 1240 },
  { username: 'Maya', score: 980 },
  { username: 'Eitan', score: 610 },
];

// Default = the student lesson-complete steps (`?me=Maya` = a non-winner); `?view=awards` = the badge wall, `?view=empty` = no awards yet.
export default function AwardsPreviewClient() {
  const { t } = useLanguage() as unknown as { t: (k: string, f?: string) => string };
  const params = useSearchParams();
  const [filter, setFilter] = useState<AwardsFilter>('all');
  // Real results mount after the round ends, so remount after hydration to play the entrance the server paint skips.
  const [arrived, setArrived] = useState(false);
  useEffect(() => setArrived(true), []);
  const view = params?.get('view');
  if (view !== 'awards' && view !== 'empty') {
    return (
      <div className="fixed inset-0 z-[80] flex h-dvh flex-col bg-neo-navy">
        <ClassroomResultsCardSteps
          key={arrived ? 'live' : 'ssr'}
          summary={RESULTS}
          username={params?.get('me') ?? 'Noa'}
          standings={STANDINGS}
          onFinish={() => toast('Preview: finish')}
          onPractice={() => toast('Preview: practice')}
        />
      </div>
    );
  }
  return (
    <AcademyPageFrame
      title={t('teacher.nav.studentAchievements', 'Awards')}
      art="/images/education/chest-books.webp"
      toolbar={<AwardsFilterBar active={filter} onChange={setFilter} />}
      regionLabel={t('student.dashboard.achievements')}
    >
      <AwardsBody achievements={view === 'empty' ? {} : FIXTURE} filter={filter} />
    </AcademyPageFrame>
  );
}
