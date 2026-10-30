import { describe, it, expect } from 'vitest';
import {
  fromMergedEntries,
  friendsBoard,
  isViewer,
  mergeTodayRows,
  mergeAllTimeRows,
  youReadout,
} from '../leaderboardRows';
import type { DailyParticipant, AllTimeParticipant } from '../leaderboardTypes';
import type { MergedLeaderboardEntry } from '@/lib/daily/mergeDailyLeaderboard';

const row = (over: Partial<DailyParticipant>): DailyParticipant => ({
  player_id: null, guest_fingerprint: null, display_name: 'X', avatar_emoji: '', avatar_color: '',
  score: 0, word_count: 0, time_seconds: 0, completed_at: '', rank_position: 0, ...over,
});

const entry = (over: Partial<MergedLeaderboardEntry>): MergedLeaderboardEntry => ({
  rank: 1, key: 'k', name: 'N', avatarEmoji: null, avatarColor: null, avatarImage: null, customAvatar: null,
  total: 10, byMode: { 'word-hunt': 10, 'word-wheel': 0, 'word-tower': 0, connections: 0 },
  towerHeightM: null, playedModes: ['word-hunt'], ...over,
});

describe('fromMergedEntries', () => {
  it('turns server entries into board rows, carrying the server\'s "you" and friend flags', () => {
    const rows = fromMergedEntries([entry({ rank: 1, key: 'a', name: 'Ann' }), entry({ rank: 2, key: 'b', isYou: true }), entry({ rank: 3, key: 'c', isFriend: true })]);
    expect(rows.map((r) => [r.rank_position, r.row_key, r.score])).toEqual([[1, 'a', 10], [2, 'b', 10], [3, 'c', 10]]);
    expect(rows[1].is_you).toBe(true);
    expect(rows[2].is_friend).toBe(true);
    expect(rows[0].display_name).toBe('Ann');
    expect(rows[0].by_mode?.['word-hunt']).toBe(10);
  });
});

describe('isViewer', () => {
  it('matches the server flag, the account id, or the guest fingerprint', () => {
    expect(isViewer(row({ is_you: true }), {})).toBe(true);
    expect(isViewer(row({ player_id: 'me' }), { playerId: 'me' })).toBe(true);
    expect(isViewer(row({ guest_fingerprint: 'fp' }), { guestFingerprint: 'fp' })).toBe(true);
    expect(isViewer(row({ player_id: 'other' }), { playerId: 'me' })).toBe(false);
  });
});

describe('friendsBoard', () => {
  const board = [
    row({ player_id: 'a', rank_position: 1 }),
    row({ player_id: 'f1', rank_position: 4 }),
    row({ player_id: 'me', rank_position: 9 }),
    row({ player_id: 'f2', rank_position: 31 }),
  ];
  const friends = new Set(['f1', 'f2']);

  it('keeps friends plus the viewer and ranks them 1..N among themselves', () => {
    const rows = friendsBoard(board, (p) => !!p.player_id && friends.has(p.player_id), { playerId: 'me' });
    expect(rows.map((r) => [r.player_id, r.rank_position])).toEqual([['f1', 1], ['me', 2], ['f2', 3]]);
  });

  it('is empty when the viewer has no friends on the board, even if they played', () => {
    expect(friendsBoard(board, () => false, { playerId: 'me' })).toEqual([]);
  });
});

describe('mergeTodayRows', () => {
  it('sums hunt and wheel per player and breaks a tie on who finished first', () => {
    const rows = mergeTodayRows(
      [row({ player_id: 'late', efficiency_score: 50, completed_at: '2026-10-30T10:00:00Z' }), row({ player_id: 'early', efficiency_score: 30, completed_at: '2026-10-30T08:00:00Z' })],
      [row({ player_id: 'early', score: 20, completed_at: '2026-10-30T08:30:00Z' })],
    );
    expect(rows.map((r) => [r.player_id, r.score, r.rank_position])).toEqual([['early', 50, 1], ['late', 50, 2]]);
  });

  it('orders a full tie the same way whatever order the rows came in', () => {
    const a = row({ player_id: 'a', score: 5 });
    const b = row({ player_id: 'b', score: 5 });
    expect(mergeTodayRows([], [a, b]).map((r) => r.player_id)).toEqual(mergeTodayRows([], [b, a]).map((r) => r.player_id));
  });
});

describe('mergeAllTimeRows', () => {
  const at = (id: string, pts: number, last = ''): AllTimeParticipant => ({
    player_id: id, guest_fingerprint: null, player_identifier: id, display_name: id, avatar_emoji: '', avatar_color: '',
    total_efficiency_score: pts, total_games: 1, games_won: 1, avg_attempts: null, best_efficiency: pts, last_played_at: last, rank_position: 0,
  });

  it('breaks a points tie deterministically', () => {
    const x = mergeAllTimeRows([at('b', 10), at('a', 10)], []);
    const y = mergeAllTimeRows([at('a', 10), at('b', 10)], []);
    expect(x.map((r) => r.player_id)).toEqual(y.map((r) => r.player_id));
  });
});

describe('youReadout', () => {
  it('gives rank, board size and the top-percent band', () => {
    expect(youReadout(7, 42)).toEqual({ rank: 7, total: 42, topPercent: 17 });
  });

  it('never reads "top 0%", and stays quiet on a board of one', () => {
    expect(youReadout(1, 500)?.topPercent).toBe(1);
    expect(youReadout(1, 1)).toBeNull();
  });
});
