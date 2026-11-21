import { useEffect, useState } from 'react';
import type { Achievement } from '@/components/education/achievements/AchievementGrid';
import { awardTier } from './awardsSummary';

// Same store the practice unlock modal writes, so a badge celebrated there is not celebrated again here.
const storeKey = (studentId: string) => `achievement-acknowledged-${studentId}`;

function read(studentId: string): Set<string> {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(storeKey(studentId)) ?? '[]'));
  } catch {
    return new Set();
  }
}

/** Award ids earned at a tier this student has not been shown yet; marked shown as soon as they are returned. */
export function useUnseenAwards(studentId: string | null, achievements: Record<string, Achievement>): Set<string> {
  const [{ unseen, marks }] = useState(() => {
    const unseen = new Set<string>();
    const marks: string[] = [];
    if (!studentId || typeof window === 'undefined') return { unseen, marks };
    const seen = read(studentId);
    for (const [id, a] of Object.entries(achievements)) {
      const tier = awardTier(id, a.count).currentTier;
      if (!tier) continue;
      const mark = `${id}:${tier.toLowerCase()}`;
      if (!seen.has(mark)) {
        unseen.add(id);
        marks.push(mark);
      }
    }
    return { unseen, marks };
  });

  useEffect(() => {
    if (!studentId || marks.length === 0) return;
    try {
      const seen = read(studentId);
      marks.forEach((k) => seen.add(k));
      localStorage.setItem(storeKey(studentId), JSON.stringify([...seen]));
    } catch { /* storage blocked: the burst may replay next visit */ }
  }, [studentId, marks]);

  return unseen;
}
