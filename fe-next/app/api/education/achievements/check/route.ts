import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import logger from '@/utils/logger';
import {
  checkAchievementProgress,
  type StudentProgressData,
  type AchievementProgress,
} from '@/backend/modules/educationAchievementManager';

// Schema for student progress data
const progressSchema = z.object({
  lessonsCompleted: z.number().min(0),
  wordsMastered: z.number().min(0),
  currentLevel: z.number().min(0),
  totalXp: z.number().min(0),
  practiceSessions: z.number().min(0),
  wordsInGame: z.number().min(0),
  perfectGames: z.number().min(0),
  bossesDefeated: z.number().min(0),
  combosAchieved: z.number().min(0),
  currentStreak: z.number().min(0),
  morningPractices: z.number().min(0),
  daysThisMonth: z.number().min(0),
  weeksWith5Days: z.number().min(0),
  longestStreak: z.number().min(0),
  modesTried: z.number().min(0),
  lessonsCollected: z.number().min(0),
  classroomsJoined: z.number().min(0),
  uniqueWords: z.number().min(0),
});

/**
 * POST /api/education/achievements/check
 * Server-side achievement check + persistence (B4/B10 fix)
 *
 * Computes achievement progress from StudentProgressData,
 * compares against existing DB records, and upserts new/upgraded tiers.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = progressSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid progress data', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const progressData: StudentProgressData = parseResult.data;

    // Compute current achievement state from progress data
    const achievementProgress = checkAchievementProgress(progressData);

    // Fetch existing achievements from DB
    const { data: existing, error: fetchError } = await supabase
      .from('student_achievements')
      .select('achievement_key, current_tier')
      .eq('student_id', user.id);

    if (fetchError) {
      logger.error('Failed to fetch existing achievements:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const existingMap = new Map<string, string | null>();
    for (const row of existing || []) {
      existingMap.set(row.achievement_key, row.current_tier);
    }

    // Tier ordering for comparison
    const tierOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
    const tierRank = (tier: string | null): number =>
      tier ? (tierOrder[tier as keyof typeof tierOrder] ?? 0) : 0;

    // Find new unlocks and upgrades
    const upserts: Array<{
      student_id: string;
      achievement_key: string;
      current_tier: string;
      progress_value: number;
      unlocked_at: string;
    }> = [];

    const unlocks: Array<{
      key: string;
      tier: string;
      isNew: boolean;
      isUpgrade: boolean;
    }> = [];

    for (const ap of achievementProgress) {
      if (!ap.current_tier) continue; // No tier earned yet

      const existingTier = existingMap.get(ap.key) ?? null;
      const newTierRank = tierRank(ap.current_tier);
      const existingTierRank = tierRank(existingTier);

      if (newTierRank > existingTierRank) {
        upserts.push({
          student_id: user.id,
          achievement_key: ap.key,
          current_tier: ap.current_tier,
          progress_value: ap.progress_value,
          unlocked_at: new Date().toISOString(),
        });

        unlocks.push({
          key: ap.key,
          tier: ap.current_tier,
          isNew: existingTier === null,
          isUpgrade: existingTier !== null,
        });
      }
    }

    // Upsert new/upgraded achievements
    if (upserts.length > 0) {
      const { error: upsertError } = await supabase
        .from('student_achievements')
        .upsert(upserts, { onConflict: 'student_id,achievement_key' });

      if (upsertError) {
        logger.error('Failed to upsert achievements:', upsertError);
        return NextResponse.json({ error: 'Failed to save achievements' }, { status: 500 });
      }

      logger.info(
        'EDUCATION',
        `Persisted ${upserts.length} achievement(s) for student ${user.id}: ${unlocks.map(u => `${u.key}:${u.tier}`).join(', ')}`
      );
    }

    // Also update achievement progress table (B10 fix)
    const progressUpserts = achievementProgress
      .filter((ap: AchievementProgress) => ap.progress_value > 0)
      .map((ap: AchievementProgress) => ({
        student_id: user.id,
        achievement_key: ap.key,
        current_value: ap.progress_value,
        target_value: ap.next_threshold ?? ap.progress_value,
        updated_at: new Date().toISOString(),
      }));

    if (progressUpserts.length > 0) {
      await supabase
        .from('student_achievements_progress')
        .upsert(progressUpserts, { onConflict: 'student_id,achievement_key' })
        .then(({ error }) => {
          if (error) logger.error('Failed to update achievement progress:', error);
        });
    }

    return NextResponse.json({
      progress: achievementProgress,
      unlocks,
      persisted: upserts.length,
    });
  } catch (error) {
    logger.error('POST achievements/check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
