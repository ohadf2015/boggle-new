/**
 * Real-time duel combo bonus — server-side scoring.
 *
 * Words chained inside the combo window earn an ADDITIVE bonus on top of the
 * base dictionary score, and the accepted/rejected payloads carry the streak so
 * the client can render the meter without recomputing anything.
 */

import { vi, type Mock } from 'vitest';
import type { Namespace } from 'socket.io';
import type { DuelSocket } from '../types';
import { registerRealtimeHandlers, realtimeGames } from '../realtime';
import { getSupabase } from '@/backend/modules/supabase/client';
import { isDictionaryWord } from '@/backend/dictionary';
import { isWordOnBoardAsync } from '@/backend/modules/wordValidatorPool';
import { calculateWordScore } from '@/backend/modules/scoringEngine.types';
import { DUEL_COMBO_BONUS_STEP, DUEL_COMBO_WINDOW_MS } from '@/backend/modules/duelCombo';

vi.mock('@/backend/modules/supabase/client');
vi.mock('@/backend/modules/wordValidatorPool');
vi.mock('@/backend/dictionary');
vi.mock('@/backend/modules/scoringEngine.types');
vi.mock('@/backend/utils/logger');
vi.mock('@/backend/modules/educationXpManager');

const DUEL_ID = '550e8400-e29b-41d4-a716-446655440099';
const BASE_SCORE = 5;

describe('real-time duel combo bonus', () => {
  let mockSocket: Partial<DuelSocket>;
  let mockNamespace: Partial<Namespace>;
  let emitted: Array<{ event: string; data: any }>;

  function seedGame() {
    realtimeGames.set(DUEL_ID, {
      challengerId: 'user-1',
      opponentId: 'user-2',
      lessonId: 'lesson-1',
      boardState: [['C', 'A', 'T', 'S']],
      language: 'en',
      timeLimit: 180,
      startTime: new Date().toISOString(),
      challengerWords: [],
      opponentWords: [],
      challengerScore: 0,
      opponentScore: 0,
    } as any);
  }

  function getHandler() {
    registerRealtimeHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);
    return (mockSocket.on as Mock).mock.calls.find((c) => c[0] === 'duel:submit-word')?.[1];
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-11T12:00:00Z'));
    emitted = [];
    realtimeGames.clear();

    mockSocket = {
      data: { userId: 'user-1', displayName: 'P1', classroomIds: ['c-1'] },
      emit: vi.fn((event: string, data: any) => emitted.push({ event, data })),
      to: vi.fn().mockReturnValue({ emit: vi.fn() }),
      on: vi.fn(),
    } as any;

    mockNamespace = { to: vi.fn().mockReturnValue({ emit: vi.fn() }) } as any;

    vi.mocked(getSupabase).mockReturnValue({} as any);
    vi.mocked(isDictionaryWord).mockReturnValue(true);
    vi.mocked(isWordOnBoardAsync).mockResolvedValue(true);
    vi.mocked(calculateWordScore).mockReturnValue(BASE_SCORE);
  });

  afterEach(() => {
    vi.useRealTimers();
    realtimeGames.clear();
  });

  it('pays only the base score for the first word and reports a streak of 1', async () => {
    seedGame();
    const handler = getHandler();

    await handler({ duelId: DUEL_ID, word: 'cats' });

    const accepted = emitted.find((e) => e.event === 'duel:word-accepted');
    expect(accepted?.data.points).toBe(BASE_SCORE);
    expect(accepted?.data.comboStreak).toBe(1);
    expect(accepted?.data.comboBonus).toBe(0);
  });

  it('adds the combo bonus to the base score for a chained word', async () => {
    seedGame();
    const handler = getHandler();

    await handler({ duelId: DUEL_ID, word: 'cats' });
    await handler({ duelId: DUEL_ID, word: 'cast' });

    const accepted = emitted.filter((e) => e.event === 'duel:word-accepted');
    expect(accepted).toHaveLength(2);
    expect(accepted[1].data.comboStreak).toBe(2);
    expect(accepted[1].data.comboBonus).toBe(DUEL_COMBO_BONUS_STEP);
    expect(accepted[1].data.points).toBe(BASE_SCORE + DUEL_COMBO_BONUS_STEP);
    // additive, not multiplicative
    expect(accepted[1].data.totalScore).toBe(BASE_SCORE * 2 + DUEL_COMBO_BONUS_STEP);
  });

  it('drops back to a fresh streak when the combo window lapses', async () => {
    seedGame();
    const handler = getHandler();

    await handler({ duelId: DUEL_ID, word: 'cats' });
    vi.advanceTimersByTime(DUEL_COMBO_WINDOW_MS + 1_000);
    await handler({ duelId: DUEL_ID, word: 'cast' });

    const accepted = emitted.filter((e) => e.event === 'duel:word-accepted');
    expect(accepted[1].data.comboStreak).toBe(1);
    expect(accepted[1].data.comboBonus).toBe(0);
    expect(accepted[1].data.points).toBe(BASE_SCORE);
  });

  it('breaks the streak on a rejected word and says so in the payload', async () => {
    seedGame();
    const handler = getHandler();

    await handler({ duelId: DUEL_ID, word: 'cats' });
    vi.mocked(isDictionaryWord).mockReturnValue(false);
    await handler({ duelId: DUEL_ID, word: 'zzzz' });

    const rejected = emitted.find((e) => e.event === 'duel:word-rejected');
    expect(rejected?.data.comboStreak).toBe(0);

    vi.mocked(isDictionaryWord).mockReturnValue(true);
    await handler({ duelId: DUEL_ID, word: 'cast' });

    const accepted = emitted.filter((e) => e.event === 'duel:word-accepted');
    expect(accepted[1].data.comboStreak).toBe(1);
    expect(accepted[1].data.comboBonus).toBe(0);
  });

  it('keeps each player on their own streak', async () => {
    seedGame();
    const handler = getHandler();

    await handler({ duelId: DUEL_ID, word: 'cats' });
    await handler({ duelId: DUEL_ID, word: 'cast' });

    // switch identity to the opponent on the same in-memory game
    (mockSocket as any).data.userId = 'user-2';
    await handler({ duelId: DUEL_ID, word: 'cats' });

    const accepted = emitted.filter((e) => e.event === 'duel:word-accepted');
    expect(accepted[2].data.comboStreak).toBe(1);
    expect(accepted[2].data.comboBonus).toBe(0);
  });
});
