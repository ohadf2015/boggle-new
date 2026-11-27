import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

const nav = vi.hoisted(() => ({ pathname: '/en/education' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));
vi.mock('@/components/teacher/hq/EducationRouteLoading', () => ({
  EducationRouteLoading: () => <div data-testid="education-route-loading" />,
}));

import Loading from '../loading';

function renderAt(pathname: string) {
  nav.pathname = pathname;
  return render(<Loading />);
}

describe('education route loader', () => {
  it.each([
    '/en/education',
    '/he/education/',
    '/en/education/access',
    '/es/education/duels/abc123',
    '/ja/education/help/start-a-class',
    '/en/education/live',
    '/en/education/classroom-game',
  ])('Given a client navigation to sky page %s, Then the loader is already sky', (pathname) => {
    const { container, getByTestId } = renderAt(pathname);
    expect(getByTestId('education-route-loading')).toBeInTheDocument();
    expect(container.querySelector('[data-edu-theme="sky"]')).not.toBeNull();
  });

  it.each([
    '/en/education/esl-word-games',
    '/en/education/for-schools',
    '/en/education/lists/en/animals',
    '/en/education/miss-gap-assignment',
    '/en/education/helpful-word-games',
    '/en/education/classroom-addon/planner',
  ])('Given a navigation to dark article %s, Then the loader stays dark', (pathname) => {
    const { container, getByTestId } = renderAt(pathname);
    expect(getByTestId('education-route-loading')).toBeInTheDocument();
    expect(container.querySelector('[data-edu-theme]')).toBeNull();
  });
});
