import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const push = vi.fn();
const captureError = vi.fn();
let locale = 'en';
let cached: Record<string, unknown> | undefined;

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), useParams: () => ({ locale }) }));
vi.mock('@/utils/sentry', () => ({ captureError: (...a: unknown[]) => captureError(...a) }));
vi.mock('@/translations/loadTranslation', () => ({ getCachedTranslation: () => cached }));

import { EduRouteError, eduErrorExit } from '../EduRouteError';

function setUrl(path: string) {
  window.history.replaceState(null, '', path);
}

beforeEach(() => {
  locale = 'en';
  cached = undefined;
});
afterEach(() => {
  cleanup();
  push.mockReset();
  captureError.mockReset();
  setUrl('/');
});

describe('eduErrorExit', () => {
  it.each([
    ['live', '/he/education/live', '?room=AB12&host=1', 'he', '/he/teacher'],
    ['live', '/he/education/live', '?room=AB12', 'he', '/he/student'],
    ['live', '/en/multiplayer', '?classroom=true&host=true', 'en', '/en/teacher'],
    ['student', '/sv/student/lessons/7', '', 'sv', '/sv/student'],
  ] as const)('%s at %s%s goes to %s hub %s', (area, path, search, loc, expected) => {
    expect(eduErrorExit(area, loc, path, search)).toBe(expected);
  });

  it('never returns the game home, even off a classroom route', () => {
    expect(eduErrorExit('live', 'es', '/es/multiplayer', '')).toBe('/es/student');
  });
});

describe('<EduRouteError>', () => {
  it('Given no cached bundle, When it renders, Then every word is English and no key path leaks', () => {
    render(<EduRouteError error={new Error('boom')} reset={vi.fn()} boundary="edu-live" area="live" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('This screen hit a snag');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to class' })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\b(eduShell|common)\.[a-zA-Z]/);
  });

  it('Given a cached bundle, When it renders, Then it uses the locale strings', () => {
    locale = 'he';
    cached = { eduShell: { error: { title: 'משהו נתקע', body: 'נסו שוב', backToClass: 'חזרה לכיתה' } }, common: { retry: 'לנסות שוב' } };
    render(<EduRouteError error={new Error('boom')} reset={vi.fn()} boundary="edu-live" area="live" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('משהו נתקע');
    expect(screen.getByRole('button', { name: 'חזרה לכיתה' })).toBeInTheDocument();
  });

  it('When Try again is pressed, Then the boundary resets', () => {
    const reset = vi.fn();
    render(<EduRouteError error={new Error('boom')} reset={reset} boundary="edu-live" area="live" />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('Given the live host, When Back to class is pressed, Then the teacher lands on their hub', () => {
    setUrl('/en/education/live?room=AB12&host=1');
    render(<EduRouteError error={new Error('boom')} reset={vi.fn()} boundary="edu-live" area="live" />);
    fireEvent.click(screen.getByRole('button', { name: 'Back to class' }));
    expect(push).toHaveBeenCalledWith('/en/teacher');
  });

  it('Given a student page, When Back to class is pressed, Then the student lands on their hub', () => {
    setUrl('/en/student/achievements');
    render(<EduRouteError error={new Error('boom')} reset={vi.fn()} boundary="student" area="student" />);
    fireEvent.click(screen.getByRole('button', { name: 'Back to class' }));
    expect(push).toHaveBeenCalledWith('/en/student');
  });

  it('reports the crash once with its boundary name', () => {
    const error = Object.assign(new Error('boom'), { digest: 'd1' });
    render(<EduRouteError error={error} reset={vi.fn()} boundary="edu-live" area="live" />);
    expect(captureError).toHaveBeenCalledWith(error, { errorBoundary: { type: 'edu-live', digest: 'd1' } });
  });

  it('keeps both actions at least 44px tall and on neo tokens', () => {
    render(<EduRouteError error={new Error('boom')} reset={vi.fn()} boundary="edu-live" area="live" />);
    for (const button of screen.getAllByRole('button')) {
      expect(button.className).toMatch(/min-h-\[(4[4-9]|5\d)px\]/);
      expect(button.className).not.toMatch(/(^|\s)(border|bg|text)-(black|white|gray-\d+)(\s|$)/);
    }
  });
});
