/**
 * UGC Boards Supabase Module
 * All database queries for community boards feature.
 */

import { getSupabase } from '../supabaseServer';
import logger from '../../utils/logger';

// ---- Types ----

export interface CommunityBoard {
  id: string;
  board_code: string;
  creator_id: string | null;
  creator_display_name: string;
  creator_avatar: Record<string, unknown> | null;
  /** @deprecated - kept for DB column compatibility, no longer populated */
  creator_profile_picture_url?: string | null;
  language: string;
  title: string;
  description: string | null;
  grid: string[][];
  grid_size: number;
  seed_words: string[] | null;
  total_findable_words: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timer_seconds: number;
  is_public: boolean;
  moderation_status: string;
  play_count: number;
  rating_sum: number;
  rating_count: number;
  featured: boolean;
  cover_image_url: string | null;
  created_at: string;
}

export interface BoardPlayResult {
  board_id: string;
  player_id: string | null;
  guest_fingerprint: string | null;
  display_name: string;
  custom_avatar: Record<string, unknown> | null;
  score: number;
  word_count: number;
  longest_word: string | null;
  time_seconds: number | null;
}

export interface GalleryParams {
  sort: 'newest' | 'popular' | 'top_rated' | 'featured';
  language?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  page: number;
  limit: number;
}

// ---- Helpers ----

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not available');
  return supabase;
}

// ---- Functions ----

export async function createBoard(
  board: Omit<CommunityBoard, 'id' | 'play_count' | 'rating_sum' | 'rating_count' | 'featured' | 'created_at' | 'moderation_status'>
): Promise<CommunityBoard> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('community_boards')
    .insert({
      ...board,
      play_count: 0,
      rating_sum: 0,
      rating_count: 0,
      featured: false,
      moderation_status: 'approved',
    })
    .select()
    .single();

  if (error) {
    logger.error('UGC', `createBoard error: ${error.message}`);
    throw new Error(`Failed to create board: ${error.message}`);
  }

  return data as CommunityBoard;
}

export async function getBoardByCode(boardCode: string): Promise<CommunityBoard | null> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('community_boards')
    .select('*')
    .eq('board_code', boardCode)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error('UGC', `getBoardByCode error: ${error.message}`);
    throw new Error(`Failed to fetch board: ${error.message}`);
  }

  return data as CommunityBoard;
}

export async function getGallery(
  params: GalleryParams
): Promise<{ boards: CommunityBoard[]; total: number }> {
  const supabase = requireSupabase();
  const { sort, language, difficulty, page, limit } = params;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('community_boards')
    .select('*', { count: 'exact' })
    .eq('is_public', true)
    .eq('moderation_status', 'approved');

  if (language) query = query.eq('language', language);
  if (difficulty) query = query.eq('difficulty', difficulty);

  switch (sort) {
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'popular':
      query = query.order('play_count', { ascending: false });
      break;
    case 'top_rated':
      query = query.order('rating_sum', { ascending: false });
      break;
    case 'featured':
      query = query.eq('featured', true).order('created_at', { ascending: false });
      break;
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    logger.error('UGC', `getGallery error: ${error.message}`);
    throw new Error(`Failed to fetch gallery: ${error.message}`);
  }

  return { boards: (data ?? []) as CommunityBoard[], total: count ?? 0 };
}

export async function recordPlay(play: BoardPlayResult): Promise<void> {
  const supabase = requireSupabase();

  const { error: insertError } = await supabase
    .from('community_board_plays')
    .insert(play);

  if (insertError) {
    logger.error('UGC', `recordPlay insert error: ${insertError.message}`);
    throw new Error(`Failed to record play: ${insertError.message}`);
  }

  const { error: incError } = await supabase.rpc('increment_board_play_count', {
    p_board_id: play.board_id,
  });

  if (incError) {
    logger.warn('UGC', `recordPlay increment error: ${incError.message}`);
  }
}

export async function upsertRating(
  boardId: string,
  playerId: string,
  rating: number
): Promise<void> {
  const supabase = requireSupabase();

  const { data: existing } = await supabase
    .from('community_board_ratings')
    .select('rating')
    .eq('board_id', boardId)
    .eq('player_id', playerId)
    .single();

  const { error: upsertError } = await supabase
    .from('community_board_ratings')
    .upsert({ board_id: boardId, player_id: playerId, rating }, { onConflict: 'board_id,player_id' });

  if (upsertError) {
    logger.error('UGC', `upsertRating error: ${upsertError.message}`);
    throw new Error(`Failed to upsert rating: ${upsertError.message}`);
  }

  // Recompute aggregates: delta from previous rating
  const oldRating = existing?.rating ?? 0;
  const delta = rating - oldRating;
  const countDelta = existing ? 0 : 1;

  const { error: updateError } = await supabase.rpc('update_board_rating_aggregates', {
    p_board_id: boardId,
    p_rating_delta: delta,
    p_count_delta: countDelta,
  });

  if (updateError) {
    logger.warn('UGC', `upsertRating aggregate update error: ${updateError.message}`);
  }
}

export async function submitReport(
  boardId: string,
  reporterId: string,
  reason: string
): Promise<{ flagged: boolean }> {
  const supabase = requireSupabase();

  const { error: insertError } = await supabase
    .from('community_board_reports')
    .insert({ board_id: boardId, reporter_id: reporterId, reason });

  if (insertError) {
    logger.error('UGC', `submitReport error: ${insertError.message}`);
    throw new Error(`Failed to submit report: ${insertError.message}`);
  }

  // Count total reports for this board
  const { count } = await supabase
    .from('community_board_reports')
    .select('*', { count: 'exact', head: true })
    .eq('board_id', boardId);

  const reportCount = count ?? 0;
  const flagged = reportCount >= 3;

  if (flagged) {
    await supabase
      .from('community_boards')
      .update({ moderation_status: 'flagged' })
      .eq('id', boardId);
  }

  return { flagged };
}

export async function getCreatorBoards(creatorId: string): Promise<CommunityBoard[]> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('community_boards')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('UGC', `getCreatorBoards error: ${error.message}`);
    throw new Error(`Failed to fetch creator boards: ${error.message}`);
  }

  return (data ?? []) as CommunityBoard[];
}

export async function getFeaturedBoards(limit: number): Promise<CommunityBoard[]> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('community_boards')
    .select('*')
    .eq('featured', true)
    .eq('is_public', true)
    .eq('moderation_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('UGC', `getFeaturedBoards error: ${error.message}`);
    throw new Error(`Failed to fetch featured boards: ${error.message}`);
  }

  return (data ?? []) as CommunityBoard[];
}

export async function uploadBoardCoverImage(
  userId: string,
  boardCode: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const supabase = requireSupabase();

  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${boardCode}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('board-covers')
    .upload(path, buffer, { contentType, upsert: true });

  if (uploadError) {
    logger.error('UGC', `uploadBoardCoverImage storage error: ${uploadError.message}`);
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('board-covers')
    .getPublicUrl(path);

  const publicUrl = urlData.publicUrl;

  const { error: updateError } = await supabase
    .from('community_boards')
    .update({ cover_image_url: publicUrl })
    .eq('board_code', boardCode)
    .eq('creator_id', userId);

  if (updateError) {
    logger.error('UGC', `uploadBoardCoverImage update error: ${updateError.message}`);
    throw new Error(`Failed to update board: ${updateError.message}`);
  }

  return publicUrl;
}

export async function getBoardLeaderboard(
  boardId: string,
  limit: number
): Promise<BoardPlayResult[]> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('community_board_plays')
    .select('*')
    .eq('board_id', boardId)
    .order('score', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('UGC', `getBoardLeaderboard error: ${error.message}`);
    throw new Error(`Failed to fetch leaderboard: ${error.message}`);
  }

  return (data ?? []) as BoardPlayResult[];
}
