import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useGameStore } from '@/hooks/gameState';
import { ingestLessonClaimsRound } from '@/components/education/live/useLessonClaims';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));

import { StudentWordBank } from '../StudentWordBank';

const race = {
  roundId: 4, total: 2, claimedCount: 1,
  slots: [
    { index: 0, first: 'S', length: 5, claim: { word: 'storm', username: 'Dana', avatar: null, teamId: null } },
    { index: 1, first: 'C', length: 4, claim: null },
  ],
};

describe('StudentWordBank in a Lesson Word Race', () => {
  beforeEach(() => {
    act(() => {
      useGameStore.setState({ letterGrid: [['A']], gameMode: 'blast', gameModeConfirmed: true, gameLanguage: 'en', foundWords: [] } as never);
      ingestLessonClaimsRound({ lessonClaims: race });
    });
  });

  it('Given a support student in a race round, When the round runs, Then they keep their full word bank sheet and the race never covers it', () => {
    render(<StudentWordBank level="support" words={['storm', 'cell']} me="Noa" />);
    expect(screen.getByTestId('student-word-bank')).toHaveTextContent('education.wordBank.title:{"count":2}');
    expect(screen.queryByTestId('lesson-target-strip')).not.toBeInTheDocument();
  });

  it.each(['core', 'challenge'] as const)('Given a %s student in a race round, When the round runs, Then no bottom sheet shows: the race lives in the round dock under the grid', (level) => {
    const { container } = render(<StudentWordBank level={level} words={['storm', 'cell']} me="Noa" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Given the watching teacher (no seat name passed), When the race runs, Then no phone strip shows for them', () => {
    render(<StudentWordBank level="core" words={[]} />);
    expect(screen.queryByTestId('lesson-target-strip')).not.toBeInTheDocument();
  });
});
