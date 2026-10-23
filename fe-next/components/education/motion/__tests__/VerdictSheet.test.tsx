import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { motionPref } from './reducedMotion.mock';
import { VerdictSheet } from '../VerdictSheet';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

beforeEach(() => {
  motionPref.reduced = true;
});

describe('VerdictSheet', () => {
  it('a right answer opens the lime sheet with its points and fires the correct sound cue', () => {
    const onShow = vi.fn();
    render(<VerdictSheet correct answer="cat" points={120} t={t} onShow={onShow} />);
    const sheet = screen.getByTestId('edu-feedback-sheet');
    expect(sheet.className).toContain('bg-neo-lime');
    expect(screen.getByText('vocabQuiz.correctShort')).toBeTruthy();
    expect(screen.getByText('+120')).toBeTruthy();
    expect(onShow).toHaveBeenCalledWith('correct');
  });

  it('a wrong answer opens the red sheet naming the right answer', () => {
    const onShow = vi.fn();
    render(<VerdictSheet correct={false} answer="cat" t={t} onShow={onShow} />);
    expect(screen.getByTestId('edu-feedback-sheet').className).toContain('bg-neo-red');
    expect(screen.getByText('vocabQuiz.feedback.wrong:{"answer":"cat"}')).toBeTruthy();
    expect(onShow).toHaveBeenCalledWith('incorrect');
  });

  it('no answer in time is an incorrect sheet with the no-answer line', () => {
    render(<VerdictSheet correct={null} answer="cat" t={t} />);
    expect(screen.getByTestId('edu-feedback-sheet').className).toContain('bg-neo-red');
    expect(screen.getByText('vocabQuiz.feedback.noAnswer:{"answer":"cat"}')).toBeTruthy();
  });

  it('shows the streak line from two in a row', () => {
    render(<VerdictSheet correct answer="cat" streak={3} t={t} />);
    expect(screen.getByText('eg2Modes.feedback.streak:{"count":3}')).toBeTruthy();
  });
});
