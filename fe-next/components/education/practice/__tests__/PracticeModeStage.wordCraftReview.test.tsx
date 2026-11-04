import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

const dynamicProps = vi.fn();
vi.mock('next/dynamic', () => ({
  default: () => (props: Record<string, unknown>) => {
    dynamicProps(props);
    return null;
  },
}));
vi.mock('@/components/practice', () => ({}));

import PracticeModeStage from '../PracticeModeStage';

describe('PracticeModeStage → Word Craft review', () => {
  it('hands the signed-in student and lesson to Word Craft so missed words reach review', () => {
    render(
      <PracticeModeStage
        mode="solo_board"
        variant="wordcraft"
        focus={null}
        lessonName="Pets"
        language="en"
        words={[{ word: 'cat' }, { word: 'dog' }] as never}
        onFinish={vi.fn()}
        onBack={vi.fn()}
        xpSessionData={{ sessionXpEarned: 0, sessionMasteryMessage: null }}
        wordCraftReview={{ studentId: 'stu-1', lessonId: 'L1' }}
      />,
    );
    expect(dynamicProps).toHaveBeenCalledWith(
      expect.objectContaining({ words: ['cat', 'dog'], review: { studentId: 'stu-1', lessonId: 'L1' } }),
    );
  });
});
