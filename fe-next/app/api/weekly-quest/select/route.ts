/**
 * POST /api/weekly-quest/select
 *
 * Inserts a weekly quest row for the authenticated user using the service-role
 * client (bypasses RLS, which blocks all client-side INSERTs on weekly_quests).
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';
import {
  getAvailableQuests,
  getWeekStart,
  getDifficultyFromType,
  getWeekNumber,
  pickAvatarReward,
  getDisplayTargetForType,
} from '@/shared/weeklyQuestTemplates';

export async function POST(req: NextRequest) {
  const rl = checkApiRateLimit(req, 'weekly-quest-select', { maxRequests: 5, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { questId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Missing questId' }, { status: 400 });
  }

  if (!body.questId) {
    return NextResponse.json({ error: 'Missing questId' }, { status: 400 });
  }

  const available = getAvailableQuests();
  const template = available.find(q => q.id === body.questId);
  if (!template) {
    return NextResponse.json({ error: 'Invalid questId' }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
  }

  const weekStart = getWeekStart();
  const { data, error } = await admin
    .from('weekly_quests')
    .insert({
      player_id: user.id,
      week_start: weekStart,
      quest_type: template.type,
      title: template.description,
      description: template.description,
      requirements: JSON.stringify({ target: template.target, type: template.type }),
      current_progress: JSON.stringify({ current: 0 }),
      xp_reward: template.xpReward,
      completed: false,
    })
    .select('id, quest_type, title, description, requirements, current_progress, xp_reward, completed, week_start')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Quest already selected for this week' }, { status: 409 });
    }
    captureApiError(error, 'weekly-quest/select');
    return NextResponse.json({ error: 'Failed to select quest' }, { status: 500 });
  }

  const reqs = typeof data.requirements === 'string' ? JSON.parse(data.requirements) : data.requirements;
  const prog = typeof data.current_progress === 'string' ? JSON.parse(data.current_progress) : data.current_progress;
  const difficulty = getDifficultyFromType(data.quest_type);
  const weekNum = getWeekNumber(data.week_start);

  return NextResponse.json({
    quest: {
      id: data.id,
      questType: data.quest_type,
      title: data.title,
      description: data.description,
      target: reqs?.target ?? 0,
      displayTarget: getDisplayTargetForType(data.quest_type),
      current: prog?.current ?? 0,
      xpReward: data.xp_reward,
      completed: data.completed,
      difficulty,
      weekStart: data.week_start,
      avatarPartReward: pickAvatarReward(difficulty, weekNum),
    },
  });
}
