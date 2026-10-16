import { describe, it, expect } from 'vitest';
import { practiceBotsToDrop } from '../classroomPracticeBots';

type U = { isBot?: boolean; isHost?: boolean };
const game = (isClassroom: boolean, users: Record<string, U>) => ({ isClassroom, users });

describe('practiceBotsToDrop', () => {
  it('Given a classroom with practice bots and a real student, When the class game starts, Then every bot leaves', () => {
    const g = game(true, {
      Teacher: { isHost: true },
      'Bot A': { isBot: true },
      'Bot B': { isBot: true },
      Ada: {},
    });
    expect(practiceBotsToDrop(g)).toEqual(['Bot A', 'Bot B']);
  });

  it('Given a classroom with only the teacher and bots, When the practice round starts, Then the bots stay', () => {
    const g = game(true, { Teacher: { isHost: true }, 'Bot A': { isBot: true } });
    expect(practiceBotsToDrop(g)).toEqual([]);
  });

  it('Given a regular multiplayer room with bots and humans, Then bots are never touched', () => {
    const g = game(false, { Host: { isHost: true }, 'Bot A': { isBot: true }, Ada: {} });
    expect(practiceBotsToDrop(g)).toEqual([]);
  });
});
