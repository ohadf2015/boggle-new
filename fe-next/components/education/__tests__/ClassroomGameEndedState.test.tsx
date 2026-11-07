import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

let mockClassroomId: string | null = 'class-1';
let mockClassroomLoading = false;
vi.mock('@/hooks/useStudentClassroom', () => ({
  useStudentClassroom: () => ({ classroomId: mockClassroomId, isLoading: mockClassroomLoading }),
}));
let mockLessons: unknown[] = [];
vi.mock('@/hooks/usePracticeLessons', () => ({
  usePracticeLessons: () => ({ lessons: mockLessons, isLoading: false, error: null, refresh: vi.fn() }),
}));
vi.mock('@/lib/education/telemetryCore', () => ({ safeCapture: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import { ClassroomGameEndedState } from '../ClassroomGameEndedState';

const base = { message: 'Your class game ended.', hubHref: '/en/student', onRetry: vi.fn() };

beforeEach(() => {
  mockClassroomId = 'class-1';
  mockClassroomLoading = false;
  mockLessons = [];
  base.onRetry.mockClear();
});

describe('<ClassroomGameEndedState>', () => {
  it('explains the game ended instead of a dead refusal', () => {
    render(<ClassroomGameEndedState {...base} roomCode="ABC123" />);
    expect(screen.getByRole('heading', { name: 'education.student.gameEnded.title' })).toBeInTheDocument();
    expect(screen.getByText('Your class game ended.')).toBeInTheDocument();
  });

  it('retries the same room (a teacher whose room dropped on a restart re-hosts it under the same code)', () => {
    render(<ClassroomGameEndedState {...base} roomCode="ABC123" />);
    fireEvent.click(screen.getByRole('button', { name: 'education.student.gameEnded.retry' }));
    expect(base.onRetry).toHaveBeenCalledWith('ABC123');
  });

  it('offers the class hub when the student has a class', () => {
    render(<ClassroomGameEndedState {...base} roomCode="ABC123" />);
    expect(screen.getByRole('link', { name: 'education.student.gameEnded.toClass' })).toHaveAttribute('href', '/en/student');
    expect(screen.queryByRole('link', { name: 'education.student.gameEnded.newCode' })).not.toBeInTheDocument();
  });

  it('offers a new code instead when the student has no class', () => {
    mockClassroomId = null;
    render(<ClassroomGameEndedState {...base} roomCode="ABC123" />);
    expect(screen.getByRole('link', { name: 'education.student.gameEnded.newCode' })).toHaveAttribute('href', '/en/join');
    expect(screen.queryByRole('link', { name: 'education.student.gameEnded.toClass' })).not.toBeInTheDocument();
  });

  it('hides retry when the room code is unknown', () => {
    render(<ClassroomGameEndedState {...base} roomCode="" />);
    expect(screen.queryByRole('button', { name: 'education.student.gameEnded.retry' })).not.toBeInTheDocument();
  });
});

describe('<ClassroomGameEndedState> — practice first, the retry last', () => {
  it("GIVEN an enrolled student THEN the loud action practises the class's latest list, the class hub comes next and retry stays quiet", () => {
    mockLessons = [{ id: 'L3', name: 'Week 9', classroom_id: 'class-1', words: [{ word: 'cat' }], assignment: null }];
    render(<ClassroomGameEndedState {...base} roomCode="ABC123" />);
    const practice = screen.getByTestId('dead-end-practice');
    expect(practice).toHaveAttribute('href', '/en/student/lessons/L3?mode=spelling');
    const hub = screen.getByTestId('ended-primary');
    expect(hub).toHaveTextContent('education.student.gameEnded.toClass');
    expect(hub.className).not.toMatch(/bg-neo-black/);
    const retry = screen.getByRole('button', { name: 'education.student.gameEnded.retry' });
    expect(practice.compareDocumentPosition(hub) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hub.compareDocumentPosition(retry) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('GIVEN a student without a class THEN practice opens the no-account starter round and a new code is the second action', () => {
    mockClassroomId = null;
    render(<ClassroomGameEndedState {...base} roomCode="ABC123" />);
    expect(screen.getByTestId('dead-end-practice')).toHaveAttribute('href', '/en/join/practice');
    expect(screen.getByTestId('ended-primary')).toHaveTextContent('education.student.gameEnded.newCode');
  });

  it('never shows a Pro prompt, price or upgrade link', () => {
    const { container } = render(<ClassroomGameEndedState {...base} roomCode="ABC123" />);
    expect(container.textContent).not.toMatch(/upgrade|\$|price/i);
    for (const a of screen.getAllByRole('link')) expect(a.getAttribute('href')).not.toMatch(/pricing|upgrade/);
  });
});
