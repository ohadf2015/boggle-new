import { createClient } from '@/utils/supabase/server';
import { rollChest } from '@/lib/blast/v2/chest-roll';
import { awardCoinsServer } from '@/backend/services/economy/awardCoins';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch progress
  const { data: progress, error } = await supabase
    .from('blast_progress')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !progress) {
    return NextResponse.json({ error: 'Progress not found' }, { status: 404 });
  }

  if (progress.current_chest_progress < 1.0) {
    return NextResponse.json({ error: 'Chest not ready' }, { status: 400 });
  }

  // Roll contents deterministically
  const contents = rollChest(user.id, progress.current_chest_number, progress.locale ?? 'en');

  // Award coins
  await awardCoinsServer(user.id, contents.coins, 'blast_v2_chest_open', {
    chest_number: String(progress.current_chest_number),
    tier: contents.tier,
  });

  // Insert chest record
  await supabase.from('blast_chests').insert({
    user_id: user.id,
    chest_number: progress.current_chest_number,
    tier: contents.tier,
    contents,
    opened_at: new Date().toISOString(),
  });

  // Update progress: increment chest, reset progress
  await supabase
    .from('blast_progress')
    .update({
      current_chest_number: progress.current_chest_number + 1,
      current_chest_progress: 0.0,
      total_coins_earned_blast: progress.total_coins_earned_blast + contents.coins,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  return NextResponse.json({
    coins: progress.total_coins_earned_blast + contents.coins,
    contents,
    nextChestNumber: progress.current_chest_number + 1,
  });
}
