import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import { StudentInsightList } from '../StudentInsightList';
import type { StudentInsight } from '../classInsights';

const insight = (studentId: string, belowGoal: boolean): StudentInsight => ({
  studentId,
  attempts: 10,
  accuracy: belowGoal ? 40 : 90,
  belowGoal,
  trend: 'steady',
  missedWords: [],
  masteredCount: 1,
  stuckCount: 0,
});

describe('<StudentInsightList> avatars', () => {
  it('Given students on and below goal, Then each row shows the shared avatar for that student', () => {
    render(
      <StudentInsightList
        students={[insight('s1', true), insight('s2', false)]}
        names={{ s1: 'Ava', s2: 'Ben' }}
        goal={80}
        fallbackName="?"
      />,
    );
    const ids = screen.getAllByTestId('avatar-lite').map((el) => el.getAttribute('data-user-id'));
    expect(ids).toEqual(['s1', 's2']);
  });
});
