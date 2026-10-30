import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetGame, mockLevel } = vi.hoisted(() => ({ mockGetGame: vi.fn(), mockLevel: vi.fn() }));

vi.mock('../../modules/gameStateManager.js', () => ({ getGame: mockGetGame, updateGame: vi.fn() }));
vi.mock('../../modules/supabase/classroomMembership.js', () => ({ getClassroomMembershipLevel: mockLevel }));
vi.mock('../../modules/classroomGameManager.js', () => ({
  setClassroomGamePlacedVocabulary: vi.fn(),
  saveClassroomTeams: vi.fn().mockResolvedValue(undefined),
}));

import { buildClassroomStartExtras } from '../gameStartRound';
import { clearClassroomLevelCache, getClassroomLevelCached } from '../../modules/classroomLevelCache';
import type { ClassroomGame } from '../../modules/classroomGameManager.js';
import type { ClassroomTeam } from '@/shared/utils/teamBattle';

const LEVELS: Record<string, 'support' | 'core' | 'challenge'> = {
  ua: 'challenge', ub: 'challenge', uc: 'support', ud: 'support',
};

describe('buildClassroomStartExtras team deal', () => {
  beforeEach(async () => {
    clearClassroomLevelCache();
    mockLevel.mockImplementation(async (userId: string) => LEVELS[userId]);
    for (const userId of Object.keys(LEVELS)) await getClassroomLevelCached(userId, 'class-1');
    mockGetGame.mockReturnValue({
      users: {
        ana: { authUserId: 'ua' }, bo: { authUserId: 'ub' }, cy: { authUserId: 'uc' }, di: { authUserId: 'ud' },
      },
    });
  });

  it('splits the two strong readers across teams using the cached levels', () => {
    const classroomGame = {
      gameCode: 'ABC123',
      classroomId: 'class-1',
      settings: { playStyle: 'teams', teamCount: 2 },
    } as unknown as ClassroomGame;
    const extras = buildClassroomStartExtras('ABC123', classroomGame, ['ana', 'bo', 'cy', 'di']);
    const teams = (extras.classroom as { teams: ClassroomTeam[] }).teams;
    for (const team of teams) {
      expect(team.memberNames.filter((n) => n === 'ana' || n === 'bo')).toHaveLength(1);
    }
  });
});
