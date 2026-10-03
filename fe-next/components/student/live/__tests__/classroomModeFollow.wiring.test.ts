import { describe, it, expect } from 'vitest';
import { readMpPageSource } from '@/app/[locale]/multiplayer/__tests__/mpPageSource';

const source = readMpPageSource();

describe('multiplayer shell — the classroom mode every phone reads follows the room', () => {
  it('feeds PlayerView and the banner from the followed record, not the one-shot fetch', () => {
    expect(source).toMatch(/useFollowedClassroomGame\(socket, gameCode \|\| prefilledRoomCode, liveClassroomRecord\)/);
    expect(source).toMatch(/classroomGameMode: liveClassroomGame\?\.gameMode/);
    expect(source).toMatch(/liveGame=\{liveClassroomGame\}/);
  });

  it('never routes the raw fetched mode to a phone', () => {
    expect(source).not.toMatch(/classroomGameMode: liveClassroomRecord/);
    expect(source).not.toMatch(/liveGame=\{liveClassroomRecord\}/);
  });
});
