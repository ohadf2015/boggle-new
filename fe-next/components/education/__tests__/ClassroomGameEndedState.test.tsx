import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

let mockClassroomId: string | null = 'class-1';
let mockClassroomLoading = false;
vi.mock('@/hooks/useStudentClassroom', () => ({
  useStudentClassroom: () => ({ classroomId: mockClassroomId, isLoading: mockClassroomLoading }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import { ClassroomGameEndedState } from '../ClassroomGameEndedState';

const base = { message: 'Your class game ended.', hubHref: '/en/student', onRetry: vi.fn() };

beforeEach(() => {
  mockClassroomId = 'class-1';
  mockClassroomLoading = false;
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

describe('<ClassroomGameEndedState> — a way on first, the retry second', () => {
  it('leads with the class hub as the loud action; retry is a quiet text button', () => {
    render(<ClassroomGameEndedState {...base} roomCode="ABC123" />);
    const primary = screen.getByTestId('ended-primary');
    expect(primary).toHaveTextContent('education.student.gameEnded.toClass');
    const retry = screen.getByRole('button', { name: 'education.student.gameEnded.retry' });
    expect(retry.className).not.toMatch(/bg-neo-black/);
    expect(primary.compareDocumentPosition(retry) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('makes a new code the loud action for a student without a class', () => {
    mockClassroomId = null;
    render(<ClassroomGameEndedState {...base} roomCode="ABC123" />);
    expect(screen.getByTestId('ended-primary')).toHaveTextContent('education.student.gameEnded.newCode');
  });
});
