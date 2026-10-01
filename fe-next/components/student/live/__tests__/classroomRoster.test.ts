import { describe, it, expect } from 'vitest';
import { withoutClassroomHost } from '../classroomRoster';

const users = [
  { username: 'Ms free-3', isHost: true },
  { username: 'Kid1' },
  { username: 'Kid2', isHost: false },
];
const leaderboard = [
  { username: 'Ms free-3', score: 0 },
  { username: 'Kid1', score: 40 },
  { username: 'Kid2', score: 10 },
];

describe('withoutClassroomHost', () => {
  it('Given a teacher-hosted round, When the student phone ranks the room, Then the teacher is neither seat nor score', () => {
    const out = withoutClassroomHost(leaderboard, users);
    expect(out.users.map((u) => u.username)).toEqual(['Kid1', 'Kid2']);
    expect(out.leaderboard.map((s) => s.username)).toEqual(['Kid1', 'Kid2']);
  });

  it('Given a scores row flagged as host but no seat list, Then that row still drops', () => {
    const out = withoutClassroomHost([{ username: 'T', score: 0, isHost: true }, { username: 'A', score: 1 }], []);
    expect(out.leaderboard.map((s) => s.username)).toEqual(['A']);
  });

  it('Given no host anywhere, Then both lists come back as they were', () => {
    const out = withoutClassroomHost(leaderboard.slice(1), users.slice(1));
    expect(out.leaderboard).toHaveLength(2);
    expect(out.users).toHaveLength(2);
  });
});
