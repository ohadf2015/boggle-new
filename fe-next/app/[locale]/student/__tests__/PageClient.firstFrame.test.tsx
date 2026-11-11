import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { knobs, resetKnobs } from './academyTestMocks';
import StudentPageClient from '../PageClient';

const lesson = (id: string, status = 'assigned', dueInHours: number | null = null) => ({
  lessonId: id,
  status,
  classroomId: 'c1',
  dueDate: dueInHours == null ? null : new Date(Date.now() + dueInHours * 3_600_000).toISOString(),
  assignment: { id: `a${id}`, classroom_id: 'c1' },
  lesson: { id, name: `Week ${id}`, words: [{ word: 'orbit', level: 'core' }] },
});

beforeEach(() => resetKnobs());

describe('student home first frame: one thing to do', () => {
  it('Given no class, Then the code entry is the screen and six characters take them in', async () => {
    knobs.classroom = { classroomId: null, classroom: null, level: 'core' };
    render(<StudentPageClient />);
    const panel = await screen.findByTestId('academy-no-class');
    expect(screen.queryByTestId('academy-cta')).toBeNull();
    expect(screen.queryByTestId('academy-top-row')).toBeNull();
    fireEvent.change(panel.querySelector('input')!, { target: { value: 'k7q2wm' } });
    expect(knobs.push).toHaveBeenCalledWith('/en/join/K7Q2WM');
  });

  it('Given no class, Then the HUD does not wear the Academy name as a class tag', async () => {
    knobs.classroom = { classroomId: null, classroom: null, level: 'core' };
    render(<StudentPageClient />);
    await screen.findByTestId('academy-no-class');
    expect(screen.queryByText('academy.student.title')).toBeNull();
  });

  it('Given a live game and homework due, Then joining is the only action on the first frame', async () => {
    knobs.lessons = [lesson('1', 'assigned', 5)];
    knobs.activeGame = { gameCode: 'ABC123', teacherName: 'Ms. Rivera', lessonNames: ['Week 1'] };
    render(<StudentPageClient />);
    expect(await screen.findByTestId('academy-cta')).toHaveAttribute('data-kind', 'live');
    expect(screen.queryByTestId('academy-top-row')).toBeNull();
    expect(screen.queryByTestId('assignment-due-card')).toBeNull();
  });

  it('Given homework due and no live game, Then the due card is a quiet row, not a second button', async () => {
    knobs.lessons = [lesson('1', 'assigned', 5)];
    render(<StudentPageClient />);
    const card = await screen.findByTestId('assignment-due-card');
    expect(card.querySelector('[data-testid="assignment-due-go"]')).not.toBeNull();
    expect(card.textContent).not.toContain('student.assignments.doIt');
  });

  it('Given every lesson done and the review count not read yet, Then no primary is drawn that the count could flip', async () => {
    knobs.lessons = [lesson('1', 'completed')];
    knobs.reviewLessonId = '1';
    knobs.reviewCount = 5;
    knobs.reviewSilent = true;
    render(<StudentPageClient />);
    await screen.findByTestId('academy-cta-pending');
    expect(screen.queryByTestId('academy-cta')).toBeNull();
  });
});
