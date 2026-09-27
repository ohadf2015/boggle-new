/**
 * The banner must name the CLASSROOM first, the lesson second.
 *
 * Cross-classroom lesson reuse is the intended workflow — a teacher runs her
 * vocabulary across every period she teaches — so the game a student sees can
 * legitimately carry a lesson named after another class. That is exactly what
 * produced the "wrong classroom" report: Flow Check students saw "Week 3
 * Vocabulary", a lesson belonging to ELA Period 3, with nothing on screen
 * saying which class the game was actually for.
 *
 * Naming the classroom is what makes the reuse legible instead of alarming.
 * The name comes from the PAYLOAD — the server resolves it from the classroom
 * the game belongs to — not from a client-side lookup, so it cannot disagree
 * with the game it is labelling.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockT = vi.fn((key: string, params?: Record<string, string>) =>
  params ? `${key}:${JSON.stringify(params)}` : key
);

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en' }),
}));
vi.mock('socket.io-client', () => ({
  io: () => { throw new Error('ClassroomGameBanner opened its own socket'); },
}));

const mockUseActiveClassroomGame = vi.fn();
vi.mock('@/hooks/useActiveClassroomGame', () => ({
  useActiveClassroomGame: (...args: unknown[]) => mockUseActiveClassroomGame(...args),
}));
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => React.createElement('img', props as never),
}));
vi.mock('framer-motion', () => {
  const R = require('react');
  const MockDiv = R.forwardRef(function MockDiv(props: Record<string, unknown>, ref: unknown) {
    const { children, ...rest } = props as React.PropsWithChildren<Record<string, unknown>>;
    return R.createElement('div', { ...rest, ref }, children);
  });
  return { m: { div: MockDiv }, AnimatePresence: ({ children }: { children: React.ReactNode }) => children };
});

import { ClassroomGameBanner } from '../ClassroomGameBanner';

const PROPS = { classroomId: 'flow-check', userId: 'user-1', username: 'Sam' };

function renderWith(activeGame: unknown) {
  mockUseActiveClassroomGame.mockReturnValue({
    activeGame, isConnected: true, socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
    setActiveGame: vi.fn(), error: null,
  });
  return render(<ClassroomGameBanner {...PROPS} />);
}

describe('ClassroomGameBanner — the classroom is named, from the payload', () => {
  beforeEach(() => vi.clearAllMocks());

  it('labels the game with the classroom name the server sent, lesson second', () => {
    // GIVEN the exact live shape that caused the report: a Flow Check game
    // carrying a lesson that belongs to the teacher's other class
    renderWith({
      gameCode: 'R438D5',
      classroomId: 'flow-check',
      classroomName: 'Flow Check',
      teacherName: 'Ms Plant',
      lessonNames: ['Week 3 Vocabulary'],
    });

    // THEN the student is told which class this game is for, before the lesson
    expect(mockT).toHaveBeenCalledWith(
      'education.classroomGame.classroomLessonLabel',
      { classroom: 'Flow Check', lesson: 'Week 3 Vocabulary' }
    );
    expect(
      screen.getByText(/education\.classroomGame\.classroomLessonLabel/)
    ).toBeInTheDocument();
  });

  it('joins multiple lessons into the one label', () => {
    // GIVEN a game built from two lessons
    renderWith({
      gameCode: 'R438D5',
      classroomId: 'flow-check',
      classroomName: 'Flow Check',
      teacherName: 'Ms Plant',
      lessonNames: ['Week 3 Vocabulary', 'Roots Week'],
    });

    // THEN both are named, still under the one classroom
    expect(mockT).toHaveBeenCalledWith(
      'education.classroomGame.classroomLessonLabel',
      { classroom: 'Flow Check', lesson: 'Week 3 Vocabulary, Roots Week' }
    );
  });

  it('falls back to the lesson alone when the server sent no classroom name', () => {
    // GIVEN an older server, or a lookup that could not resolve the name
    renderWith({
      gameCode: 'R438D5',
      classroomId: 'flow-check',
      teacherName: 'Ms Plant',
      lessonNames: ['Week 3 Vocabulary'],
    });

    // THEN the lesson still shows. A missing name must not blank the banner
    // or render a label with a hole in it (recurring pitfall class 4).
    expect(mockT).not.toHaveBeenCalledWith(
      'education.classroomGame.classroomLessonLabel',
      expect.anything()
    );
    expect(screen.getByText('Week 3 Vocabulary')).toBeInTheDocument();
  });
});
