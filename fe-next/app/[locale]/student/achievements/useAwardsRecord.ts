import { useEffect, useState } from 'react';
import type { Achievement } from '@/components/education/achievements/AchievementGrid';
import { STUDENT_PROGRESS_SELECT, buildAchievementsRecord } from '@/lib/education/achievementProgress';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

/** Award definitions with this student's progress; `null` while loading, `{}` when it could not be read. */
export function useAwardsRecord(userId: string | null): Record<string, Achievement> | null {
  const [record, setRecord] = useState<Record<string, Achievement> | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      let next: Record<string, Achievement> = {};
      try {
        if (supabase) {
          const { data: defs, error: defError } = await supabase
            .from('achievement_definitions')
            .select('key, category, icon, is_secret, base_name_key, base_description_key');
          const { data: progress, error: progError } = await supabase
            .from('student_achievements_progress')
            .select(STUDENT_PROGRESS_SELECT)
            .eq('student_id', userId);
          if (defError || progError) logger.error('Error fetching awards:', defError ?? progError);
          else next = buildAchievementsRecord(defs || [], progress || []);
        }
      } catch (error) {
        logger.error('Error in useAwardsRecord:', error);
      }
      if (!cancelled) setRecord(next);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  return record;
}
