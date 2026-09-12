/**
 * The student hub on a real screen, and what the shell made redundant.
 *
 * Two things changed the moment the hub started mounting `EducationShell`:
 *
 * 1. Navigation moved into the shell — bottom tabs on a phone, a sidebar from
 *    tablet up — and both carry Practice, Awards and Me. The page's own
 *    "My Profile / Achievements" link pair became a second copy of two tabs
 *    that are already on screen, which is exactly the duplicate-choice the
 *    decision-fatigue rule is about. It goes; the tabs stay. The guest
 *    "not you?" escape is NOT navigation and stays with it.
 *
 * 2. A 1440px window stopped being a stretched phone. Measured at 1440x900 the
 *    hub was one column of full-width cards with ~300px of dead margin either
 *    side, which the addendum calls a disqualifying gap. The lessons and the
 *    ways to play — the things a student acts on — take two thirds; their
 *    standing, which is a reward for work already done, takes the last third.
 *    Phone is untouched: the grid only exists from `lg`.
 *
 * Asserted on classes rather than on measured geometry because jsdom has no
 * layout engine — it computes no grid tracks, so a width assertion here would
 * pass whatever the markup said.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const { mockUseAuth, mockPush } = vi.hoisted(() => ({ mockUseAuth: vi.fn(), mockPush: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/en/student',
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/hooks/useStudentClassroom', () => ({
  useStudentClassroom: () => ({ classroomId: 'c1', classroom: { id: 'c1', name: 'ELA (7th)' } }),
}));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div data-testid="loader" /> }));
vi.mock('@/components/student/StudentHubPlayZone', () => ({
  StudentHubPlayZone: () => <div data-testid="play-zone" />,
}));
vi.mock('@/components/student/ClassroomGameBanner', () => ({
  ClassroomGameBanner: () => <div data-testid="live-banner" />,
}));
vi.mock('@/components/student/StudentHubProgressZone', () => ({
  StudentHubProgressZone: () => <div data-testid="progress-zone" />,
}));
vi.mock('@/components/student/StudentHubLearnZone', () => ({
  StudentHubLearnZone: () => <div data-testid="learn-zone" />,
}));
vi.mock('@/lib/education/studentDisplayName', () => ({ resolveStudentDisplayName: () => 'Maya' }));
vi.mock('@/lib/supabase', () => ({ signOut: vi.fn() }));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...p }: { children?: React.ReactNode; [k: string]: unknown }) =>
      React.createElement('div', p, children as React.ReactNode),
  }),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

import StudentPageClient from '../PageClient';

const asStudent = (extra: Record<string, unknown> = {}) =>
  mockUseAuth.mockReturnValue({
    user: { id: 's1', ...extra },
    profile: { id: 's1', user_role: null },
    loading: false,
  });

beforeEach(() => {
  vi.clearAllMocks();
  asStudent();
});

describe('StudentPageClient — the shell owns navigation now', () => {
  it('does not repeat the Me and Awards tabs as in-page links', async () => {
    const { container } = render(<StudentPageClient />);
    await waitFor(() => expect(screen.getByTestId('learn-zone')).toBeInTheDocument());

    // Scoped to the page's own content: the shell is real in this render and
    // its tabs legitimately link to both — that is the point. The duplicate
    // being asserted away is the pair the PAGE used to draw above its content.
    const content = container.querySelector('[data-testid="education-shell-scroll"]')!;
    expect(content.querySelector('a[href="/en/student/profile"]')).toBeNull();
    expect(content.querySelector('a[href="/en/student/achievements"]')).toBeNull();
    // …and the tabs really are still there, so this is a de-duplication and not
    // a student losing the way to their own profile.
    expect(screen.getByTestId('education-tab-me')).toBeInTheDocument();
    expect(screen.getByTestId('education-tab-achievements')).toBeInTheDocument();
  });

  it('keeps the guest "not you?" escape — that is a sign-out, not a tab', async () => {
    asStudent({ is_anonymous: true });
    render(<StudentPageClient />);
    await waitFor(() => expect(screen.getByText('student.notYou')).toBeInTheDocument());
  });
});

describe('StudentPageClient — a desktop window is not a tall phone', () => {
  it('uses the width in columns from lg, and stays one column below it', async () => {
    const { container } = render(<StudentPageClient />);
    await waitFor(() => expect(screen.getByTestId('learn-zone')).toBeInTheDocument());

    const grid = container.querySelector('[data-testid="student-hub-grid"]');
    expect(grid).not.toBeNull();
    expect(grid!.className).toContain('lg:grid');
    expect(grid!.className).toContain('lg:grid-cols-3');
    // No `grid` without the `lg:` prefix — the phone stays a plain stack.
    expect(grid!.className).not.toMatch(/(^|\s)grid(\s|$)/);
  });

  it('gives the two columns to what a student acts on and one to their standing', async () => {
    const { container } = render(<StudentPageClient />);
    await waitFor(() => expect(screen.getByTestId('learn-zone')).toBeInTheDocument());

    const main = container.querySelector('[data-testid="student-hub-main"]');
    const side = container.querySelector('[data-testid="student-hub-side"]');
    expect(main!.className).toContain('lg:col-span-2');
    expect(side!.className).toContain('lg:col-span-1');
    expect(main!.contains(screen.getByTestId('learn-zone'))).toBe(true);
    expect(side!.contains(screen.getByTestId('progress-zone'))).toBe(true);
  });
});
