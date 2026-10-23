import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const pref = vi.hoisted(() => ({ reduced: false }));
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => pref.reduced }));
vi.unmock('framer-motion');

import { VocabQuizRevealBanner } from '../VocabQuizRevealBanner';

const t = (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const props = { answer: 'fragile', word: 'brittle', definition: 'easily broken', sweep: false, t };

describe('VocabQuizRevealBanner as the answer sheet', () => {
  beforeEach(() => {
    pref.reduced = false;
  });

  it('rises from below like the motion-kit sheet', () => {
    render(<VocabQuizRevealBanner {...props} correct={false} />);
    expect(screen.getByTestId('vocab-quiz-verdict-sheet').style.transform).toMatch(/translateY\(100%\)/);
  });

  it('appears in place under reduced motion', () => {
    pref.reduced = true;
    render(<VocabQuizRevealBanner {...props} correct />);
    expect(screen.getByTestId('vocab-quiz-verdict-sheet').style.transform).not.toMatch(/100%/);
  });

  it('a miss names the right answer and teaches the word', () => {
    render(<VocabQuizRevealBanner {...props} correct={false} />);
    expect(screen.getByTestId('vocab-quiz-verdict')).toHaveTextContent('vocabQuiz.feedback.wrong:{"answer":"fragile"}');
    expect(screen.getByText('easily broken')).toBeInTheDocument();
    expect(screen.getByText('brittle')).toBeInTheDocument();
  });
});
