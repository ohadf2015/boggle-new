import { describe, it, expect } from 'vitest';
import { sampleClassroomSummary } from '../previewFixtures';
import { roundOutcome } from '../roundOutcome';

const kindOf = (variant: 'zero' | 'solo' | 'tie') => {
  const s = sampleClassroomSummary(variant);
  const players = Object.keys(s.masteryByPlayer).filter((n) => n !== s.teacherName).length;
  return roundOutcome((s.podium ?? []).filter((p) => p.username !== s.teacherName), players).kind;
};

describe('dev preview fixtures cover every honest outcome', () => {
  it('zero: everyone scored nothing and the teacher still sits in the payload', () => {
    const s = sampleClassroomSummary('zero');
    expect(s.classFoundCount).toBe(0);
    expect(s.podium?.some((p) => p.username === s.teacherName)).toBe(true);
    expect(kindOf('zero')).toBe('zero');
  });
  it('solo: one student scored', () => expect(kindOf('solo')).toBe('solo'));
  it('tie: two students share first', () => expect(kindOf('tie')).toBe('tie'));
});
