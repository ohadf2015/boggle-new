import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const { speakWord } = vi.hoisted(() => ({ speakWord: vi.fn(async () => true) }));
vi.mock('@/lib/speech/textToSpeech', () => ({ speakWord }));

import { StudentMissedWords } from '../StudentMissedWords';
import { myMissedWords } from '../missedWords';
import type { ClassroomSummary } from '@/shared/types/classroom';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);

const summary = (coverage: Array<[string, string[]]>, neverPlaced: string[] = []) =>
  ({
    coverage: coverage.map(([word, foundBy]) => ({ word, foundBy })),
    neverPlacedWords: neverPlaced,
  }) as unknown as ClassroomSummary;

describe('myMissedWords', () => {
  it('lists the lesson words this student did not find, at most five', () => {
    const s = summary([
      ['apple', ['Maya']],
      ['bread', []],
      ['cloud', ['Leo']],
      ['dream', []],
      ['earth', []],
      ['flame', []],
      ['grape', []],
    ]);
    expect(myMissedWords(s, 'Maya')).toEqual(['bread', 'cloud', 'dream', 'earth', 'flame']);
  });

  it('puts words that were really on the board ahead of ones the class never saw', () => {
    const s = summary([['ghost', []], ['house', []]], ['ghost']);
    expect(myMissedWords(s, 'Maya')).toEqual(['house', 'ghost']);
  });

  it('returns nothing without a summary', () => {
    expect(myMissedWords(null, 'Maya')).toEqual([]);
  });
});

describe('<StudentMissedWords>', () => {
  beforeEach(() => vi.clearAllMocks());

  it('When a word is tapped, Then it is read aloud in the game language', () => {
    render(<StudentMissedWords words={['bread', 'cloud']} language="en" t={t} />);
    fireEvent.click(screen.getByRole('button', { name: 'eduStudent.results.hear:{"word":"bread"}' }));
    expect(speakWord).toHaveBeenCalledWith('bread', 'en');
  });

  it('offers practice on those words when a lesson is known', () => {
    const onPractice = vi.fn();
    render(<StudentMissedWords words={['bread']} language="en" t={t} onPractice={onPractice} />);
    fireEvent.click(screen.getByRole('button', { name: /eduStudent.results.practiceThese/ }));
    expect(onPractice).toHaveBeenCalled();
  });

  it('celebrates a clean sweep instead of showing an empty card', () => {
    render(<StudentMissedWords words={[]} language="en" t={t} />);
    expect(screen.getByText('eduStudent.results.missedNone')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /practiceThese/ })).toBeNull();
  });
});
