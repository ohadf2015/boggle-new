import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const track = vi.hoisted(() => vi.fn());
vi.mock('../trackResultsAction', () => ({ trackResultsAction: track }));

import { StudentRoundPair, StudentWaitBar } from '../StudentRoundPair';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

describe('StudentRoundPair', () => {
  it('given a best word and a lesson tally, then exactly those two tiles show', () => {
    const { container } = render(<StudentRoundPair bestWord={{ word: 'voltage', score: 12 }} lesson={{ found: 3, total: 12 }} t={t} />);
    expect(screen.getByTestId('edu-student-best-word')).toHaveTextContent('voltage');
    expect(screen.getByTestId('edu-student-best-word')).toHaveTextContent('+12');
    expect(screen.getByTestId('edu-student-lesson')).toHaveTextContent('3/12');
    expect(container.querySelectorAll('[data-testid^="edu-student-"]')).toHaveLength(2);
  });

  it('given neither, then nothing renders', () => {
    const { container } = render(<StudentRoundPair bestWord={null} lesson={null} t={t} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('StudentWaitBar', () => {
  it('given no practice, then the slim wait bar is the one status and the one primary', () => {
    const { container } = render(<StudentWaitBar t={t} />);
    expect(screen.getByRole('status')).toHaveTextContent('education.results.waitingForTeacher');
    expect(container.querySelectorAll('[data-results-primary]')).toHaveLength(1);
    expect(screen.getByTestId('wait-for-teacher-message')).toHaveAttribute('data-results-primary');
  });

  it('given missed lesson words, then practice is the one primary and the wait bar stays a quiet status', () => {
    const onPractice = vi.fn();
    const { container } = render(<StudentWaitBar onPractice={onPractice} t={t} />);
    expect(container.querySelectorAll('[data-results-primary]')).toHaveLength(1);
    fireEvent.click(screen.getByTestId('practice-missed-button'));
    expect(onPractice).toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith('practice', 'student');
    expect(screen.getByTestId('wait-for-teacher-message')).not.toHaveAttribute('data-results-primary');
  });
});
