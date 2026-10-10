import React, { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WheelHud from '../WheelHud';

const base = {
  t: (k: string) => k,
  practice: false,
  timeLeft: 75,
  duration: 120,
  showCombo: true,
  combo: 0,
  score: 0,
  wordsCount: 0,
  onEndPractice: vi.fn(),
};

describe('WheelHud', () => {
  it('given a running game, then the medal carries the score, the found count and the launch target', () => {
    const scoreRef = createRef<HTMLSpanElement>();
    render(<WheelHud {...base} score={96} wordsCount={2} scoreRef={scoreRef} />);
    const medal = screen.getByTestId('wheel-score');
    expect(medal.textContent).toContain('96');
    expect(medal.textContent).toContain('2');
    expect(scoreRef.current?.textContent).toBe('96');
    expect(screen.getByTestId('wheel-timer').textContent).toContain('1:15');
  });

  it('given a combo of two or more, then the flame badge rides the medal', () => {
    render(<WheelHud {...base} combo={3} scoreRef={createRef()} />);
    expect(screen.getByTestId('combo-slot').textContent).toContain('x3');
  });

  it('given practice, then there is no clock and the end-run button ends the run', () => {
    const onEndPractice = vi.fn();
    render(<WheelHud {...base} practice onEndPractice={onEndPractice} scoreRef={createRef()} />);
    expect(screen.queryByTestId('wheel-timer')).toBeNull();
    fireEvent.click(screen.getByText('practice.endRun'));
    expect(onEndPractice).toHaveBeenCalled();
  });
});
