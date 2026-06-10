import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const { mockUseAuth, mockPush } = vi.hoisted(() => ({ mockUseAuth: vi.fn(), mockPush: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: () => ({ classroomId: null }) }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div data-testid="loader" /> }));
vi.mock('@/components/student/StudentHubPlayZone', () => ({ StudentHubPlayZone: () => null }));
vi.mock('@/components/student/StudentHubProgressZone', () => ({ StudentHubProgressZone: () => null }));
vi.mock('@/components/student/StudentHubLearnZone', () => ({ StudentHubLearnZone: () => <div data-testid="hub" /> }));
vi.mock('@/lib/education/studentDisplayName', () => ({ resolveStudentDisplayName: () => 'Maya' }));
vi.mock('@/lib/supabase', () => ({ signOut: vi.fn() }));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: () => ({ children, ...p }: { children?: React.ReactNode; [k: string]: unknown }) => React.createElement('div', p, children as React.ReactNode) }),
}));

import StudentPageClient from '../PageClient';

describe('StudentPageClient — guard race (fresh guest session)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does NOT redirect a signed-in student while the profile is still loading', async () => {
    // Fresh anonymous session: user present, profile not yet fetched, loading done.
    mockUseAuth.mockReturnValue({ user: { id: 'anon-1' }, profile: null, loading: false });
    render(<StudentPageClient />);

    await waitFor(() => expect(screen.getByTestId('loader')).toBeInTheDocument());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('redirects a truly logged-out visitor to home', async () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false });
    render(<StudentPageClient />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/en'));
  });

  it('renders the hub once the guest user + profile are both present', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'anon-1' }, profile: { id: 'anon-1', user_role: null }, loading: false });
    render(<StudentPageClient />);

    await waitFor(() => expect(screen.getByTestId('hub')).toBeInTheDocument());
    expect(mockPush).not.toHaveBeenCalled();
  });
});
