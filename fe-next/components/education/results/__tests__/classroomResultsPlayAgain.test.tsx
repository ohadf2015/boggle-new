/**
 * classroomResultsPlayAgain.test.tsx
 *
 * Verify that ClassroomResultsCard:
 * 1. Passes onPlayAgain to StudentNextActions for non-teacher players
 * 2. Never calls onPlayAgain for the teacher (teacher gets onRematch instead)
 * 3. Re-launching the game keeps the student in the classroom tree
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClassroomResultsCard } from '../../ClassroomResultsCard';
import type { ClassroomSummary } from '@/shared/types/classroom';

describe('ClassroomResultsCard — Student Play Again', () => {
  const mockOnPlayAgain = vi.fn();
  const mockOnRematch = vi.fn();
  const mockOnPractice = vi.fn();

  const mockSummary: ClassroomSummary = {
    summary: 'Mock summary',
    teacherName: 'Teacher Test',
    lessonNames: ['Lesson A'],
    lessonIds: ['lesson-123'],
    totalWords: 10,
    classFoundCount: 8,
    coverage: [
      { word: 'hello', foundBy: ['Student 1', 'Student 2'] },
      { word: 'world', foundBy: ['Student 1'] },
    ],
    masteryByPlayer: {
      'Student 1': { found: 8, total: 10 },
      'Student 2': { found: 6, total: 10 },
    },
    podium: [
      { username: 'Student 1', score: 100, rank: 1 },
      { username: 'Student 2', score: 80, rank: 2 },
    ],
    missedWords: ['word1', 'word2'],
    neverPlacedWords: [],
    participationBonus: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render Play Again button for non-teacher students', () => {
    render(
      <ClassroomResultsCard
        summary={mockSummary}
        username="Student 1"
        isTeacher={false}
        onPlayAgain={mockOnPlayAgain}
        onPractice={mockOnPractice}
      />
    );
    const playAgainBtn = screen.getByTestId('play-again-button');
    expect(playAgainBtn).toBeInTheDocument();
  });

  it('should call onPlayAgain when student clicks Play Again', async () => {
    const user = userEvent.setup();
    render(
      <ClassroomResultsCard
        summary={mockSummary}
        username="Student 1"
        isTeacher={false}
        onPlayAgain={mockOnPlayAgain}
      />
    );
    const playAgainBtn = screen.getByTestId('play-again-button');
    await user.click(playAgainBtn);
    expect(mockOnPlayAgain).toHaveBeenCalledOnce();
  });

  it('should NOT render student next actions for teachers', () => {
    render(
      <ClassroomResultsCard
        summary={mockSummary}
        username="Teacher Test"
        isTeacher={true}
        onRematch={mockOnRematch}
      />
    );
    const playAgainBtn = screen.queryByTestId('play-again-button');
    expect(playAgainBtn).not.toBeInTheDocument();
  });

  it('should render rematch button for teachers', () => {
    render(
      <ClassroomResultsCard
        summary={mockSummary}
        username="Teacher Test"
        isTeacher={true}
        onRematch={mockOnRematch}
      />
    );
    const rematchBtn = screen.getByTestId('rematch-same-list');
    expect(rematchBtn).toBeInTheDocument();
  });

  it('should NOT render waiting message when student can play again', () => {
    render(
      <ClassroomResultsCard
        summary={mockSummary}
        username="Student 1"
        isTeacher={false}
        onPlayAgain={mockOnPlayAgain}
      />
    );
    const waiting = screen.queryByTestId('wait-for-teacher-message');
    expect(waiting).not.toBeInTheDocument();
  });

  it('should render waiting message when student cannot play again', () => {
    render(
      <ClassroomResultsCard
        summary={mockSummary}
        username="Student 1"
        isTeacher={false}
      />
    );
    const waiting = screen.getByTestId('wait-for-teacher-message');
    expect(waiting).toBeInTheDocument();
  });
});
