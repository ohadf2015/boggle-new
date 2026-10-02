import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'player/PlayerView.tsx'), 'utf8');

describe('student phone in-round roster', () => {
  it('ranks a classroom round without the teacher', () => {
    expect(source).toMatch(/isClassroomMode \? withoutClassroomHost\(leaderboard, playersReady\)/);
    expect(source).toMatch(/leaderboard=\{inRound\.leaderboard\}/);
    expect(source).toMatch(/rosterUsers=\{inRound\.users\}/);
  });
});
