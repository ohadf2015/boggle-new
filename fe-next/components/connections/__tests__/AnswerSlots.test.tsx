import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AnswerSlots from '../AnswerSlots';

describe('AnswerSlots', () => {
  it('renders exactly slotCount cells', () => {
    render(<AnswerSlots value="" slotCount={4} state="idle" dir="ltr" />);
    expect(screen.getAllByTestId('answer-slot')).toHaveLength(4);
  });

  it('fills typed letters in order and leaves the rest empty', () => {
    render(<AnswerSlots value="VI" slotCount={4} state="idle" dir="ltr" />);
    const cells = screen.getAllByTestId('answer-slot');
    expect(cells[0].textContent).toBe('V');
    expect(cells[1].textContent).toBe('I');
    expect(cells[2].textContent).toBe('');
    expect(cells[3].textContent).toBe('');
  });

  it('marks filled cells green on correct', () => {
    render(<AnswerSlots value="VINE" slotCount={4} state="correct" dir="ltr" />);
    for (const cell of screen.getAllByTestId('answer-slot')) {
      expect(cell.className).toContain('neo-lime');
    }
  });

  it('marks cells red on wrong', () => {
    render(<AnswerSlots value="WINE" slotCount={4} state="wrong" dir="ltr" />);
    for (const cell of screen.getAllByTestId('answer-slot')) {
      expect(cell.className).toContain('neo-red');
    }
  });

  it('exposes the typed value to assistive tech via aria-label on the group', () => {
    render(<AnswerSlots value="VI" slotCount={4} state="idle" dir="ltr" label="Your guess" />);
    expect(screen.getByRole('group', { name: 'Your guess' })).toBeTruthy();
  });

  it('respects rtl direction', () => {
    render(<AnswerSlots value="של" slotCount={3} state="idle" dir="rtl" />);
    expect(screen.getByRole('group').getAttribute('dir')).toBe('rtl');
  });
});
