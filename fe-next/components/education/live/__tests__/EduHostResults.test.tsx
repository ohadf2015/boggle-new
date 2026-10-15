import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EduHostResults from '@/components/education/live/EduHostResults';
import type { ClassroomSummary } from '@/shared/types/classroom';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'he' }) }));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const summary = {
  teacherName: 'Ms Cohen', lessonNames: [], lessonIds: [], totalWords: 0, coverage: [], missedWords: [], classFoundCount: 0, masteryByPlayer: {},
} as unknown as ClassroomSummary;
const players = [
  { username: 'Noa', score: 30, wordsFoundCount: 6 },
  { username: 'Ido', score: 10, wordsFoundCount: 2 },
];

describe('EduHostResults', () => {
  it('given a finished round, when the projector shows results, then a podium and class stats appear', () => {
    render(<EduHostResults summary={summary} players={players} t={t} />);
    expect(screen.getAllByTestId('edu-podium-seat').map((el) => el.getAttribute('data-name'))).toEqual(['Noa', 'Ido']);
    expect(screen.getByTestId('edu-stat-students')).toHaveTextContent('2');
    expect(screen.getByTestId('edu-stat-words')).toHaveTextContent('8');
    expect(screen.getByTestId('edu-stat-avg')).toHaveTextContent('20');
  });

  it('given the teacher actions, when tapped, then play again, next mode and end game run and the report links to reports', () => {
    const onRematch = vi.fn();
    const onClose = vi.fn();
    const onExitRoom = vi.fn();
    render(<EduHostResults summary={summary} players={players} t={t} onRematch={onRematch} onClose={onClose} onExitRoom={onExitRoom} />);
    fireEvent.click(screen.getByTestId('edu-results-play-again'));
    fireEvent.click(screen.getByTestId('edu-results-next-mode'));
    fireEvent.click(screen.getByTestId('edu-results-end'));
    expect(onRematch).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onExitRoom).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('edu-results-report')).toHaveAttribute('href', '/he/teacher/reports');
  });

  it('given nobody scored, when results show, then a compact card says so with the stats and Play again first', () => {
    render(<EduHostResults summary={summary} players={[{ username: 'Noa', score: 0 }]} t={t} onRematch={vi.fn()} />);
    const card = screen.getByTestId('edu-results-empty');
    expect(card).toHaveTextContent('eduLiveRoom.hostResults.noScores');
    expect(card).toHaveTextContent('eduLiveRoom.hostResults.noScoresHint');
    expect(card).toContainElement(screen.getByTestId('edu-results-play-again'));
    expect(card).toContainElement(screen.getByTestId('edu-stat-students'));
    expect(screen.queryByTestId('edu-podium')).toBeNull();
  });

  it('given three scorers, when the podium shows, then the winner is crowned and seats keep rank order', () => {
    render(<EduHostResults summary={summary} players={[...players, { username: 'Maya', score: 20, wordsFoundCount: 3 }]} t={t} />);
    expect(screen.getAllByTestId('edu-podium-seat').map((el) => el.getAttribute('data-name'))).toEqual(['Noa', 'Maya', 'Ido']);
    expect(screen.getByTestId('edu-podium-crown')).toBeInTheDocument();
  });
});
