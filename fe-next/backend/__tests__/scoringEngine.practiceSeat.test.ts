import { calculateGameScores } from '../modules/scoringEngine';
import type { Game } from '@/shared/types/game';

function game(users: Game['users']): Game {
  return {
    gameCode: 'TEST1',
    hostSocketId: 'host-socket',
    hostUsername: 'Teacher',
    roomName: 'Room',
    language: 'en',
    gameState: 'finished',
    users,
    playerScores: {},
    playerWords: { 'Practice student': ['cat'], Bot: ['dog'] },
    playerWordDetails: {},
    playerAchievements: {},
    lastActivity: Date.now(),
    createdAt: Date.now(),
    isRanked: false,
    allowLateJoin: true,
  } as unknown as Game;
}

describe('calculateGameScores — teacher practice seat', () => {
  it("marks the practice seat's row so results can tell a rehearsal from a class round", () => {
    const g = game({
      'Practice student': { username: 'Practice student', socketId: 's1', avatar: null, isHost: false, isPractice: true },
      Bot: { username: 'Bot', socketId: 's2', avatar: null, isHost: false, isBot: true },
    } as unknown as Game['users']);
    const rows = calculateGameScores(g, {}, new Set(['cat', 'dog']), new Set(), new Map(), { playerCount: 2, humanPlayerCount: 1, gameMode: 'classic' });
    expect(rows.find((r) => r.username === 'Practice student')?.isPractice).toBe(true);
    expect(rows.find((r) => r.username === 'Bot')?.isPractice).toBeUndefined();
  });
});
