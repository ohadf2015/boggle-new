import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const pref = vi.hoisted(() => ({ reduced: false }));
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => pref.reduced }));

import { VocabQuizRevealBanner } from '../VocabQuizRevealBanner';

const t = (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const props = { answer: 'fragile', word: 'brittle', definition: 'easily broken', sweep: false, t };

type FakeAnimation = { pause: ReturnType<typeof vi.fn>; play: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> };
let animations: FakeAnimation[];
let animateSpy: ReturnType<typeof vi.fn>;
const original = Element.prototype.animate;

describe('VocabQuizRevealBanner next-question beat', () => {
  beforeEach(() => {
    pref.reduced = false;
    animations = [];
    animateSpy = vi.fn(() => {
      const a = { pause: vi.fn(), play: vi.fn(), cancel: vi.fn() };
      animations.push(a);
      return a as unknown as Animation;
    });
    Element.prototype.animate = animateSpy as unknown as typeof Element.prototype.animate;
  });

  afterEach(() => {
    Element.prototype.animate = original;
  });

  it('given a reveal beat, names the next word and drains over exactly that beat', () => {
    render(<VocabQuizRevealBanner {...props} correct nextInMs={3000} beatKey={2} />);
    expect(screen.getByTestId('vocab-quiz-next-beat')).toHaveTextContent('vocabQuiz.nextUp.label');
    expect(animateSpy).toHaveBeenCalledTimes(1);
    const [frames, options] = animateSpy.mock.calls[0];
    expect(frames).toEqual([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }]);
    expect(options).toMatchObject({ duration: 3000, fill: 'forwards' });
  });

  it('given the last question, promises final scores instead of a next word', () => {
    render(<VocabQuizRevealBanner {...props} correct={false} nextInMs={3000} beatKey={7} isLast />);
    expect(screen.getByTestId('vocab-quiz-next-beat')).toHaveTextContent('vocabQuiz.nextUp.finalScores');
  });

  it('given a teacher pause, freezes the drain and resumes it after', () => {
    const { rerender } = render(<VocabQuizRevealBanner {...props} correct nextInMs={3000} beatKey={2} />);
    rerender(<VocabQuizRevealBanner {...props} correct nextInMs={3000} beatKey={2} paused />);
    expect(animations[0].pause).toHaveBeenCalled();
    rerender(<VocabQuizRevealBanner {...props} correct nextInMs={3000} beatKey={2} />);
    expect(animations[0].play).toHaveBeenCalled();
    expect(animateSpy).toHaveBeenCalledTimes(1);
  });

  it('given reduced motion, shows the label with no running drain', () => {
    pref.reduced = true;
    render(<VocabQuizRevealBanner {...props} correct nextInMs={3000} beatKey={2} />);
    expect(screen.getByTestId('vocab-quiz-next-beat')).toHaveTextContent('vocabQuiz.nextUp.label');
    expect(animateSpy).not.toHaveBeenCalled();
  });

  it('given no beat length, draws no strip', () => {
    render(<VocabQuizRevealBanner {...props} correct />);
    expect(screen.queryByTestId('vocab-quiz-next-beat')).toBeNull();
  });
});
