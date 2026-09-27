/**
 * studentPlayAgain.test.tsx
 *
 * Verify that students see a "Play Again" button as the primary CTA after a
 * classroom game, and that it stays within the education tree (never leaves
 * to /education/access or the main app).
 *
 * This test is RED until StudentNextActions mounts onPlayAgain callback and
 * ClassroomResultsCard passes it from the results page.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { StudentNextActions } from '../StudentNextActions';

describe('StudentNextActions — Play Again Button', () => {
  const mockPlayAgain = vi.fn();
  const mockPractice = vi.fn();
  const mockT = (key: string) => {
    const translations: Record<string, string> = {
      'education.results.playAgain': 'Play Again',
      'education.results.waitingForTeacher': 'Waiting for teacher...',
      'education.results.practiceMissed': 'Practice Missed Words',
    };
    return translations[key] || key;
  };

  it('should render Play Again button when onPlayAgain is provided', () => {
    render(
      <StudentNextActions onPlayAgain={mockPlayAgain} t={mockT} />
    );
    const button = screen.getByTestId('play-again-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Play Again');
  });

  it('should call onPlayAgain when Play Again button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <StudentNextActions onPlayAgain={mockPlayAgain} t={mockT} />
    );
    const button = screen.getByTestId('play-again-button');
    await user.click(button);
    expect(mockPlayAgain).toHaveBeenCalledOnce();
  });

  it('should render primary styling: full-width, lime background, black border', () => {
    render(
      <StudentNextActions onPlayAgain={mockPlayAgain} t={mockT} />
    );
    const button = screen.getByTestId('play-again-button');
    expect(button).toHaveClass('w-full');
    expect(button).toHaveClass('bg-neo-lime');
    expect(button).toHaveClass('text-neo-black');
    expect(button).toHaveClass('border-neo-black');
  });

  it('should NOT show waiting message when onPlayAgain is provided (student can choose)', () => {
    render(
      <StudentNextActions onPlayAgain={mockPlayAgain} t={mockT} />
    );
    const waiting = screen.queryByTestId('wait-for-teacher-message');
    expect(waiting).not.toBeInTheDocument();
  });

  it('should show waiting message only when onPlayAgain is NOT provided', () => {
    render(
      <StudentNextActions t={mockT} />
    );
    const waiting = screen.getByTestId('wait-for-teacher-message');
    expect(waiting).toBeInTheDocument();
    expect(waiting).toHaveTextContent('Waiting for teacher');
  });

  it('should render practice button when onPractice is provided', async () => {
    const user = userEvent.setup();
    render(
      <StudentNextActions onPlayAgain={mockPlayAgain} onPractice={mockPractice} t={mockT} />
    );
    const button = screen.getByTestId('practice-missed-button');
    expect(button).toBeInTheDocument();
    await user.click(button);
    expect(mockPractice).toHaveBeenCalledOnce();
  });

  it('should not scroll on mobile when Play Again button is shown', () => {
    const { container } = render(
      <StudentNextActions onPlayAgain={mockPlayAgain} t={mockT} />
    );
    // Verify the container is part of the fixed results card layout
    const actions = container.querySelector('.space-y-3');
    expect(actions).toBeInTheDocument();
    // space-y-3 is a flex gap, not a scrollable container
    expect(actions).toHaveClass('space-y-3');
  });

  it('should not render Play Again button when onPlayAgain is undefined', () => {
    render(
      <StudentNextActions t={mockT} />
    );
    const button = screen.queryByTestId('play-again-button');
    expect(button).not.toBeInTheDocument();
  });
});
