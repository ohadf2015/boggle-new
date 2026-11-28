import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/hooks/useStudentClassroom', () => ({
  useStudentClassroom: () => ({ classroomId: 'class-1', isLoading: false }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import { ClassroomGameEndedState } from '../ClassroomGameEndedState';

describe('<ClassroomGameEndedState> - One-tap restart for unrecoverable rooms', () => {
  it('renders one-tap restart button when onRestart is provided for a room', () => {
    const onRestart = vi.fn();
    const onRetry = vi.fn();

    render(
      <ClassroomGameEndedState
        roomCode="LOST404"
        message="Room could not be restored."
        hubHref="/en/student"
        onRetry={onRetry}
        onRestart={onRestart}
      />
    );

    const restartBtn = screen.getByTestId('ended-restart');
    expect(restartBtn).toBeInTheDocument();

    fireEvent.click(restartBtn);
    expect(onRestart).toHaveBeenCalledWith('LOST404');
  });

  it('does not render restart button when onRestart is not provided (e.g. for student view)', () => {
    render(
      <ClassroomGameEndedState
        roomCode="LOST404"
        message="Room could not be restored."
        hubHref="/en/student"
        onRetry={vi.fn()}
      />
    );

    expect(screen.queryByTestId('ended-restart')).not.toBeInTheDocument();
  });
});
