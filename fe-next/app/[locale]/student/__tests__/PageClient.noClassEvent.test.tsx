import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';

const { mockUseAuth, mockCapture, classroom } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockCapture: vi.fn(),
  classroom: { current: { classroomId: null as string | null, isLoading: true } },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/he/student' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'he' }) }));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: () => classroom.current }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div data-testid="loader" /> }));
vi.mock('@/components/student/academy/AcademyHub', () => ({ AcademyHub: () => <div data-testid="hub" /> }));
vi.mock('@/lib/education/studentDisplayName', () => ({ resolveStudentDisplayName: () => 'Maya' }));
vi.mock('@/lib/supabase', () => ({ signOut: vi.fn() }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: mockCapture } }));

import StudentPageClient from '../PageClient';

const signedIn = { user: { id: 's1' }, profile: { id: 's1', user_role: null }, loading: false };
const noClassCalls = () => mockCapture.mock.calls.filter(([e]) => e === 'student_no_classroom_prompt_viewed');

describe('StudentPageClient — student_no_classroom_prompt_viewed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(signedIn);
  });

  // Nov 9: every student who had just joined fired this while their class was
  // still loading, then saw the class a second later. The event said "no class"
  // for students who had one.
  it('does not fire while the class is still loading', async () => {
    classroom.current = { classroomId: null, isLoading: true };
    const { rerender } = render(<StudentPageClient />);
    await waitFor(() => expect(document.querySelector('[data-testid="hub"]')).not.toBeNull());
    classroom.current = { classroomId: 'c1', isLoading: false };
    rerender(<StudentPageClient />);
    expect(noClassCalls()).toHaveLength(0);
  });

  it('fires once the class read settles with no class', async () => {
    classroom.current = { classroomId: null, isLoading: false };
    render(<StudentPageClient />);
    await waitFor(() => expect(noClassCalls()).toHaveLength(1));
  });
});
