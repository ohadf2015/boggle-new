/**
 * UGC Word Packs - Supabase DB Helpers
 * CRUD operations for user-generated word pack content.
 */

import { getSupabase } from '../supabaseServer';

export interface WordPack {
  id: string;
  creator_id: string;
  creator_display_name: string;
  creator_avatar: Record<string, unknown> | null;
  name: string;
  description: string | null;
  language: string;
  theme_emoji: string | null;
  words: string[];
  word_count: number;
  tags: string[] | null;
  is_public: boolean;
  moderation_status: string;
  play_count: number;
  upvote_count: number;
  featured: boolean;
  created_at: string;
}

export interface PackGalleryParams {
  sort: 'newest' | 'popular' | 'upvotes';
  language?: string;
  page: number;
  limit: number;
}

type NewPack = Omit<
  WordPack,
  'id' | 'word_count' | 'play_count' | 'upvote_count' | 'featured' | 'created_at' | 'moderation_status'
>;

export async function createPack(pack: NewPack): Promise<WordPack> {
  const supabase = getSupabase()!;
  const { data, error } = await supabase
    .from('ugc_word_packs')
    .insert({
      ...pack,
      word_count: pack.words.length,
      moderation_status: 'pending',
      play_count: 0,
      upvote_count: 0,
      featured: false,
    })
    .select()
    .single();

  if (error) throw new Error(`createPack: ${error.message}`);
  return data as WordPack;
}

export async function getPackById(packId: string): Promise<WordPack | null> {
  const supabase = getSupabase()!;
  const { data, error } = await supabase
    .from('ugc_word_packs')
    .select()
    .eq('id', packId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new Error(`getPackById: ${error.message}`);
  }
  return data as WordPack;
}

export async function getPackGallery(
  params: PackGalleryParams
): Promise<{ packs: WordPack[]; total: number }> {
  const supabase = getSupabase()!;
  const { sort, language, page, limit } = params;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('ugc_word_packs')
    .select('*', { count: 'exact' })
    .eq('is_public', true)
    .eq('moderation_status', 'approved')
    .is('deleted_at', null);

  if (language) query = query.eq('language', language);

  if (sort === 'newest') query = query.order('created_at', { ascending: false });
  else if (sort === 'popular') query = query.order('play_count', { ascending: false });
  else if (sort === 'upvotes') query = query.order('upvote_count', { ascending: false });

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) throw new Error(`getPackGallery: ${error.message}`);
  return { packs: (data ?? []) as WordPack[], total: count ?? 0 };
}

export async function updatePack(
  packId: string,
  creatorId: string,
  updates: Partial<Pick<WordPack, 'name' | 'description' | 'words' | 'tags' | 'theme_emoji'>>
): Promise<WordPack | null> {
  const supabase = getSupabase()!;

  const payload: Record<string, unknown> = { ...updates };
  if (updates.words) payload.word_count = updates.words.length;

  const { data, error } = await supabase
    .from('ugc_word_packs')
    .update(payload)
    .eq('id', packId)
    .eq('creator_id', creatorId)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`updatePack: ${error.message}`);
  }
  return data as WordPack;
}

export async function softDeletePack(packId: string, creatorId: string): Promise<boolean> {
  const supabase = getSupabase()!;
  const { error, count } = await supabase
    .from('ugc_word_packs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', packId)
    .eq('creator_id', creatorId)
    .is('deleted_at', null);

  if (error) throw new Error(`softDeletePack: ${error.message}`);
  return (count ?? 0) > 0;
}

export async function toggleUpvote(
  packId: string,
  playerId: string
): Promise<{ upvoted: boolean; newCount: number }> {
  const supabase = getSupabase()!;

  const { data: existing } = await supabase
    .from('ugc_pack_upvotes')
    .select('id')
    .eq('pack_id', packId)
    .eq('player_id', playerId)
    .single();

  if (existing) {
    await supabase
      .from('ugc_pack_upvotes')
      .delete()
      .eq('pack_id', packId)
      .eq('player_id', playerId);

    await supabase.rpc('decrement_pack_upvote', { pack_id: packId });

    const { data: pack } = await supabase
      .from('ugc_word_packs')
      .select('upvote_count')
      .eq('id', packId)
      .single();

    return { upvoted: false, newCount: (pack as { upvote_count: number } | null)?.upvote_count ?? 0 };
  }

  await supabase.from('ugc_pack_upvotes').insert({ pack_id: packId, player_id: playerId });
  await supabase.rpc('increment_pack_upvote', { pack_id: packId });

  const { data: pack } = await supabase
    .from('ugc_word_packs')
    .select('upvote_count')
    .eq('id', packId)
    .single();

  return { upvoted: true, newCount: (pack as { upvote_count: number } | null)?.upvote_count ?? 0 };
}

export async function recordPackPlay(
  packId: string,
  playerId: string | null,
  guestFingerprint: string | null,
  wordsFoundFromPack: number,
  totalScore: number
): Promise<void> {
  const supabase = getSupabase()!;

  await supabase.from('ugc_pack_plays').insert({
    pack_id: packId,
    player_id: playerId,
    guest_fingerprint: guestFingerprint,
    words_found_from_pack: wordsFoundFromPack,
    total_score: totalScore,
  });

  await supabase.rpc('increment_pack_play', { pack_id: packId });
}

export async function submitPackReport(
  packId: string,
  reporterId: string,
  reason: string
): Promise<void> {
  const supabase = getSupabase()!;

  await supabase.from('ugc_pack_reports').insert({
    pack_id: packId,
    reporter_id: reporterId,
    reason,
  });

  // Auto-flag if threshold met
  const { count } = await supabase
    .from('ugc_pack_reports')
    .select('*', { count: 'exact', head: true })
    .eq('pack_id', packId);

  const AUTO_FLAG_THRESHOLD = 3;
  if ((count ?? 0) >= AUTO_FLAG_THRESHOLD) {
    await supabase
      .from('ugc_word_packs')
      .update({ moderation_status: 'flagged' })
      .eq('id', packId)
      .neq('moderation_status', 'flagged');
  }
}

export async function getCreatorPacks(creatorId: string): Promise<WordPack[]> {
  const supabase = getSupabase()!;
  const { data, error } = await supabase
    .from('ugc_word_packs')
    .select()
    .eq('creator_id', creatorId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getCreatorPacks: ${error.message}`);
  return (data ?? []) as WordPack[];
}
