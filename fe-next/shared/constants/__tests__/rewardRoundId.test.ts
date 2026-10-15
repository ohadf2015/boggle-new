import { describe, it, expect } from 'vitest';
import { rewardRoundId } from '@/shared/constants/classroomEconomy';

describe('rewardRoundId', () => {
  it('given a saved session, when the chest is asked for, then it names that session like the server', () => {
    expect(rewardRoundId(77, 'AB12CD')).toBe('77');
  });

  it('given no saved session id, when the chest is asked for, then it falls back to the room code like the server', () => {
    expect(rewardRoundId(undefined, 'AB12CD')).toBe('AB12CD');
    expect(rewardRoundId(null, 'AB12CD')).toBe('AB12CD');
  });

  it('given no room, then there is nothing to ask', () => {
    expect(rewardRoundId(null, '')).toBeNull();
  });
});
