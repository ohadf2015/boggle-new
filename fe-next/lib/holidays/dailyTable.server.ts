import type { SupabaseClient } from '@supabase/supabase-js';
import { isPlaceholderName } from '@/lib/displayName';
import { eventKeyFor } from '@/lib/holidayEvent/rewards';
import { windowFor, type HolidayKey, type HolidayWindow } from './calendar';
import { TABLE_MAX_MEMBERS, bestPerMemberDay, isTableCode, newTableCode, tableBoard, type TableBoard } from './dailyTable';

interface TableRow {
  id: string;
  holiday_key: HolidayKey;
  event_key: string;
  owner: string;
  code: string;
}

export type TableJoinResult =
  | { status: 'ok'; code: string; holiday: HolidayKey }
  | { status: 'closed' | 'not_found' | 'full' | 'in_other_table' };

export interface HolidayTableView {
  code: string;
  holiday: HolidayKey;
  isOwner: boolean;
  board: TableBoard;
  members: Array<{
    userId: string;
    name: string | null;
    avatarEmoji: string | null;
    total: number;
    rank: number;
    playedToday: boolean;
    isYou: boolean;
  }>;
}

function fail(op: string, error: { message: string } | null): void {
  if (error) throw new Error(`holiday table ${op}: ${error.message}`);
}

async function myTable(supabase: SupabaseClient, userId: string, eventKey: string): Promise<TableRow | null> {
  const { data, error } = await supabase.from('holiday_table_members').select('table_id').eq('user_id', userId).eq('event_key', eventKey).maybeSingle();
  fail('membership', error);
  const tableId = (data as { table_id?: string } | null)?.table_id;
  if (!tableId) return null;
  const { data: table, error: tErr } = await supabase.from('holiday_tables').select('*').eq('id', tableId).maybeSingle();
  fail('read', tErr);
  return (table as TableRow | null) ?? null;
}

export async function createHolidayTable(i: {
  supabase: SupabaseClient;
  userId: string;
  holiday: HolidayKey;
  localDate: string;
  locale?: string | null;
}): Promise<TableJoinResult> {
  const win = windowFor(i.holiday, i.localDate, i.locale);
  if (!win) return { status: 'closed' };
  const eventKey = eventKeyFor(win);
  const existing = await myTable(i.supabase, i.userId, eventKey);
  if (existing) return { status: 'ok', code: existing.code, holiday: existing.holiday_key };

  for (let attempt = 0; attempt < 4; attempt++) {
    const row = { id: globalThis.crypto.randomUUID(), holiday_key: i.holiday, event_key: eventKey, owner: i.userId, code: newTableCode() };
    const { error } = await i.supabase.from('holiday_tables').insert(row);
    if (error?.code === '23505') continue;
    fail('create', error);
    const { error: mErr } = await i.supabase.from('holiday_table_members').insert({ table_id: row.id, user_id: i.userId, event_key: eventKey });
    if (mErr) {
      await i.supabase.from('holiday_tables').delete().eq('id', row.id);
      if (mErr.code === '23505') return { status: 'in_other_table' };
      fail('seat owner', mErr);
    }
    return { status: 'ok', code: row.code, holiday: i.holiday };
  }
  throw new Error('holiday table create: no free code');
}

export async function joinHolidayTable(i: {
  supabase: SupabaseClient;
  userId: string;
  code: unknown;
  localDate: string;
  locale?: string | null;
}): Promise<TableJoinResult> {
  if (!isTableCode(i.code)) return { status: 'not_found' };
  const { data, error } = await i.supabase.from('holiday_tables').select('*').eq('code', i.code).maybeSingle();
  fail('lookup', error);
  const table = data as TableRow | null;
  if (!table) return { status: 'not_found' };
  const win = windowFor(table.holiday_key, i.localDate, i.locale);
  if (!win || eventKeyFor(win) !== table.event_key) return { status: 'closed' };

  const { data: members, error: cErr } = await i.supabase.from('holiday_table_members').select('user_id').eq('table_id', table.id);
  fail('count', cErr);
  const list = (members as Array<{ user_id: string }> | null) ?? [];
  if (list.some((m) => m.user_id === i.userId)) return { status: 'ok', code: table.code, holiday: table.holiday_key };
  if (list.length >= TABLE_MAX_MEMBERS) return { status: 'full' };

  const { error: jErr } = await i.supabase.from('holiday_table_members').insert({ table_id: table.id, user_id: i.userId, event_key: table.event_key });
  if (jErr?.code === '23505') return { status: 'in_other_table' };
  fail('join', jErr);
  return { status: 'ok', code: table.code, holiday: table.holiday_key };
}

export async function leaveHolidayTable(i: { supabase: SupabaseClient; userId: string; holiday: HolidayKey; localDate: string; locale?: string | null }): Promise<void> {
  const win = windowFor(i.holiday, i.localDate, i.locale);
  if (!win) return;
  const { error } = await i.supabase.from('holiday_table_members').delete().eq('user_id', i.userId).eq('event_key', eventKeyFor(win));
  fail('leave', error);
}

async function memberScores(supabase: SupabaseClient, ids: string[], win: HolidayWindow) {
  const { data, error } = await supabase
    .from('daily_word_hunt_attempts')
    .select('player_id, puzzle_date, efficiency_score')
    .in('player_id', ids)
    .gte('puzzle_date', win.start)
    .lte('puzzle_date', win.end);
  fail('scores', error);
  return bestPerMemberDay((data as Array<{ player_id: string; puzzle_date: string; efficiency_score: number | null }> | null) ?? []);
}

export async function readHolidayTable(i: {
  supabase: SupabaseClient;
  userId: string;
  holiday: HolidayKey;
  localDate: string;
  locale?: string | null;
}): Promise<HolidayTableView | null> {
  const win = windowFor(i.holiday, i.localDate, i.locale);
  if (!win) return null;
  const table = await myTable(i.supabase, i.userId, eventKeyFor(win));
  if (!table) return null;

  const { data: m, error } = await i.supabase.from('holiday_table_members').select('user_id').eq('table_id', table.id);
  fail('members', error);
  const ids = ((m as Array<{ user_id: string }> | null) ?? []).map((r) => r.user_id);
  const [{ data: profiles, error: pErr }, scores] = await Promise.all([
    i.supabase.from('profiles').select('id, display_name, username, avatar_emoji').in('id', ids),
    memberScores(i.supabase, ids, win),
  ]);
  fail('profiles', pErr);
  const byId = new Map(
    ((profiles as Array<{ id: string; display_name: string | null; username: string | null; avatar_emoji: string | null }> | null) ?? []).map((p) => [p.id, p]),
  );
  const board = tableBoard({ trackDays: win.trackDays, memberIds: ids, scores, today: i.localDate });
  const played = new Set(board.today.playedIds);
  return {
    code: table.code,
    holiday: table.holiday_key,
    isOwner: table.owner === i.userId,
    board,
    members: board.leaderboard.map((row) => {
      const p = byId.get(row.userId);
      const name = [p?.display_name, p?.username].find((n) => !isPlaceholderName(n))?.trim() ?? null;
      return { ...row, name, avatarEmoji: p?.avatar_emoji ?? null, playedToday: played.has(row.userId), isYou: row.userId === i.userId };
    }),
  };
}
