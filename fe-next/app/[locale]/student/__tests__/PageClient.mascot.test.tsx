import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { knobs, resetKnobs } from './academyTestMocks';
import StudentPageClient from '../PageClient';

/**
 * ONE story: Lexi stands by the hero button and always agrees with it — a live
 * game makes her celebrate, a dying streak makes her panic, the plain next
 * lesson keeps her happy. The mascot is the emotional layer over the SAME
 * recommendation, never a second opinion.
 */

beforeEach(() => resetKnobs());

const L1 = { lessonId: 'L1', status: 'assigned', lesson: { id: 'L1', name: 'Week 1', words: [{ word: 'a', level: 'core' }] } };

describe('Academy mascot ↔ hero button', () => {
  it('given a next lesson, Lexi is happy about it', async () => {
    knobs.lessons = [L1] as never;
    render(<StudentPageClient />);
    await screen.findByTestId('academy-cta');
    expect(screen.getByTestId('academy-mascot-line')).toHaveTextContent('academy.student.mascotNext');
  });

  it('given a live game, Lexi celebrates with the button', async () => {
    knobs.lessons = [L1] as never;
    knobs.activeGame = { gameCode: 'ABC123', teacherName: 'Ms. R', lessonNames: [] };
    render(<StudentPageClient />);
    await screen.findByTestId('academy-cta');
    expect(screen.getByTestId('academy-mascot-line')).toHaveTextContent('academy.student.mascotLive');
  });

  it('given an at-risk streak, Lexi panics even with a lesson waiting', async () => {
    knobs.lessons = [L1] as never;
    knobs.streakAtRisk = true;
    render(<StudentPageClient />);
    await screen.findByTestId('academy-cta');
    expect(screen.getByTestId('academy-mascot-line')).toHaveTextContent('academy.student.mascotStreakRisk');
  });

  it('given nothing to do, Lexi never argues with the solo fallback', async () => {
    render(<StudentPageClient />);
    await screen.findByTestId('academy-cta');
    expect(screen.getByTestId('academy-mascot-line')).toHaveTextContent('academy.student.mascotSolo');
  });
});
