import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentType } from 'react';

const push = vi.fn();
let locale = 'en';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), useParams: () => ({ locale }) }));
vi.mock('@/utils/sentry', () => ({ captureError: vi.fn() }));
vi.mock('@/translations/loadTranslation', () => ({ getCachedTranslation: () => undefined }));

import TeacherError from '@/app/[locale]/teacher/error';
import JoinError from '@/app/[locale]/join/error';
import ClassroomGameError from '@/app/[locale]/education/classroom-game/error';
import DuelsError from '@/app/[locale]/education/duels/error';
import { sectionHome } from '@/lib/navigation/sectionHome';

type Boundary = ComponentType<{ error: Error & { digest?: string }; reset: () => void }>;

const CASES: [string, Boundary, string, string, string][] = [
  ['teacher', TeacherError, '/he/teacher/curriculum', '/he/teacher', 'Back to your classes'],
  ['join', JoinError, '/es/join/AB12CD', '/es/join', 'Enter a class code'],
  ['classroom-game', ClassroomGameError, '/en/education/classroom-game', '/en/teacher', 'Back to your classes'],
  ['duels', DuelsError, '/sv/education/duels/d1', '/sv/student', 'Back to class'],
];

beforeEach(() => push.mockReset());
afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe.each(CASES)('%s error.tsx', (_, Boundary, path, target, label) => {
  it(`Given a crash at ${path}, When the viewer presses back, Then they go to ${target}`, () => {
    locale = path.split('/')[1];
    window.history.replaceState(null, '', path);
    render(<Boundary error={new Error('boom')} reset={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(push).toHaveBeenCalledWith(target);
  });

  it('matches the locale-level error and 404 fallback for the same path', () => {
    expect(sectionHome({ pathname: path })).toBe(target);
  });
});

describe('a crash on the hub page itself', () => {
  it('reloads the hub instead of pushing the URL it is already on', () => {
    locale = 'en';
    window.history.replaceState(null, '', '/en/teacher');
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, pathname: '/en/teacher', search: '', assign } });
    try {
      render(<TeacherError error={new Error('boom')} reset={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Back to your classes' }));
      expect(assign).toHaveBeenCalledWith('/en/teacher');
      expect(push).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original });
    }
  });
});
