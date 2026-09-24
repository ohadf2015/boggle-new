import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { knobs, resetKnobs } from './academyTestMocks';

/**
 * The student hub is the screen a class of thirty lands on. It is now the
 * Academy Map, and it still has to answer, in order:
 *
 *   1. Is my class playing RIGHT NOW?   → the ONE big button joins it
 *   2. What did my teacher give me?     → the lessons, as islands; the button plays the next one
 *   3. Everything else                  → one tap away in the dock, never a scroll
 *
 * Rewritten for the Academy Map (2026-09-23). The previous version pinned the
 * DOM ORDER of stacked zones (banner above lessons above XP). There are no
 * stacked zones now; the same intent is asserted as "the single primary action
 * is the live game when one is running, else the next lesson". The
 * never-route-to-/daily and greeting/class-name checks are unchanged in intent.
 */

import StudentPageClient from '../PageClient';

const lesson = (id: string, status = 'assigned') => ({
  lessonId: id,
  status,
  lesson: { id, name: `Week ${id}`, words: [{ word: 'a', level: 'core' }] },
});

beforeEach(() => resetKnobs());

describe('StudentPageClient — Academy Map puts the one thing that matters first', () => {
  it('does not mount the always-on welcome card that routed students out to /daily', async () => {
    const { container } = render(<StudentPageClient />);
    await waitFor(() => expect(screen.getByTestId('academy-hub')).toBeInTheDocument());
    expect(container.querySelector('[data-surface-type="welcome"]')).toBeNull();
    expect(container.querySelector('a[href*="/daily"]')).toBeNull();
  });

  it('makes "join the live game" THE button when the teacher is running one', async () => {
    knobs.lessons = [lesson('1')];
    knobs.activeGame = { gameCode: 'ABC123', teacherName: 'Ms. Rivera', lessonNames: ['Week 1'] };
    render(<StudentPageClient />);
    const cta = await screen.findByTestId('academy-cta');
    expect(cta).toHaveAttribute('data-kind', 'live');
    expect(cta).toHaveTextContent('Ms. Rivera');
  });

  it('otherwise plays the next lesson from the same button', async () => {
    knobs.lessons = [lesson('1', 'completed'), lesson('2')];
    render(<StudentPageClient />);
    const cta = await screen.findByTestId('academy-cta');
    expect(cta).toHaveAttribute('data-kind', 'next');
    expect(cta).toHaveTextContent('Week 2');
    cta.click();
    expect(knobs.push).toHaveBeenCalledWith('/en/student/lessons/2');
  });

  it('sends a student with no class to the join screen, never home', async () => {
    knobs.classroom = { classroomId: null, classroom: null, level: 'core' };
    render(<StudentPageClient />);
    const cta = await screen.findByTestId('academy-cta');
    expect(cta).toHaveAttribute('data-kind', 'join-class');
    cta.click();
    expect(knobs.push).toHaveBeenCalledWith('/en/student/join');
  });

  it('never flashes "join a classroom" while the classroom lookup is still running', async () => {
    knobs.classroom = { classroomId: null, classroom: null, level: 'core', isLoading: true } as never;
    render(<StudentPageClient />);
    await screen.findByTestId('academy-cta-pending');
    expect(screen.queryByTestId('academy-cta')).toBeNull();
    // No islands at all yet — any node drawn now could flip once lessons arrive.
    expect(document.querySelectorAll('[data-testid^="academy-node-"]')).toHaveLength(0);
  });

  it('with every lesson done, the one button reviews the missed words that are due', async () => {
    knobs.lessons = [lesson('1', 'completed')];
    knobs.reviewLessonId = '1';
    knobs.reviewCount = 5;
    render(<StudentPageClient />);
    const cta = await screen.findByTestId('academy-cta');
    expect(cta).toHaveAttribute('data-kind', 'review');
    // The recommended island is the one that pulses
    expect(screen.getByTestId('academy-node-review')).toHaveAttribute('data-recommended', 'true');
    cta.click();
    expect(knobs.push).toHaveBeenCalledWith('/en/student/review?lesson=1');
  });

  it('greets the student by name — the params must reach t()', async () => {
    render(<StudentPageClient />);
    await waitFor(() =>
      expect(screen.getByText('student.dashboard.greeting|{"name":"Maya"}')).toBeInTheDocument(),
    );
  });

  it('names the class the student is actually in, so the page is about their class', async () => {
    render(<StudentPageClient />);
    await waitFor(() => expect(screen.getByText('ELA (7th)')).toBeInTheDocument());
  });
});
