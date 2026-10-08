import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';

const { mockUseAuth, mockPush, mockReplace } = vi.hoisted(() => ({ mockUseAuth: vi.fn(), mockPush: vi.fn(), mockReplace: vi.fn() }));

// usePathname is what EducationShell reads to decide whether this screen has
// tabs. A bare factory mock without it does not return undefined — vitest
// throws on the unknown export — so every partial mock of this module must
// name it.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }), usePathname: () => '/en/student' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: () => ({ classroomId: null }) }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div data-testid="loader" /> }));
// The hub itself is the Academy Map now; the guard only cares that it renders.
vi.mock('@/components/student/academy/AcademyHub', () => ({ AcademyHub: () => <div data-testid="hub" /> }));
vi.mock('@/lib/education/studentDisplayName', () => ({ resolveStudentDisplayName: () => 'Maya' }));
vi.mock('@/lib/supabase', () => ({ signOut: vi.fn() }));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: () => ({ children, ...p }: { children?: React.ReactNode; [k: string]: unknown }) => React.createElement('div', p, children as React.ReactNode) }),
}));

import StudentPageClient from '../PageClient';

describe('StudentPageClient — signed-out redirect does not trap browser Back', () => {
  beforeEach(() => vi.clearAllMocks());

  it('replaces /student with /student/join, so Back does not bounce between them', async () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false });
    render(<StudentPageClient />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/en/student/join'));
    expect(mockPush).not.toHaveBeenCalled();
  });
});
