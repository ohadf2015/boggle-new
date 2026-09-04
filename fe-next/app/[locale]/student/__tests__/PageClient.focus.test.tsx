import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * The student hub is the screen a class of thirty lands on. What it must answer, in order:
 *
 *   1. Is my class playing RIGHT NOW?   → go there, nothing else matters
 *   2. What did my teacher give me?     → the lesson words
 *   3. Everything else                  → below the fold
 *
 * It used to answer none of those first. The top of the page was a permanently-mounted
 * gradient "welcome" card (`isNewJoin` was hardcoded `true`, so it never went away) whose
 * only button routed to `/daily` — OUT of the classroom. Below it came a Play zone, then an
 * XP/streak/rank hero, and only then, seventh, the teacher's actual lesson.
 *
 * These tests pin the order and the absence of the interruptions.
 */

const { mockUseAuth, mockPush } = vi.hoisted(() => ({ mockUseAuth: vi.fn(), mockPush: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    // Echo the params so a call that passes them in the WRONG argument position is
    // visible. `t` is `t(path, fallbackOrParams?, paramsWhenFallback?)` and type-sniffs
    // arg 2, so `t(k, undefined, params)` and `t(k, params)` both work — but a plain
    // `t: (k) => k` mock returns the key either way and proves nothing.
    t: (k: string, a?: unknown, b?: unknown) => {
      const params = (a && typeof a === 'object' ? a : b) as Record<string, unknown> | undefined;
      return params ? `${k}|${JSON.stringify(params)}` : k;
    },
    language: 'en',
  }),
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
  m: new Proxy({}, { get: () => ({ children, ...p }: { children?: React.ReactNode; [k: string]: unknown }) => React.createElement('div', p, children as React.ReactNode) }),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

import StudentPageClient from '../PageClient';

const asStudent = () =>
  mockUseAuth.mockReturnValue({
    user: { id: 's1' },
    profile: { id: 's1', user_role: null },
    loading: false,
  });

beforeEach(() => {
  vi.clearAllMocks();
  asStudent();
});

describe('StudentPageClient — focused on what the teacher gave them', () => {
  it('does not mount the always-on welcome card that routed students out to /daily', async () => {
    const { container } = render(<StudentPageClient />);
    await waitFor(() => expect(screen.getByTestId('learn-zone')).toBeInTheDocument());
    expect(container.querySelector('[data-surface-type="welcome"]')).toBeNull();
  });

  it("puts the teacher's material above the XP/streak block", async () => {
    const { container } = render(<StudentPageClient />);
    await waitFor(() => expect(screen.getByTestId('learn-zone')).toBeInTheDocument());

    const learn = screen.getByTestId('learn-zone');
    const progress = screen.getByTestId('progress-zone');
    // Node.compareDocumentPosition: FOLLOWING means `progress` comes after `learn`.
    expect(learn.compareDocumentPosition(progress) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container).toBeTruthy();
  });

  it('puts "your class is playing right now" above everything else', async () => {
    render(<StudentPageClient />);
    await waitFor(() => expect(screen.getByTestId('live-banner')).toBeInTheDocument());
    const banner = screen.getByTestId('live-banner');
    const learn = screen.getByTestId('learn-zone');
    expect(banner.compareDocumentPosition(learn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('greets the student by name — the params must reach t()', async () => {
    render(<StudentPageClient />);
    await waitFor(() =>
      expect(
        screen.getByText('student.dashboard.greeting|{"name":"Maya"}')
      ).toBeInTheDocument()
    );
  });

  it('names the class the student is actually in, so the page is about their class', async () => {
    render(<StudentPageClient />);
    await waitFor(() => expect(screen.getByText('ELA (7th)')).toBeInTheDocument());
  });
});
